import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerTeacher } from "../utils/api";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from '../store/uiStore'

type TeacherState = {
  username: string;
  fullName: string;
  password: string;
};

type TeacherAction = {
  field: keyof TeacherState;
  value: string;
};

const initialTeacherState: TeacherState = {
  username: "",
  fullName: "",
  password: "",
};

const TEACHER_USERNAME_PATTERN = /^TCH-\d+$/;

function teacherReducer(
  state: TeacherState,
  action: TeacherAction,
): TeacherState {
  return { ...state, [action.field]: action.value };
}

const TeacherRegistration = () => {
  const [teacher, setTeacher] = React.useReducer(
    teacherReducer,
    initialTeacherState,
  );
  const navigate = useNavigate();
  const setTeacherAuth = useAuthStore((state) => state.setTeacherAuth);
  const [loading, setLoading] = useState(false);
  const setMessage = useUiStore((s) => s.setMessage)
  const setGlobalLoading = useUiStore((s) => s.setLoading)

  async function handleRegister() {
    if (!TEACHER_USERNAME_PATTERN.test(teacher.username.trim())) {
      setMessage("Teacher username must match TCH-<number>, for example TCH-001", 'error')
      return;
    }

    setLoading(true);
    setGlobalLoading(true)
    try {
      const data = await registerTeacher({
        username: teacher.username,
        fullName: teacher.fullName,
        password: teacher.password,
      });

      setTeacherAuth({
        username: data.username,
        fullName: data.full_name,
      });
      navigate("/teacher/dashboard", { replace: true });
      setMessage("Teacher registered successfully", 'success')
    } catch (err) {
      console.log(err);
      setMessage("Unable to register teacher", 'error')
    } finally {
      setLoading(false);
      setGlobalLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-300/70">
          Full name
        </label>
        <input
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
          placeholder="Teacher name"
          value={teacher.fullName}
          onChange={(event) =>
            setTeacher({ field: "fullName", value: event.target.value })
          }
        />
      </div>
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
          placeholder="Create a password"
          value={teacher.password}
          onChange={(event) =>
            setTeacher({ field: "password", value: event.target.value })
          }
        />
      </div>
      <button
        type="button"
        onClick={handleRegister}
        disabled={loading}
        className="rounded-xl bg-linear-to-r from-blue-400 to-cyan-300 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/20 disabled:opacity-70"
      >
        {loading ? "Creating..." : "Create Account"}
      </button>
    </div>
  );
};

export default TeacherRegistration;