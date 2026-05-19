import React from "react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerStudent } from "../utils/api";
import { useAuthStore } from "../store/authStore";
import { useUiStore } from '../store/uiStore'
type StudentState = {
  studentId: string;
  fullName: string;
  password: string;
};

type StudentAction = {
  field: keyof StudentState;
  value: string;
};

const initialStudentState: StudentState = {
  studentId: "",
  fullName: "",
  password: "",
};

const STUDENT_ID_PATTERN = /^STD-\d+$/;

function studentReducer(
  state: StudentState,
  action: StudentAction,
): StudentState {
  return { ...state, [action.field]: action.value };
}
const StudentRegistration = () => {
  const [student, setStudent] = React.useReducer(
    studentReducer,
    initialStudentState,
  );
  const navigate = useNavigate();
  const setStudentAuth = useAuthStore((state) => state.setStudentAuth);
  const setMessage = useUiStore((s) => s.setMessage)
  const setLoading = useUiStore((s) => s.setLoading)
  const [cameraOn, setCameraOn] = useState(false);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.poster = capturedDataUrl || "";
  }, [capturedDataUrl]);

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.poster = "";
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    setCameraOn(true);
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setSelectedImageFile(null);
    setCapturedDataUrl(canvas.toDataURL("image/jpeg", 0.92));
    stopCamera();
  }

  function captureAgain() {
    setCapturedDataUrl(null);
    setSelectedImageFile(null);
    startCamera();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSelectedImageFile(file);
    setCapturedDataUrl(null);
    stopCamera();
  }

  async function getRegistrationImageFile() {
    if (selectedImageFile) {
      return selectedImageFile;
    }

    if (!capturedDataUrl) {
      return null;
    }

    const response = await fetch(capturedDataUrl);
    const blob = await response.blob();
    return new File([blob], "student.jpg", { type: "image/jpeg" });
  }

  async function handleRegister() {
    if (!STUDENT_ID_PATTERN.test(student.studentId.trim())) {
      setMessage("Student ID must match STD-<number>, for example STD-001", 'error')
      return;
    }

    const file = await getRegistrationImageFile();

    if (!file) {
      setMessage("Please capture or upload an image", 'error')
      return;
    }

    setLoading(true)
    try {
      const data = await registerStudent({
        studentId: student.studentId,
        fullName: student.fullName,
        password: student.password,
        image: file,
      });

      setStudentAuth({
        studentId: data.student_id,
        fullName: data.full_name,
      });
      navigate("/student/dashboard", { replace: true });
      setMessage("Student registered successfully", 'success')
    } catch (err) {
      console.log(err);
      setMessage("Unable to register student", 'error')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div>
      <div>
        <label className="text-xs uppercase tracking-wide text-slate-300/70">
          Student ID
        </label>
        <input
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
          placeholder="STD-001"
          pattern="STD-\\d+"
          title="Student ID must match STD-<number>, for example STD-001"
          value={student.studentId}
          onChange={(event) =>
            setStudent({ field: "studentId", value: event.target.value })
          }
        />
        <p className="mt-2 text-xs text-slate-400">Use the format <span className="font-medium text-slate-200">STD-001</span>.</p>
      </div>
      <label className="text-xs uppercase tracking-wide text-slate-300/70">
        Full name
      </label>
      <input
        value={student.fullName}
        onChange={(event) =>
          setStudent({ field: "fullName", value: event.target.value })
        }
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
        placeholder="Student name"
      />
      <label className="text-xs uppercase tracking-wide text-slate-300/70">
        Password
      </label>
      <input
        onChange={(event) =>
          setStudent({ field: "password", value: event.target.value })
        }
        value={student.password}
        type="password"
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
        placeholder="Create a password"
      />

      <div>
        <label className="text-xs uppercase tracking-wide text-slate-300/70">
          Choose image file
        </label>
        <div className="mt-2 flex flex-col gap-3 rounded-xl border border-dashed border-white/20 bg-black/30 p-4 text-sm text-slate-300/90">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-200 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1 file:text-xs file:font-medium file:text-black hover:file:bg-slate-100"
          />
          {selectedImageFile && (
            <p className="text-xs text-slate-400">
              Selected file: <span className="text-slate-200">{selectedImageFile.name}</span>
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wide text-slate-300/70">
          Or use camera
        </label>
        <div className="mt-2 flex flex-col gap-3 rounded-xl border border-dashed border-white/20 bg-black/30 p-4 text-sm text-slate-300/90">
          {!selectedImageFile && (
            <video
              ref={videoRef}
              className="aspect-video w-full rounded-lg bg-black/50"
              muted
              playsInline
            />
          )}
          {!capturedDataUrl && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startCamera}
                disabled={cameraOn}
                className="rounded-full border border-white/15 px-4 py-1 text-xs text-white/80 hover:bg-white/10"
              >
                Start Camera
              </button>
              <button
                type="button"
                onClick={stopCamera}
                disabled={!cameraOn}
                className="rounded-full border border-white/15 px-4 py-1 text-xs text-white/80 hover:bg-white/10"
              >
                Stop Camera
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!cameraOn}
                className="rounded-full bg-white/10 px-4 py-1 text-xs text-white hover:bg-white/20"
              >
                Capture Photo
              </button>
            </div>
          )}
          {capturedDataUrl && !selectedImageFile && (
            <button
              type="button"
              onClick={captureAgain}
              className="w-full rounded-full border border-white/15 px-4 py-1 text-xs text-white/80 hover:bg-white/10"
            >
              Use Camera Instead
            </button>
          )}
          {selectedImageFile && (
            <button
              type="button"
              onClick={() => setSelectedImageFile(null)}
              className="w-full rounded-full border border-white/15 px-4 py-1 text-xs text-white/80 hover:bg-white/10"
            >
              Switch Back To Camera
            </button>
          )}
        </div>
      </div>
      <button
        onClick={handleRegister}
        className="bg-white px-2 rounded-lg mt-2 text-center  text-black mx-auto "
      >
        Register
      </button>
    </div>
  );
};

export default StudentRegistration;
