export default function Footer({ onScheduleDemo }: { onScheduleDemo: () => void }) {
  return (
    <footer className="border-t border-slate-100 bg-white px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2 text-slate-800">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            S
          </span>
          <span className="text-base font-bold">SkillBrew AI</span>
        </div>
        <p className="text-sm text-slate-400">
          Client-side proctoring demo — camera and detection run locally in your browser.
        </p>
        <button
          onClick={onScheduleDemo}
          className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Schedule a Demo
        </button>
      </div>
    </footer>
  );
}
