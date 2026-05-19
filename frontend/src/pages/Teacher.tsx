import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TeacherLogin from "../components/TeacherLogin";
import TeacherRegistration from "../components/TeacherRegistration";
import { useAuthStore } from "../store/authStore";

type Mode = "register" | "login";

export default function Teacher() {
  const [mode, setMode] = useState<Mode>("register");
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    if (user.role === "teacher") {
      navigate("/teacher/dashboard", { replace: true });
      return;
    }

    if (user.role === "student") {
      navigate("/student/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-300/70">
                Teacher Portal
              </p>
              <h1 className="text-2xl font-semibold">Access your dashboard</h1>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            {(["register", "login"] as Mode[]).map((value) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={`rounded-full px-4 py-1 text-sm ${
                  mode === value
                    ? "bg-white text-slate-900"
                    : "border border-white/15 text-white/80"
                }`}
              >
                {value === "register" ? "Create Account" : "Login"}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4">
            {mode === "register" ? <TeacherRegistration /> : <TeacherLogin />}
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6">
            <h2 className="text-lg font-semibold">Dashboard Features</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300/90">
              <li>Plan classes and register student rosters.</li>
              <li>Start and stop attendance sessions in real time.</li>
              <li>Review attendance reports instantly.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-sm uppercase tracking-[0.2em] text-slate-300/70">
              Quick Status
            </h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Active sessions</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total classes</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Students registered</span>
                <span className="font-semibold">0</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
