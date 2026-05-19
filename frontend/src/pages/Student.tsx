import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentRegistration from "../components/StudentRegistration";
import StudentLogin from "../components/StudentLogin";
import { useAuthStore } from "../store/authStore";

type Mode = "register" | "login";



export default function Student() {
  const [mode, setMode] = useState<Mode>("register");
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    if (user.role === "student") {
      navigate("/student/dashboard", { replace: true });
      return;
    }

    if (user.role === "teacher") {
      navigate("/teacher/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  return (
    <main className="mx-auto w-full  max-w-3xl  px-5 pb-16 pt-10">
      <div className="grid gap-8 lg:grid-cols-1">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-300/70">
            Student Portal
          </p>
          <h1 className="text-2xl font-semibold">Register or login</h1>

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
                {value === "register" ? "Register" : "Login"}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4">
            {mode === "login" ? <StudentLogin /> : <StudentRegistration />}
          </div>
        </section>
      </div>
    </main>
  );
}
