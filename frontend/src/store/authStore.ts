import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AuthRole = "student" | "teacher";

export type AuthUser =
  | {
      role: "student";
      studentId: string;
      fullName: string;
    }
  | {
      role: "teacher";
      username: string;
      fullName: string;
    };

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setStudentAuth: (payload: { studentId: string; fullName: string }) => void;
  setTeacherAuth: (payload: { username: string; fullName: string }) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setStudentAuth: ({ studentId, fullName }) =>
        set({
          user: { role: "student", studentId, fullName },
          isAuthenticated: true,
        }),
      setTeacherAuth: ({ username, fullName }) =>
        set({
          user: { role: "teacher", username, fullName },
          isAuthenticated: true,
        }),
      clearAuth: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: "attendance-auth",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);