import { useEffect, useRef } from "react";
import aiInterviewer from "../assets/ai-interviewer.png";
import { useProctoring } from "../hooks/useProctoring";

function formatClock(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** Draws live bounding boxes for every detected face on top of the mirrored video. */
function FaceOverlayCanvas({
  containerRef,
  boxes,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  boxes: { x: number; y: number; width: number; height: number; flagged: boolean }[];
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
      // video is mirrored (scaleX(-1)) so flip x to keep boxes aligned with the visible face
      const drawX = (1 - box.x - box.width) * w;
      const drawY = box.y * h;
      const drawW = box.width * w;
      const drawH = box.height * h;
      ctx.strokeStyle = box.flagged ? "#ef4444" : "#22c55e";
      ctx.lineWidth = 2;
      ctx.strokeRect(drawX, drawY, drawW, drawH);
    }
  }, [boxes, containerRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

export default function LiveInterviewPanel() {
  const { videoRef, state, faceBoxes, start, stop } = useProctoring();
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const isLive = state.status === "live";

  return (
    <div className="mx-auto mt-14 w-full max-w-6xl overflow-hidden rounded-3xl border border-blue-100 bg-white/80 p-4 shadow-xl shadow-blue-100/50 backdrop-blur sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-500">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
            S
          </span>
          <span className="text-sm font-medium">SkillBrew AI</span>
        </div>
        {state.status === "idle" && (
          <button
            onClick={start}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Start Live Demo
          </button>
        )}
        {state.status === "starting" && (
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
            Requesting camera…
          </span>
        )}
        {isLive && (
          <button
            onClick={stop}
            className="rounded-full border border-red-200 bg-red-50 px-5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            Stop Demo
          </button>
        )}
      </div>

      {state.status === "error" && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1.1fr_0.9fr]">
        {/* Video column: real front camera (You) + static AI interviewer */}
        <div className="flex flex-col gap-4">
          <div
            ref={videoContainerRef}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-900"
          >
            <video
              ref={videoRef}
              muted
              playsInline
              className="h-full w-full object-cover [transform:scaleX(-1)]"
            />
            {!isLive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/90 text-center text-slate-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-10 w-10 opacity-60"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 10.5l4.72-2.36a.75.75 0 011.03.67v10.38a.75.75 0 01-1.03.67l-4.72-2.36M4.5 18.75h9a1.5 1.5 0 001.5-1.5v-9a1.5 1.5 0 00-1.5-1.5h-9a1.5 1.5 0 00-1.5 1.5v9a1.5 1.5 0 001.5 1.5z"
                  />
                </svg>
                <p className="max-w-[220px] text-xs">
                  Click "Start Live Demo" to turn on your camera and see real-time proctoring in action.
                </p>
              </div>
            )}
            {isLive && (
              <FaceOverlayCanvas containerRef={videoContainerRef} boxes={faceBoxes} />
            )}
            {isLive && (
              <span className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                LIVE
              </span>
            )}
            {isLive && (
              <span className="absolute right-3 top-3 rounded-md bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white">
                {formatClock(state.elapsedMs)}
              </span>
            )}
            {isLive && state.activeAlert && (
              <div className="absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 animate-pulse rounded-lg bg-red-600/95 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg">
                ⚠ {state.activeAlert}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-xs font-medium text-white">
              <span>You {isLive ? "(candidate)" : ""}</span>
              <span className="rounded-full bg-white/20 p-1">🔊</span>
            </div>
          </div>

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-900">
            <img
              src={aiInterviewer}
              alt="AI Interviewer avatar"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-xs font-medium text-white">
              <span className="flex items-center gap-1">✨ AI Interviewer • HR Coach</span>
              <span className="rounded-full bg-white/20 p-1">🔊</span>
            </div>
          </div>
        </div>

        {/* Chat transcript mock */}
        <div className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4">
          <div className="flex-1 space-y-3 text-left text-sm">
            <ChatBubble from="Hridesh AI" text="Let's start with an introduction, Anna." align="left" />
            <ChatBubble
              from="Anna"
              text="Hey, I'm Anna and I'm a Backend Developer at a company. I have 2 years of experience."
              align="right"
            />
            <ChatBubble
              from="Hridesh AI"
              text="Can you describe more about your past experience and projects?"
              align="left"
            />
            <div className="text-left text-xs italic text-slate-400">
              {isLive ? "Anna is speaking…" : "Anna: Speaking ●●●"}
            </div>
          </div>
          <div className="mt-4 h-24 rounded-xl border border-dashed border-slate-200" />
        </div>

        {/* Proctoring + score panel */}
        <ProctoringPanel state={state} />
      </div>
    </div>
  );
}

function ChatBubble({
  from,
  text,
  align,
}: {
  from: string;
  text: string;
  align: "left" | "right";
}) {
  const isRight = align === "right";
  return (
    <div className={`flex flex-col ${isRight ? "items-end" : "items-start"}`}>
      <span className={`mb-1 text-[11px] font-semibold ${isRight ? "text-orange-500" : "text-blue-500"}`}>
        {from}
      </span>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
          isRight ? "bg-orange-50 text-slate-700" : "bg-blue-50 text-slate-700"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function ProctoringPanel({ state }: { state: ReturnType<typeof useProctoring>["state"] }) {
  const isLive = state.status === "live";
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 text-left">
        <h3 className="flex items-center gap-2 text-sm font-bold text-red-500">
          <span className={`h-2 w-2 rounded-full ${isLive ? "animate-pulse bg-red-500" : "bg-slate-300"}`} />
          Proctoring {isLive ? "Enabled" : "Idle"}
        </h3>
        <dl className="mt-3 space-y-2 text-xs text-slate-500">
          <Row label="Cheating Flags" value={`${state.flags.length}/100`} />
          <Row label="Faces in frame" value={String(state.faceCount)} />
          <Row label="Tab switches" value={String(state.tabSwitchCount)} />
          <Row label="Integrity Score" value={`${state.integrityScore}/100`} strong />
        </dl>
      </div>

      <div className="max-h-52 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-4 text-left">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Live activity log
        </h4>
        {state.flags.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">
            {isLive
              ? "No issues detected yet. Try switching tabs or stepping out of frame."
              : "Start the demo to see live proctoring flags appear here."}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {state.flags.map((flag) => (
              <li key={flag.id} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 text-red-500">⚠</span>
                <span className="text-slate-600">
                  {flag.message}
                  <span className="ml-1 text-slate-400">
                    {new Date(flag.timestamp).toLocaleTimeString()}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 text-left">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Skill Match</span>
          <span className="text-sm font-bold text-blue-600">88%</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Communication</span>
          <span className="text-sm font-bold text-orange-500">Strong</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Confidence</span>
          <span className="text-sm font-bold text-blue-600">87%</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt>{label}</dt>
      <dd className={strong ? "text-sm font-bold text-slate-700" : "font-medium text-slate-600"}>
        {value}
      </dd>
    </div>
  );
}
