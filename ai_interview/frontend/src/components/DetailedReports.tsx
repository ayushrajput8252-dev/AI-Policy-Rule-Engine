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

const MATCHING_SKILLS = ["React", "Node.js", "Vue.js"];
const MISSING_SKILLS = ["Angular", "Django", "Ruby", "Flask"];

export default function DetailedReports() {
  return (
    <section id="reports" className="bg-gradient-to-b from-white to-blue-50 px-6 py-20">
      <div className="mx-auto max-w-6xl text-center">
        <h2 className="text-2xl font-extrabold text-slate-800 sm:text-3xl">
          Detailed Interview Reports
        </h2>
        <p className="mt-1 text-slate-500">
          Performance, integrity, and skill insights presented in one place so you can act
          faster.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 text-left lg:grid-cols-[0.85fr_1fr_1fr]">
        {/* Candidate summary column */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                JD
              </div>
              <div>
                <p className="font-bold text-slate-800">Jane Doe</p>
                <p className="text-xs text-slate-400">ja***doe@example.com</p>
                <p className="text-xs text-slate-400">11/19/2024 · 02:24:34 PM</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Status" value="Completed" valueClass="text-green-600" />
            <StatCard label="Time Taken" value="29:45 min" />
            <StatCard label="Questions" value="13" />
            <StatCard label="Proctor Detection" value="20" valueClass="text-red-500" />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Resume
              </p>
              <span className="text-xs font-semibold text-blue-600">📄 View</span>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">Matching Skills</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {MATCHING_SKILLS.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600"
                >
                  ✓ {s}
                </span>
              ))}
              {MISSING_SKILLS.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-400 line-through"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <button className="w-full rounded-full bg-blue-50 py-3 text-sm font-semibold text-blue-600">
            Shortlisted
          </button>
        </div>

        {/* Key metrics column */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Key Metrics
          </p>
          <div className="mt-4 space-y-4">
            <Bar label="Average Grade" value={50} color={barColor(50)} />
            <Bar label="Accuracy Score" value={82} color={barColor(82)} />
            <Bar label="Clarity Score" value={65} color={barColor(65)} />
            <Bar label="English Proficiency Score" value={20} color={barColor(20)} />
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Skill Evaluation
          </p>
          <div className="mt-4 space-y-4">
            <Bar label="React" value={60} color={barColor(60)} />
            <Bar label="Node.js" value={82} color={barColor(82)} />
            <Bar label="Python" value={30} color={barColor(30)} />
            <Bar label="Angular" value={40} color={barColor(40)} />
          </div>
        </div>

        {/* AI summary column */}
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Key Point</p>
          <p className="mt-1 text-sm text-slate-600">
            The candidate should enhance clarity and relevance in their responses, providing
            more structured and relevant answers to complex technical questions.
          </p>

          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
            Interview Summary
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-600">
            <li>The candidate left the interview early after responding to 7 questions.</li>
            <li>Total interview duration was about 2 minutes.</li>
            <li>Responses were lacking in depth and clarity.</li>
            <li>Answers were mostly disjointed and did not directly address the questions asked.</li>
          </ul>

          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
            Strengths
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Strong React fundamentals. Communicated component architecture clearly and confidently.
          </p>

          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
            Areas for Improvement
          </p>
          <p className="mt-1 text-sm text-slate-600">
            TypeScript knowledge is shallow. Needs deeper understanding of generics and utility
            types.
          </p>

          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">
            Suggestion
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Good candidate for a frontend role. Recommend pairing with a strong TS mentor in
            onboarding.
          </p>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-bold text-slate-700 ${valueClass ?? ""}`}>{value}</p>
    </div>
  );
}
