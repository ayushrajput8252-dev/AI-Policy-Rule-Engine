import LiveInterviewPanel from "./LiveInterviewPanel";

export default function Hero({ onScheduleDemo }: { onScheduleDemo: () => void }) {
  return (
    <section
      id="screening-agent"
      className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-blue-50/60 to-white px-6 pb-20 pt-16"
    >
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-blue-600 sm:text-5xl">
          AI Interviews Built for Real Screening
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-500 sm:text-lg">
          Interview as a service, built for hiring teams that screen at scale. Automate
          evaluations, enable proctoring, and identify the best candidates faster.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#create"
            className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700"
          >
            Create AI Interview
          </a>
          <button
            onClick={onScheduleDemo}
            className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Schedule a Demo <span aria-hidden>›</span>
          </button>
        </div>
      </div>

      <LiveInterviewPanel />

      <p className="mx-auto mt-4 max-w-3xl text-center text-xs text-slate-400">
        This live demo runs entirely in your browser: your camera stream never leaves the
        page. Face detection and gaze tracking run locally via MediaPipe; nothing is
        uploaded or recorded.
      </p>
    </section>
  );
}
