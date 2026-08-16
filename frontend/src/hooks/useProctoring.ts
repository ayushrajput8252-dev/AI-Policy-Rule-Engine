import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

/**
 * Client-side interview proctoring: face presence / multi-face detection,
 * gaze (looking-away) detection, and tab-switch / focus-loss detection.
 *
 * Deliberately the "fastest POC stack": one MediaPipe FaceLandmarker model
 * (loaded once, from CDN, run fully in-browser) gives us both face count
 * and iris landmarks for gaze in a single detectForVideo() call per frame.
 * Tab-switch detection is plain DOM events, not ML — highest signal for
 * the least effort.
 */

// Self-hosted under /public — the CDN/GCS equivalents (jsdelivr, storage.googleapis.com)
// throw "Failed to fetch" in the browser whenever a firewall, ad-blocker, or corporate
// proxy blocks third-party hosts, which took proctoring down entirely. Same-origin
// static assets remove that failure mode.
const WASM_BASE = "/mediapipe/wasm";
const MODEL_URL = "/mediapipe/models/face_landmarker.task";

const NO_FACE_GRACE_MS = 3000; // spec: flag "no face" only after >3s
const LOOKING_AWAY_GRACE_MS = 2500; // spec: flag "looking away" after >2-3s
const MULTI_FACE_DEBOUNCE_MS = 1500;
const RE_FLAG_INTERVAL_MS = 4000; // don't spam the same sustained flag every frame
const DETECT_FPS = 8;

export type FlagType = "no_face" | "multi_face" | "looking_away" | "tab_switch";

export interface ProctorFlag {
  id: string;
  type: FlagType;
  message: string;
  timestamp: number;
}

export type ProctoringStatus = "idle" | "starting" | "live" | "error";

export interface ProctoringState {
  status: ProctoringStatus;
  errorMessage: string | null;
  faceCount: number;
  isLookingAway: boolean;
  integrityScore: number;
  flags: ProctorFlag[];
  activeAlert: string | null;
  tabSwitchCount: number;
  elapsedMs: number;
}

const FLAG_PENALTY: Record<FlagType, number> = {
  no_face: 15,
  multi_face: 10,
  looking_away: 5,
  tab_switch: 5,
};

const FLAG_LABEL: Record<FlagType, string> = {
  no_face: "No face detected",
  multi_face: "Multiple faces detected",
  looking_away: "Candidate looking away",
  tab_switch: "Tab switched / window lost focus",
};

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

// MediaPipe's WASM runtime routes its own informational logs (e.g. "INFO:
// Created TensorFlow Lite XNNPACK delegate for CPU.") through console.error
// instead of console.info — harmless, but Next's dev overlay treats every
// console.error as a reportable error. Drop only lines that actually start
// with "INFO:"/"WARNING:" so real errors still surface normally.
let consolePatchedForMediapipe = false;
function silenceMediapipeInfoLogs() {
  if (consolePatchedForMediapipe || typeof window === "undefined") return;
  consolePatchedForMediapipe = true;
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && /^(INFO|WARNING):/.test(args[0])) return;
    originalError(...args);
  };
}

// The GPU delegate needs a real WebGL context (MediaPipe calls
// emscripten_webgl_create_context() internally), which fails in plenty of
// ordinary environments — VMs, remote desktop sessions, hardware
// acceleration disabled, headless/software-rendered browsers. Worse, when
// it fails, MediaPipe logs "StartGraph failed" via console.error but still
// *resolves* createFromOptions with a landmarker whose graph never actually
// started, so the crash surfaces later and deeper — inside detectForVideo()
// — instead of a catchable rejection at setup time. CPU (XNNPACK) doesn't
// need a GPU context at all and is plenty fast at this hook's 8fps/1-model
// detection rate, so use it unconditionally rather than probing for GPU.
function getLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    silenceMediapipeInfoLogs();
    landmarkerPromise = FilesetResolver.forVisionTasks(WASM_BASE).then((fileset) =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "VIDEO",
        numFaces: 5,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      }),
    );
  }
  return landmarkerPromise;
}

/** Landmark indices for the 478-point MediaPipe face mesh (iris included). */
const NOSE_TIP = 1;
const LEFT_IRIS = 468;
const RIGHT_IRIS = 473;
const LEFT_EYE_OUTER = 33;
const LEFT_EYE_INNER = 133;
const RIGHT_EYE_INNER = 362;
const RIGHT_EYE_OUTER = 263;
const FOREHEAD = 10;
const CHIN = 152;

