function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-700">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="bar-fill h-full rounded-full"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function barColor(value: number) {
  if (value >= 70) return "#22c55e";
  if (value >= 45) return "#eab308";
  return "#ef4444";
}

export default function DescriptiveReports() {
  return (
    <section className="bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-extrabold text-slate-800 sm:text-3xl">
          Descriptive Interview Reports
        </h2>
        <p className="mt-1 text-slate-500">Skills, clarity, confidence, and accuracy analyzed.</p>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 p-5 text-left shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                JS
              </div>
              <div>
                <p className="font-bold text-slate-800">Jane</p>
                <p className="text-xs text-slate-400">ja***on@example.com</p>
                <p className="text-xs text-slate-400">11/19/2024 · 02:24:34 PM</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <Bar label="React" value={50} color={barColor(50)} />
              <Bar label="Node.js" value={87} color={barColor(87)} />
            </div>

            <div className="mt-6 flex gap-3">
              <button className="flex-1 rounded-xl bg-red-50 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-100">
                ✕ Reject
              </button>
              <button className="flex-1 rounded-xl bg-green-50 py-2.5 text-sm font-semibold text-green-600 transition hover:bg-green-100">
                ✓ Accept
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 p-5 text-left shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Key Metrics
            </p>
            <div className="mt-4 space-y-4">
              <Bar label="Overall Grade" value={50} color={barColor(50)} />
              <Bar label="Accuracy Score" value={82} color={barColor(82)} />
              <Bar label="Clarity Score" value={65} color={barColor(65)} />
              <Bar label="Skill Score" value={30} color={barColor(30)} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
