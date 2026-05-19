import axiosInstance from "./axiosInstance";
type ErrorLike = { response?: { data?: unknown }; detail?: string; message?: string };
type Student = {
  studentId: string;
  fullName: string;
  password: string;
  image: File;
};

type FaceLoginPayload = {
  image: File;
};
export const registerStudent = async ({
  studentId,
  fullName,
  password,
  image,
}: Student) => {
  try {
    const formData = new FormData();

    formData.append("studentId", studentId);
    formData.append("fullName", fullName);
    formData.append("password", password);
    formData.append("image", image);

    const response = await axiosInstance.post("/student/register", formData);

    return response.data;
  } catch (err) {
    const e = err as ErrorLike
    throw e.response?.data || e
  }
};
export const loginStudent = async ({
  studentId,
  password,
}: Omit<Student, "image" | "fullName">) => {
  try {
    const response = await axiosInstance.post("/student/login", {
      studentId,
      password,
    });

    return response.data;
  } catch (err) {
    const e = err as ErrorLike
    throw e.response?.data || e
  }
};

export const loginStudentFace = async ({ image }: FaceLoginPayload) => {
  try {
    const formData = new FormData();
    formData.append("image", image);

    const response = await axiosInstance.post("/student/login/face", formData);

    return response.data;
  } catch (err) {
    const e = err as ErrorLike
    throw e.response?.data || e
  }
};

type Teacher = {
  username: string;
  fullName: string;
  password: string;
};

export const registerTeacher = async ({ username, fullName, password }: Teacher) => {
  try {
    const response = await axiosInstance.post("/teacher/register", {
      username,
      fullName,
      password,
    });

    return response.data;
  } catch (err) {
    const e = err as ErrorLike
    throw e.response?.data || e
  }
};

export const loginTeacher = async ({ username, password }: Pick<Teacher, "username" | "password">) => {
  try {
    const response = await axiosInstance.post("/teacher/login", {
      username,
      password,
    });

    return response.data;
  } catch (err) {
    const e = err as ErrorLike
    throw e.response?.data || e
  }
};

export const createSubject = async ({ code, name, description }: { code: string; name: string; description?: string }) => {
  try {
    const response = await axiosInstance.post("/teacher/subjects", { code, name, description });
    return response.data;
  } catch (err) {
    const e = err as ErrorLike
    throw e.response?.data || e
  }
};

export const getTeacherSubjects = async () => {
  try {
    const response = await axiosInstance.get("/teacher/subjects");
    return response.data;
  } catch (err) {
    const e = err as ErrorLike
    throw e.response?.data || e
  }
};

export const getSubjects = async () => {
  try {
    const response = await axiosInstance.get("/subjects");
    return response.data;
  } catch (err) {
    const e = err as ErrorLike
    throw e.response?.data || e
  }
};

export const enrollInSubject = async ({ subjectId }: { subjectId: number }) => {
  try {
    const response = await axiosInstance.post(`/subjects/${subjectId}/enroll`);
    return response.data;
  } catch (err) {
    const e = err as ErrorLike
    throw e.response?.data || e
  }
};

export const unenrollFromSubject = async ({ subjectId }: { subjectId: number }) => {
  try {
    const response = await axiosInstance.post(`/subjects/${subjectId}/unenroll`);
    return response.data;
  } catch (err) {
    const e = err as ErrorLike
    throw e.response?.data || e
  }
};

export const takeAttendance = async ({ subjectId, image }: { subjectId: number; image: File }) => {
  try {
    const formData = new FormData();
    formData.append('image', image);
    const response = await axiosInstance.post(`/teacher/subjects/${subjectId}/attendance`, formData);
    return response.data;
  } catch (err) {
    const e = err as ErrorLike
    throw e.response?.data || e
  }
};

export const getAttendanceRecords = async ({ subjectId }: { subjectId: number }) => {
  try {
    const response = await axiosInstance.get(`/teacher/subjects/${subjectId}/attendance-records`);
    return response.data;
  } catch (err) {
    const e = err as ErrorLike
    throw e.response?.data || e
  }
};

export const deleteSubject = async ({ subjectId }: { subjectId: number }) => {
  try {
    const response = await axiosInstance.delete(`/teacher/subjects/${subjectId}`);
    return response.data;
  } catch (err) {
    const e = err as ErrorLike
    throw e.response?.data || e
  }
}

export const deleteStudentAccount = async () => {
  try {
    const response = await axiosInstance.delete(`/student/account`);
    return response.data;
  } catch (err) {
    const e = err as ErrorLike
    throw e.response?.data || e
  }
}

export const deleteTeacherAccount = async () => {
  try {
    const response = await axiosInstance.delete(`/teacher/account`);
    return response.data;
  } catch (err) {
    const e = err as ErrorLike
    throw e.response?.data || e
  }
}
