import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <main className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-12">
      <div className="absolute -top-20 right-0 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute -bottom-24 left-0 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />

      <section className="relative grid gap-10 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300/70">
            Smart Attendance
          </p>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
            Face-powered attendance for modern classrooms
          </h1>
          <p className="text-base text-slate-300/90">
            Register once, then mark attendance using a secure photo or camera. Teachers
            manage sessions, and students get instant feedback.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/teacher"
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-white/10 transition hover:shadow-white/20"
            >
              Enter Teacher Portal
            </Link>
            <Link
              to="/student"
              className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Enter Student Portal
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Fast check-in', value: '< 3s' },
              { label: 'Image privacy', value: 'Local / API' },
              { label: 'Live status', value: 'Present/Absent' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <p className="text-xs text-slate-300/70">{item.label}</p>
                <p className="text-lg font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-300/70">
              Choose a portal
            </p>
            <div className="space-y-3">
              <Link
                to="/teacher"
                className="block rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
              >
                <p className="text-lg font-semibold">Teacher Portal</p>
                <p className="text-sm text-slate-300/80">
                  Create classes, start attendance, and review reports.
                </p>
              </Link>
              <Link
                to="/student"
                className="block rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
              >
                <p className="text-lg font-semibold">Student Portal</p>
                <p className="text-sm text-slate-300/80">
                  Register your face and check in quickly.
                </p>
              </Link>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-300/80">Live Session Preview</p>
              <div className="mt-3 space-y-2">
                {['Ava Singh - Present', 'Noah Patel - Present', 'Classroom 7B - Active'].map(
                  (text) => (
                    <div key={text} className="flex items-center justify-between text-sm">
                      <span>{text}</span>
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
