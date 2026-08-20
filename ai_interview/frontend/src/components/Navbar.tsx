export default function Navbar({ onScheduleDemo }: { onScheduleDemo: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-blue-100/60 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-slate-800">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            S
          </span>
          <span className="text-base font-bold">SkillBrew AI</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-500 md:flex">
          <a href="#screening-agent" className="transition hover:text-slate-800">
            Screening Agent
          </a>
          <a href="#create" className="transition hover:text-slate-800">
            Create Interviews
          </a>
          <a href="#reports" className="transition hover:text-slate-800">
            Reports
          </a>
        </nav>
        <button
          onClick={onScheduleDemo}
          className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
        >
          Schedule a Demo
        </button>
      </div>
    </header>
  );
}
