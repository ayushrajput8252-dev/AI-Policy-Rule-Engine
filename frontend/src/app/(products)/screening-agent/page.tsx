"use client";

/* ═══════════════════════════════════════════════════════════════
   SCREENING AGENT — live, working demo.

   Unlike the Telephonic Agent and Hiring Automation pages (both
   explicitly simulated, fixed-data POCs — see comments there), this
   page is real end to end:
     - The candidate video is your actual front camera (getUserMedia).
     - Face-count / gaze / tab-switch proctoring runs a real MediaPipe
       model in-browser (see src/hooks/useProctoring.ts).
     - The interviewer's questions come from a live call to
       /api/v1/interview/turn, which asks Groq (Gemini fallback) for
       the next line based on the actual conversation so far — not a
       scripted transcript.
     - Your spoken answers are recorded, sent to /api/v1/transcribe
       (server-side faster-whisper), and really transcribed.
     - The interviewer's lines are really spoken back via /api/v1/tts.
   The "Create in Minutes" and report sections below the live demo
   are illustrative mockups (clearly labeled) — see the audit doc for
   the full breakdown of what's real vs. illustrative on this page.
   ═══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Sparkles, ShieldCheck, Video, Mic,
  Loader2, AlertTriangle, Volume2, Bot, FileText,
  Award, MessageSquare, Radio,
} from "lucide-react";
import { askAssistant } from "@/components/ai-assistant/AIAssistantWidget";
import { useProctoring, type FaceBox, type ProctoringState } from "@/hooks/useProctoring";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const INTERVIEWER_NAME = "Ayush";
const DEFAULT_ROLE = "Backend Engineer";
const MAX_TURNS = 4;

// Voice-activity detection tuning for the hands-free "just talk" mic — no
// record button, the candidate's own speech starts and stops the turn.
const VAD_SPEECH_RMS_THRESHOLD = 0.025; // normalized 0..1 RMS level counted as "speaking"
const VAD_SILENCE_STOP_MS = 1300; // stop this long after speech trails off
const VAD_NO_SPEECH_TIMEOUT_MS = 12000; // give up and re-prompt if nothing was ever said
const VAD_MAX_RECORD_MS = 45000; // hard safety cap regardless of VAD state

/**
 * One retry after a short backoff. Smooths over a transient network blip
 * (Wi-Fi drop, brief DNS hiccup) instead of failing the whole turn on the
 * first failed request — this is exactly the failure mode a flaky
 * connection produces (fetch throws, or the backend's own upstream calls
 * to Groq/Gemini/gTTS momentarily can't resolve DNS and 500).
 */
async function fetchWithRetry(input: string, init?: RequestInit, retries = 1): Promise<Response> {
  try {
    const res = await fetch(input, init);
    if (!res.ok && res.status >= 500 && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return fetchWithRetry(input, init, retries - 1);
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return fetchWithRetry(input, init, retries - 1);
    }
    throw err;
  }
}

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface TranscriptTurn {
  id: string;
  role: "interviewer" | "candidate";
  text: string;
}

type InterviewPhase =
  | "setup" | "starting" | "speaking" | "listening" | "recording"
  | "transcribing" | "thinking" | "evaluating" | "complete" | "error";

interface EvaluationResult {
  communication_score: number | null;
  relevance_score: number | null;
  confidence_score: number | null;
  summary: string;
  strengths: string;
  areas_for_improvement: string;
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

export default function ScreeningAgentPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 bg-white-grid relative selection:bg-blue-500/20">
      <nav className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-zinc-900 hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Platform</span>
          </Link>
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-zinc-900">Screening Agent</span>
          </div>
          <Link
            href="/telephonic-agent"
            className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 hover:bg-zinc-200 transition-colors hidden sm:inline-flex items-center gap-1.5"
          >
            Open Telephonic Agent <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      <HeroSection />
      <FeaturesSection />
      <CreateInMinutesSection />
      <ReportsSection />
      <ClosingCtaBanner />

