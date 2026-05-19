import axios from "axios";

const BASE_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL) || "http://localhost:8000";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

export default axiosInstance;
