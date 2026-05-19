import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginTeacher } from "../utils/api";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from '../store/uiStore'

type TeacherState = {
  username: string;
  password: string;
};

type TeacherAction = {
  field: keyof TeacherState;
  value: string;
};

const initialTeacherState: TeacherState = {
  username: "",
  password: "",
};

const TEACHER_USERNAME_PATTERN = /^TCH-\d+$/;

function teacherReducer(
  state: TeacherState,
  action: TeacherAction,
): TeacherState {
  return { ...state, [action.field]: action.value };
}

const TeacherLogin = () => {
  const [teacher, setTeacher] = React.useReducer(
    teacherReducer,
    initialTeacherState,
  );
  const navigate = useNavigate();
  const setTeacherAuth = useAuthStore((state) => state.setTeacherAuth);
  const [loading, setLoading] = useState(false);
  const setMessage = useUiStore((s) => s.setMessage)
  const setGlobalLoading = useUiStore((s) => s.setLoading)

  async function handleLogin() {
    if (!TEACHER_USERNAME_PATTERN.test(teacher.username.trim())) {
      setMessage("Teacher username must match TCH-<number>, for example TCH-001", 'error')
      return;
    }

    setLoading(true)
    setGlobalLoading(true)
    try {
      const data = await loginTeacher({
        username: teacher.username,
        password: teacher.password,
      });

      setTeacherAuth({
        username: data.username,
        fullName: data.full_name,
      });
      navigate("/teacher/dashboard", { replace: true });
      setMessage("Teacher login successful", 'success')
    } catch (err) {
      console.log(err);
      setMessage("Unable to login teacher", 'error')
    } finally {
      setLoading(false);
      setGlobalLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-300/70">
          Username
        </label>
        <input
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
          placeholder="TCH-001"
          pattern="TCH-\\d+"
          title="Teacher username must match TCH-<number>, for example TCH-001"
          value={teacher.username}
          onChange={(event) =>
            setTeacher({ field: "username", value: event.target.value })
          }
        />
        <p className="mt-2 text-xs text-slate-400">Use the format <span className="font-medium text-slate-200">TCH-001</span>.</p>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-300/70">
          Password
        </label>
        <input
          type="password"
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
          placeholder="Enter your password"
          value={teacher.password}
          onChange={(event) =>
            setTeacher({ field: "password", value: event.target.value })
          }
        />
      </div>
      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        className="rounded-xl bg-linear-to-r from-blue-400 to-cyan-300 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/20 disabled:opacity-70"
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
};

export default TeacherLogin;