/**
 * Simplified gaze/head-pose heuristic (intentionally simple, per spec):
 * compares the nose tip's horizontal position against the eye-corner span,
 * and its vertical position against forehead/chin, to approximate whether
 * the candidate is looking straight at the camera. This is a head-pose
 * proxy for gaze, not true eye-tracking, but is cheap and robust for a POC.
 */
function isLookingAwayFromLandmarks(
  landmarks: FaceLandmarkerResult["faceLandmarks"][number],
): boolean {
  const nose = landmarks[NOSE_TIP];
  const leftOuter = landmarks[LEFT_EYE_OUTER];
  const rightOuter = landmarks[RIGHT_EYE_OUTER];
  const forehead = landmarks[FOREHEAD];
  const chin = landmarks[CHIN];
  if (!nose || !leftOuter || !rightOuter || !forehead || !chin) return false;

  const faceWidth = Math.abs(rightOuter.x - leftOuter.x);
  const faceHeight = Math.abs(chin.y - forehead.y);
  if (faceWidth < 1e-4 || faceHeight < 1e-4) return false;

  const horizontalRatio = (nose.x - leftOuter.x) / faceWidth;
  const verticalRatio = (nose.y - forehead.y) / faceHeight;

  const horizontalOff = horizontalRatio < 0.35 || horizontalRatio > 0.65;
  const verticalOff = verticalRatio < 0.35 || verticalRatio > 0.75;
  return horizontalOff || verticalOff;
}

export interface FaceBox {
  x: number; // 0-1 normalized
  y: number;
  width: number;
  height: number;
  flagged: boolean;
}