      <footer className="border-t border-zinc-200 bg-white py-10">
        <div className="max-w-6xl mx-auto px-6 text-center text-[12px] text-zinc-500 font-mono">
          AgenticFlow AI · Screening Agent — the live interview above is real (camera, proctoring, Groq, transcription).
          Sections below the demo use illustrative sample data.
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HERO + LIVE INTERVIEW DEMO
   ═══════════════════════════════════════════════════════════ */

function HeroSection() {
  return (
    <section className="relative pt-20 pb-16 md:pt-28 overflow-hidden">
      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-blue-600 font-semibold px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 mb-6">
          <Sparkles className="w-3.5 h-3.5" /> Live, Proctored AI Interviews
        </span>

        <h1 className="text-[clamp(2rem,4.5vw,3.2rem)] font-extrabold tracking-tight leading-[1.1] mb-5">
          <span className="text-blue-600">Screening Agent</span> — AI Interviews Built for Real Screening.
        </h1>

        <p className="text-[16px] text-zinc-600 leading-relaxed max-w-xl mx-auto mb-8">
          {INTERVIEWER_NAME}, our AI interviewer, conducts adaptive first-round interviews, proctors the session
          live with BrewShield, and scores every candidate the moment the call ends.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-2">
          <a
            href="#live-demo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all"
          >
            Try the Live Demo <ArrowRight className="w-4 h-4" />
          </a>
          <button
            onClick={() => askAssistant("I'd like to book a demo of the Screening Agent AI interview product.")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold border border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-all"
          >
            Book a Demo
          </button>
        </div>
      </div>

      <div id="live-demo" className="max-w-6xl mx-auto px-4 sm:px-6 mt-14 relative z-10 scroll-mt-20">
        <LiveInterviewDemo />
      </div>
    </section>
  );
}

/* ── Live interview demo: real camera + real proctoring + real Groq voice loop ── */
function LiveInterviewDemo() {
  const { videoRef, state: proctoring, faceBoxes, start: startProctoring, stop: stopProctoring } = useProctoring();
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  const [roleTitle, setRoleTitle] = useState(DEFAULT_ROLE);
  const [jdText, setJdText] = useState("");
  const [phase, setPhase] = useState<InterviewPhase>("setup");
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Voice-activity detection state — no record button, speech itself drives it.
  const vadRafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const hasSpokenRef = useRef(false);
  const silenceSinceRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef(0);
  const [micLevel, setMicLevel] = useState(0);
  const [hasHeardSpeech, setHasHeardSpeech] = useState(false);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [transcript]);

  const stopVadLoop = useCallback(() => {
    if (vadRafRef.current !== null) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    hasSpokenRef.current = false;
    silenceSinceRef.current = null;
    setMicLevel(0);
    setHasHeardSpeech(false);
  }, []);

  /** Watches mic input level via Web Audio and auto-stops the recorder once
   * the candidate has spoken and then paused — or bails out on prolonged
   * silence / a hard duration cap so a broken mic can't hang the turn. */
  const startVadLoop = useCallback((stream: MediaStream) => {
    const AudioCtxCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxCtor) return; // no VAD available — VAD_MAX_RECORD_MS still caps the turn

    const ctx = new AudioCtxCtor();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);

    recordingStartedAtRef.current = Date.now();
    hasSpokenRef.current = false;
    silenceSinceRef.current = null;
    let lastUiUpdate = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const norm = (data[i] - 128) / 128;
        sumSquares += norm * norm;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      const now = Date.now();

      if (now - lastUiUpdate > 100) {
        lastUiUpdate = now;
        setMicLevel(Math.min(1, rms * 6));
      }

      if (rms > VAD_SPEECH_RMS_THRESHOLD) {
        if (!hasSpokenRef.current) {
          hasSpokenRef.current = true;
          setHasHeardSpeech(true);
        }
        silenceSinceRef.current = null;
      } else if (hasSpokenRef.current) {
        if (silenceSinceRef.current === null) silenceSinceRef.current = now;
        else if (now - silenceSinceRef.current > VAD_SILENCE_STOP_MS) {
          mediaRecorderRef.current?.stop();
          return;
        }
      } else if (now - recordingStartedAtRef.current > VAD_NO_SPEECH_TIMEOUT_MS) {
        mediaRecorderRef.current?.stop();
        return;
      }

      if (now - recordingStartedAtRef.current > VAD_MAX_RECORD_MS) {
        mediaRecorderRef.current?.stop();
        return;
      }

      vadRafRef.current = requestAnimationFrame(tick);
    };
    vadRafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    return () => {
      stopProctoring();
      stopVadLoop();
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioElRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTurn = useCallback((role: TranscriptTurn["role"], text: string) => {
    const turn: TranscriptTurn = { id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, text };
    setTranscript((prev) => [...prev, turn]);
    return turn;
  }, []);

  const speak = useCallback(async (text: string) => {
    setPhase("speaking");
    try {
      const res = await fetchWithRetry(`${API_URL}/api/v1/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: "en" }),
      });
      if (!res.ok) throw new Error("TTS request failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioElRef.current = audio;
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        // Playback can fail to ever fire 'ended' (bad/short audio, autoplay
        // quirks, no audio sink) — the question is already on screen as text,
        // so a stuck "speaking" phase forever would be worse than moving on.
        const safetyTimer = window.setTimeout(finish, 20000);
        audio.onended = () => {
          window.clearTimeout(safetyTimer);
          finish();
        };
        audio.onerror = () => {
          window.clearTimeout(safetyTimer);
          finish();
        };
        audio.play().catch(() => {
          window.clearTimeout(safetyTimer);
          finish();
        });
      });
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("TTS playback failed", err);
      // Voice synthesis is a nice-to-have, not a hard blocker — the question
      // is already on screen as text, so the interview can continue silently.
    }
  }, []);

  const fetchNextTurn = useCallback(
    async (history: TranscriptTurn[]) => {
      const res = await fetchWithRetry(`${API_URL}/api/v1/interview/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: history.map((t) => ({ role: t.role, text: t.text })),
          role_title: roleTitle || DEFAULT_ROLE,
          jd_text: jdText || null,
          max_turns: MAX_TURNS,
        }),
      });
      if (!res.ok) throw new Error(`Interview turn request failed (${res.status})`);
      return (await res.json()) as { question: string; is_final: boolean };
    },
    [roleTitle, jdText],
  );

  const runEvaluation = useCallback(
    async (history: TranscriptTurn[]) => {
      setPhase("evaluating");
      try {
        const res = await fetchWithRetry(`${API_URL}/api/v1/interview/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            history: history.map((t) => ({ role: t.role, text: t.text })),
            role_title: roleTitle || DEFAULT_ROLE,
          }),
        });
        if (!res.ok) throw new Error(`Evaluation request failed (${res.status})`);
        setEvaluation(await res.json());
      } catch (err) {
        console.error("Evaluation failed", err);
        setErrorMessage("Could not generate the final evaluation. The transcript above is still complete.");
      }
      setPhase("complete");
    },
    [roleTitle],
  );

  const startInterview = useCallback(async () => {
    setPhase("starting");
    setErrorMessage(null);
    setTranscript([]);
    setEvaluation(null);
    await startProctoring();
    try {
      const { question } = await fetchNextTurn([]);
      const turn = addTurn("interviewer", question);
      await speak(question);
      setPhase("listening");
      void turn;
    } catch (err) {
      console.error("Failed to start interview", err);
      setErrorMessage("Could not reach the interview agent. Check that the backend is running.");
      setPhase("error");
    }
  }, [startProctoring, fetchNextTurn, addTurn, speak]);

  /** Hands-free turn: opens the mic the instant we're "listening" and lets
   * voice-activity detection (startVadLoop) decide when the answer is done —
   * no record button, no manual stop. */
  const startAutoRecording = useCallback(async () => {
    if (phase !== "listening") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        stopVadLoop();
        setPhase("transcribing");
        try {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", blob, "answer.webm");
          const res = await fetchWithRetry(`${API_URL}/api/v1/transcribe`, { method: "POST", body: formData });
          if (!res.ok) throw new Error(`Transcription failed (${res.status})`);
          const data = await res.json();
          const candidateText: string = (data.transcript || "").trim();

          if (!candidateText) {
            setErrorMessage("Didn't catch that — listening again…");
            setPhase("listening");
            return;
          }

          const nextHistory = [...transcript, addTurn("candidate", candidateText)];
          setPhase("thinking");
          const { question, is_final } = await fetchNextTurn(nextHistory);
          const finalHistory = [...nextHistory, addTurn("interviewer", question)];
          await speak(question);

          if (is_final) {
            await runEvaluation(finalHistory);
          } else {
            setPhase("listening");
          }
        } catch (err) {
          console.error("Answer processing failed", err);
          setErrorMessage("Something went wrong processing that answer — listening again…");
          setPhase("listening");
        }
      };

      recorder.start();
      setPhase("recording");
      startVadLoop(stream);
    } catch (err) {
      console.error("Mic access failed", err);
      setErrorMessage("Microphone permission was denied. Allow mic access to answer.");
    }
  }, [phase, transcript, addTurn, fetchNextTurn, speak, runEvaluation, startVadLoop, stopVadLoop]);

  // Fires exactly once per genuine transition into "listening" (not on every
  // re-creation of startAutoRecording, e.g. when transcript changes) — same
  // ref-indirection pattern AIAssistantWidget uses for its askAssistant hook.
  const startAutoRecordingRef = useRef<() => void>(() => {});
  useEffect(() => {
    startAutoRecordingRef.current = startAutoRecording;
  });
  useEffect(() => {
    if (phase === "listening") startAutoRecordingRef.current();
  }, [phase]);

  const stopEverything = useCallback(() => {
    stopProctoring();
    stopVadLoop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null; // ending the session — don't process a trailing turn
      mediaRecorderRef.current.stop();
    }
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioElRef.current?.pause();
    setPhase("setup");
  }, [stopProctoring, stopVadLoop]);

  const isLive = proctoring.status === "live";
  const canEditSetup = phase === "setup";

  return (
    <div className="mx-auto w-full overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl">
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-zinc-100 flex-wrap gap-3">
        <div className="flex items-center gap-2 text-zinc-500">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">A</span>
          <span className="text-sm font-bold text-zinc-800">AgenticFlow AI · Screening Agent</span>
        </div>
        {canEditSetup ? (
          <button
            onClick={startInterview}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Start Interview
          </button>
        ) : (
          <button
            onClick={stopEverything}
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            End Session
          </button>
        )}
      </div>

      {canEditSetup && (
        <div className="grid sm:grid-cols-2 gap-4 p-4 sm:p-5 border-b border-zinc-100 bg-zinc-50/60">
          <label className="block">
            <span className="text-[11px] font-semibold text-zinc-500 mb-1 block">Role being screened for</span>
            <input
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder={DEFAULT_ROLE}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-zinc-500 mb-1 block">Job description (optional — makes questions role-specific)</span>
            <input
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste a JD snippet, or leave blank for a general screen"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white"
            />
          </label>
        </div>
      )}

      {errorMessage && (
        <div className="mx-4 sm:mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_1.1fr_0.85fr] p-4 sm:p-5">
        {/* Video column */}
        <div className="flex flex-col gap-4">
          <div ref={videoContainerRef} className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-zinc-900">
            <video ref={videoRef} muted playsInline className="h-full w-full object-cover [transform:scaleX(-1)]" />
            {proctoring.status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900/95 text-center text-amber-300 px-6">
                <AlertTriangle className="w-9 h-9 opacity-80" />
                <p className="text-xs max-w-[240px] font-medium">{proctoring.errorMessage}</p>
                <p className="text-[11px] text-zinc-400 max-w-[240px]">
                  BrewShield proctoring couldn&rsquo;t start, but the interview itself will continue normally below.
                </p>
              </div>
            )}
            {proctoring.status === "starting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900/90 text-center text-zinc-300 px-6">
                <Loader2 className="w-8 h-8 animate-spin opacity-70" />
                <p className="text-xs">Requesting camera access…</p>
              </div>
            )}
            {proctoring.status === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900/90 text-center text-zinc-300 px-6">
                <Video className="w-9 h-9 opacity-60" />
                <p className="text-xs max-w-[220px]">
                  Click &ldquo;Start Interview&rdquo; to turn on your camera — BrewShield proctoring runs live alongside it.
                </p>
              </div>
            )}
            {isLive && <FaceOverlayCanvas containerRef={videoContainerRef} boxes={faceBoxes} />}
            {isLive && (
              <span className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
              </span>
            )}
            {isLive && proctoring.activeAlert && (
              <div className="absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 animate-pulse rounded-lg bg-red-600/95 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg">
                ⚠ {proctoring.activeAlert}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-xs font-medium text-white">
              <span>You (candidate)</span>
            </div>
          </div>

          <InterviewerAvatarCard speaking={phase === "speaking"} />

          <MicStatusIndicator phase={phase} micLevel={micLevel} hasHeardSpeech={hasHeardSpeech} />
        </div>

        {/* Transcript column */}
        <div className="flex flex-col rounded-2xl border border-zinc-100 bg-white p-4 min-h-[420px]">
          <div className="flex items-center gap-2 mb-3 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
            <MessageSquare className="w-3.5 h-3.5" /> Live Transcript
          </div>
          <div className="flex-1 space-y-3 text-left text-sm overflow-y-auto max-h-[380px] pr-1">
            {transcript.length === 0 && phase === "setup" && (
              <p className="text-xs text-zinc-400">Your real conversation with {INTERVIEWER_NAME} will appear here once you start.</p>
            )}
            <AnimatePresence initial={false}>
              {transcript.map((turn) => (
                <motion.div
                  key={turn.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${turn.role === "candidate" ? "items-end" : "items-start"}`}
                >
                  <span className={`mb-1 text-[11px] font-semibold ${turn.role === "candidate" ? "text-orange-500" : "text-blue-500"}`}>
                    {turn.role === "candidate" ? "You" : INTERVIEWER_NAME}
                  </span>
                  <div
                    className={`max-w-[90%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                      turn.role === "candidate" ? "bg-orange-50 text-zinc-700" : "bg-blue-50 text-zinc-700"
                    }`}
                  >
                    {turn.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {(phase === "thinking" || phase === "transcribing" || phase === "starting") && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {phase === "transcribing" ? "Transcribing your answer…" : phase === "starting" ? "Connecting…" : `${INTERVIEWER_NAME} is thinking…`}
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {phase === "complete" && evaluation && <EvaluationCard evaluation={evaluation} />}
          {phase === "evaluating" && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-3">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scoring the interview…
            </div>
          )}
        </div>

        {/* Proctoring column */}
        <BrewShieldPanel state={proctoring} />
      </div>
    </div>
  );
}

function InterviewerAvatarCard({ speaking }: { speaking: boolean }) {
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-sky-500 p-5 flex items-center gap-4 shadow-lg shadow-blue-600/20 overflow-hidden">
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="relative w-14 h-14 shrink-0 rounded-full bg-white/95 border-4 border-white/40 flex items-center justify-center text-blue-700 font-extrabold text-xl shadow-lg">
        AS
        {speaking && <span className="absolute inset-0 rounded-full ring-4 ring-white/60 animate-ping" />}
      </div>
      <div className="relative min-w-0">
        <div className="text-white font-bold text-sm">{INTERVIEWER_NAME}</div>
        <div className="text-blue-100 text-[11px] font-mono">AI Interviewer · Screening Agent</div>
        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-mono text-white">
          {speaking ? (
            <>
              <Volume2 className="w-3 h-3" /> Speaking…
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Ready
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Hands-free mic status — no button, just live feedback for what the
 * automatic voice-activity detection is doing. */
function MicStatusIndicator({
  phase,
  micLevel,
  hasHeardSpeech,
}: {
  phase: InterviewPhase;
  micLevel: number;
  hasHeardSpeech: boolean;
}) {
  const active = phase === "listening" || phase === "recording";
  const recording = phase === "recording";

  let label = "Waiting…";
  if (active && !recording) label = "Getting your mic ready…";
  if (recording) {
    label = hasHeardSpeech
      ? "Recording — pause when you're done"
      : "Listening — start speaking whenever you're ready";
  }

  return (
    <div
      className={`flex items-center justify-center gap-2.5 rounded-2xl border py-3 text-sm font-bold transition-all ${
        recording
          ? "bg-red-50 border-red-200 text-red-700"
          : active
          ? "bg-blue-50 border-blue-200 text-blue-700"
          : "bg-zinc-50 border-zinc-200 text-zinc-400"
      }`}
    >
      {recording ? (
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </span>
      ) : (
        <Mic className="w-4 h-4 shrink-0" />
      )}
      <span>{label}</span>
      {recording && (
        <span className="flex items-end gap-0.5 h-4 shrink-0" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-red-400 transition-all duration-100"
              style={{ height: `${4 + Math.min(1, micLevel * (0.6 + i * 0.15)) * 12}px` }}
            />
          ))}
        </span>
      )}
    </div>
  );
}

function EvaluationCard({ evaluation }: { evaluation: EvaluationResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-4"
    >
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-600 mb-2">
        <Award className="w-3.5 h-3.5" /> Interview Complete — Live Evaluation
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <ScoreChip label="Communication" value={evaluation.communication_score} />
        <ScoreChip label="Relevance" value={evaluation.relevance_score} />
        <ScoreChip label="Confidence" value={evaluation.confidence_score} />
      </div>
      <p className="text-[12.5px] text-zinc-700 leading-relaxed">{evaluation.summary}</p>
      {evaluation.strengths && (
        <p className="text-[12px] text-zinc-600 mt-2"><span className="font-bold text-zinc-700">Strengths: </span>{evaluation.strengths}</p>
      )}
      {evaluation.areas_for_improvement && (
        <p className="text-[12px] text-zinc-600 mt-1"><span className="font-bold text-zinc-700">To improve: </span>{evaluation.areas_for_improvement}</p>
      )}
    </motion.div>
  );
}

function ScoreChip({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg bg-white border border-zinc-200 px-2 py-1.5 text-center">
      <div className="text-[10px] text-zinc-400">{label}</div>
      <div className="text-sm font-extrabold text-blue-700 font-mono">{value ?? "—"}{value !== null && "%"}</div>
    </div>
  );
}

/* ── BrewShield proctoring panel: live, real flags from useProctoring ── */
function BrewShieldPanel({ state }: { state: ProctoringState }) {
  const isLive = state.status === "live";
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-zinc-100 bg-white p-4 text-left">
        <h3 className="flex items-center gap-2 text-sm font-bold text-red-500">
          <ShieldCheck className="w-4 h-4" />
          BrewShield {isLive ? "Proctoring Live" : "Proctoring Idle"}
        </h3>
        <dl className="mt-3 space-y-2 text-xs text-zinc-500">
          <Row label="Flags raised" value={String(state.flags.length)} />
          <Row label="Faces in frame" value={String(state.faceCount)} />
          <Row label="Tab switches" value={String(state.tabSwitchCount)} />
          <Row label="Integrity Score" value={`${state.integrityScore}/100`} strong />
        </dl>
      </div>

      <div className="max-h-56 overflow-y-auto rounded-2xl border border-zinc-100 bg-white p-4 text-left">
        <h4 className="text-[11px] font-mono font-bold uppercase tracking-wide text-zinc-400">Live Activity Log</h4>
        {state.flags.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-400">
            {isLive ? "No issues detected yet. Try switching tabs or stepping out of frame." : "Start the interview to see live proctoring flags appear here."}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {state.flags.map((flag) => (
              <li key={flag.id} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-3 h-3 mt-0.5 text-red-500 shrink-0" />
                <span className="text-zinc-600">
                  {flag.message}
                  <span className="ml-1 text-zinc-400">{new Date(flag.timestamp).toLocaleTimeString()}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt>{label}</dt>
      <dd className={strong ? "text-sm font-bold text-zinc-700" : "font-medium text-zinc-600"}>{value}</dd>
    </div>
  );
}

/** Draws live bounding boxes for every detected face on top of the mirrored video. */
function FaceOverlayCanvas({
  containerRef,
  boxes,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  boxes: FaceBox[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const { clientWidth: w, clientHeight: h } = container;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    for (const box of boxes) {
      const drawX = (1 - box.x - box.width) * w;
      const drawY = box.y * h;
      ctx.strokeStyle = box.flagged ? "#ef4444" : "#22c55e";
      ctx.lineWidth = 2;
      ctx.strokeRect(drawX, drawY, box.width * w, box.height * h);
    }
  }, [boxes, containerRef]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

/* ═══════════════════════════════════════════════════════════
   FEATURES STRIP
   ═══════════════════════════════════════════════════════════ */

function FeaturesSection() {
  const features = [
    { title: "Adaptive questioning", desc: `${INTERVIEWER_NAME} follows up on what you actually say — driven live by Groq, not a fixed script.`, icon: Bot },
    { title: "BrewShield proctoring", desc: "Live multi-face, gaze, and tab-switch detection — running in your browser, nothing uploaded.", icon: ShieldCheck },
    { title: "Real voice, real transcription", desc: "Your spoken answers are transcribed server-side and really drive the next question.", icon: Mic },
    { title: "Instant scored evaluation", desc: "The moment the interview ends, get a communication / relevance / confidence read.", icon: Award },
  ];
  return (
    <section className="py-16 border-t border-zinc-200/80 bg-zinc-50/50">
      <div className="max-w-5xl mx-auto px-6 grid sm:grid-cols-2 md:grid-cols-4 gap-5">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="rounded-2xl bg-white border border-zinc-200 p-5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3">
                <Icon className="w-4 h-4" />
              </div>
              <h3 className="text-[14px] font-bold text-zinc-900 mb-1">{f.title}</h3>
              <p className="text-[12.5px] text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   CREATE IN MINUTES — illustrative mockup (matches reference design)
   ═══════════════════════════════════════════════════════════ */

function CreateInMinutesSection() {
  const leftFields = ["Role / Title", "Seniority Level", "Tech Stack", "Duration"];
  const rightFields = ["Difficulty", "Question Bank", "Proctoring Rules", "Pass Threshold"];
  return (
    <section className="py-20 border-t border-zinc-200/80 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="overflow-hidden rounded-3xl border border-zinc-200 shadow-sm">
          <div className="border-b border-zinc-100 bg-zinc-50/60 px-8 py-8 text-left">
            <h2 className="text-2xl font-extrabold text-zinc-900 sm:text-3xl">Create in Minutes</h2>
            <p className="mt-1 text-zinc-500">Define role, skills, duration, and difficulty once.</p>
          </div>
          <div className="relative grid grid-cols-1 gap-6 px-8 py-10 md:grid-cols-2">
            {[leftFields, rightFields].map((fields, i) => (
              <motion.div
                key={i}
                className="rounded-2xl border border-zinc-100 bg-white p-5 text-left shadow-sm"
                animate={{ y: i === 0 ? [0, -10, 0] : [0, 10, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Fill Interview Details</p>
                <div className="space-y-3">
                  {fields.map((f) => (
                    <div key={f} className="h-10 rounded-lg border border-zinc-100 bg-zinc-50 flex items-center px-3 text-xs text-zinc-400">
                      {f}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
            <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
              <div className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-[0_10px_30px_-5px_rgba(37,99,235,0.35)] ring-1 ring-zinc-100">
                Create Interview
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   REPORTS — illustrative sample output (matches reference design)
   ═══════════════════════════════════════════════════════════ */

function Bar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "#22c55e" : value >= 45 ? "#eab308" : "#ef4444";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-zinc-600">{label}</span>
        <span className="font-semibold text-zinc-700">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ReportsSection() {
  return (
    <section className="py-20 border-t border-zinc-200/80 bg-gradient-to-b from-white to-blue-50/40">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <IllustrativeBadge />
        <h2 className="text-2xl font-extrabold text-zinc-900 sm:text-3xl mt-4">Detailed Interview Reports</h2>
        <p className="mt-1 text-zinc-500">Performance, integrity, and skill insights presented in one place.</p>
      </div>

      <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 text-left lg:grid-cols-[0.85fr_1fr_1fr] px-6">
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">JD</div>
              <div>
                <p className="font-bold text-zinc-800">Sample Candidate</p>
                <p className="text-xs text-zinc-400">sample@example.com</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Status" value="Completed" valueClass="text-green-600" />
            <StatCard label="Time Taken" value="18:20 min" />
            <StatCard label="Questions" value="4" />
            <StatCard label="Proctor Flags" value="2" valueClass="text-red-500" />
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Matching Skills</p>
            <div className="flex flex-wrap gap-2">
              {["Python", "FastAPI", "Redis"].map((s) => (
                <span key={s} className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">✓ {s}</span>
              ))}
              {["Kubernetes", "GraphQL"].map((s) => (
                <span key={s} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-400 line-through">{s}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Key Metrics</p>
          <div className="mt-4 space-y-4">
            <Bar label="Communication" value={75} />
            <Bar label="Relevance" value={90} />
            <Bar label="Confidence" value={85} />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Key Point</p>
          <p className="mt-1 text-sm text-zinc-600">
            The candidate answered clearly and stayed on-topic, with room to go deeper on system-design tradeoffs.
          </p>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-zinc-500">Suggestion</p>
          <p className="mt-1 text-sm text-zinc-600">Good fit for the role — recommend a technical round follow-up.</p>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className={`mt-1 text-lg font-bold text-zinc-700 ${valueClass ?? ""}`}>{value}</p>
    </div>
  );
}

function IllustrativeBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-semibold px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200">
      <FileText className="w-3 h-3" /> Illustrative sample — not live data
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   CLOSING CTA
   ═══════════════════════════════════════════════════════════ */

function ClosingCtaBanner() {
  return (
    <section className="py-20 border-t border-zinc-200/80 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="relative rounded-[2rem] overflow-hidden p-10 sm:p-14 text-center bg-gradient-to-br from-blue-600 via-blue-600 to-sky-500 shadow-2xl shadow-blue-600/25">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white mx-auto mb-5">
              <Radio className="w-6 h-6" />
            </div>
            <h2 className="text-[clamp(1.5rem,3.5vw,2.1rem)] font-extrabold text-white tracking-tight mb-3">
              Run your first real screen right now
            </h2>
            <p className="text-blue-100 text-[15px] max-w-lg mx-auto mb-8">
              No setup — scroll up, click Start Interview, and talk to {INTERVIEWER_NAME}.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="#live-demo"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold bg-white text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
              >
                Try the Live Demo <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
