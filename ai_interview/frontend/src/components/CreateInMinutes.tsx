const LEFT_FIELDS = ["Role / Title", "Seniority Level", "Tech Stack", "Duration"];
const RIGHT_FIELDS = ["Difficulty", "Question Bank", "Proctoring Rules", "Pass Threshold"];

function FieldSkeleton({ label }: { label?: string }) {
  return (
    <div className="h-10 rounded-lg border border-slate-100 bg-slate-50" aria-hidden={!label}>
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}

export default function CreateInMinutes() {
  return (
    <section id="create" className="bg-white px-6 py-20">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/60 px-8 py-8 text-left">
          <h2 className="text-2xl font-extrabold text-slate-800 sm:text-3xl">Create in Minutes</h2>
          <p className="mt-1 text-slate-500">Define role, skills, duration, and difficulty once.</p>
        </div>

        <div className="relative grid grid-cols-1 gap-6 px-8 py-10 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Fill Interview Details
            </p>
            <div className="space-y-3">
              {LEFT_FIELDS.map((f) => (
                <FieldSkeleton key={f} label={f} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Fill Interview Details
            </p>
            <div className="space-y-3">
              {RIGHT_FIELDS.map((f) => (
                <FieldSkeleton key={f} label={f} />
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_30px_-5px_rgba(37,99,235,0.35)] ring-1 ring-slate-100">
              Create Interview
            </div>
          </div>
        </div>

        <div className="flex justify-center border-t border-slate-100 bg-slate-50/60 px-8 py-6 md:hidden">
          <button className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200">
            Create Interview
          </button>
        </div>
      </div>
    </section>
  );
}