export function useProctoring() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectAtRef = useRef(0);
  const noFaceSinceRef = useRef<number | null>(null);
  const lookingAwaySinceRef = useRef<number | null>(null);
  const lastMultiFaceFlagRef = useRef(0);
  const lastNoFaceFlagRef = useRef(0);
  const lastLookAwayFlagRef = useRef(0);
  const lastTabFlagRef = useRef(0);
  const startedAtRef = useRef<number>(0);
  const mountedRef = useRef(true);

  const [state, setState] = useState<ProctoringState>({
    status: "idle",
    errorMessage: null,
    faceCount: 0,
    isLookingAway: false,
    integrityScore: 100,
    flags: [],
    activeAlert: null,
    tabSwitchCount: 0,
    elapsedMs: 0,
  });
  const [faceBoxes, setFaceBoxes] = useState<FaceBox[]>([]);

  const pushFlag = useCallback((type: FlagType) => {
    setState((prev) => {
      const flag: ProctorFlag = {
        id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        message: FLAG_LABEL[type],
        timestamp: Date.now(),
      };
      return {
        ...prev,
        integrityScore: Math.max(0, prev.integrityScore - FLAG_PENALTY[type]),
        flags: [flag, ...prev.flags].slice(0, 30),
        activeAlert: flag.message,
      };
    });
    window.setTimeout(() => {
      if (!mountedRef.current) return;
      setState((prev) =>
        prev.activeAlert === FLAG_LABEL[type]
          ? { ...prev, activeAlert: null }
          : prev,
      );
    }, 2600);
  }, []);

  const detectLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    const now = performance.now();
    if (now - lastDetectAtRef.current < 1000 / DETECT_FPS) {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }
    lastDetectAtRef.current = now;

    getLandmarker()
      .then((landmarker) => {
        if (!videoRef.current) return;
        const result = landmarker.detectForVideo(video, now);
        const faces = result.faceLandmarks ?? [];
        const wallClock = Date.now();

        setState((prev) => ({ ...prev, faceCount: faces.length }));

        // ---- multi-face ----
        if (faces.length > 1) {
          if (wallClock - lastMultiFaceFlagRef.current > MULTI_FACE_DEBOUNCE_MS) {
            lastMultiFaceFlagRef.current = wallClock;
            pushFlag("multi_face");
          }
        }

        // ---- no face ----
        if (faces.length === 0) {
          if (noFaceSinceRef.current === null) noFaceSinceRef.current = wallClock;
          const sustainedFor = wallClock - noFaceSinceRef.current;
          if (
            sustainedFor > NO_FACE_GRACE_MS &&
            wallClock - lastNoFaceFlagRef.current > RE_FLAG_INTERVAL_MS
          ) {
            lastNoFaceFlagRef.current = wallClock;
            pushFlag("no_face");
          }
        } else {
          noFaceSinceRef.current = null;
        }

        // ---- gaze / looking away (only meaningful with exactly one face) ----
        let lookingAway = false;
        const boxes: FaceBox[] = faces.map((landmarks) => {
          let minX = 1, minY = 1, maxX = 0, maxY = 0;
          for (const p of landmarks) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
          }
          const away = faces.length === 1 && isLookingAwayFromLandmarks(landmarks);
          return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            flagged: faces.length > 1 || away,
          };
        });
        setFaceBoxes(boxes);

        if (faces.length === 1) {
          lookingAway = isLookingAwayFromLandmarks(faces[0]);
          if (lookingAway) {
            if (lookingAwaySinceRef.current === null) {
              lookingAwaySinceRef.current = wallClock;
            }
            const sustainedFor = wallClock - lookingAwaySinceRef.current;
            if (
              sustainedFor > LOOKING_AWAY_GRACE_MS &&
              wallClock - lastLookAwayFlagRef.current > RE_FLAG_INTERVAL_MS
            ) {
              lastLookAwayFlagRef.current = wallClock;
              pushFlag("looking_away");
            }
          } else {
            lookingAwaySinceRef.current = null;
          }
        } else {
          lookingAwaySinceRef.current = null;
        }

        setState((prev) => ({
          ...prev,
          isLookingAway: lookingAway,
          elapsedMs: startedAtRef.current ? wallClock - startedAtRef.current : 0,
        }));
        // Referencing LEFT_IRIS/RIGHT_IRIS/LEFT_EYE_INNER/RIGHT_EYE_INNER keeps
        // these named constants available for future finer-grained iris gaze
        // scoring without re-deriving indices.
        void LEFT_IRIS;
        void RIGHT_IRIS;
        void LEFT_EYE_INNER;
        void RIGHT_EYE_INNER;
      })
      .catch((err) => {
        console.error("Face landmark detection failed", err);
      });

    rafRef.current = requestAnimationFrame(detectLoop);
  }, [pushFlag]);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setState((prev) => ({ ...prev, status: "idle", activeAlert: null }));
  }, []);

  const start = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      status: "starting",
      errorMessage: null,
      flags: [],
      integrityScore: 100,
      tabSwitchCount: 0,
    }));
    if (!navigator.mediaDevices?.getUserMedia) {
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage:
          "Camera access isn't available in this browser context (it requires HTTPS or localhost).",
      }));
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
    } catch (err) {
      console.error("Failed to acquire camera", err);
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage:
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access to run live proctoring."
            : "Could not start the camera. Make sure no other app is using it.",
      }));
      return;
    }

    try {
      await getLandmarker();
    } catch (err) {
      console.error("Failed to load the face detection model", err);
      stream.getTracks().forEach((t) => t.stop());
      // Loading the model failed independently of the camera itself — most
      // likely the self-hosted WASM/model assets under /public are missing
      // or the dev server needs a restart to pick them up, so say so.
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage:
          "Could not load the face detection model. Check that /mediapipe assets are served and reload the page.",
      }));
      return;
    }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    startedAtRef.current = Date.now();
    noFaceSinceRef.current = null;
    lookingAwaySinceRef.current = null;
    setState((prev) => ({ ...prev, status: "live" }));
    rafRef.current = requestAnimationFrame(detectLoop);
  }, [detectLoop]);

  // Tab-switch / focus-loss detection — plain DOM events, active only while live.
  useEffect(() => {
    if (state.status !== "live") return;

    const flagTabSwitch = () => {
      const now = Date.now();
      if (now - lastTabFlagRef.current < 800) return; // dedupe blur+visibilitychange firing together
      lastTabFlagRef.current = now;
      setState((prev) => ({ ...prev, tabSwitchCount: prev.tabSwitchCount + 1 }));
      pushFlag("tab_switch");
    };

    const onVisibilityChange = () => {
      if (document.hidden) flagTabSwitch();
    };
    const onBlur = () => flagTabSwitch();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [state.status, pushFlag]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { videoRef, state, faceBoxes, start, stop };
}
