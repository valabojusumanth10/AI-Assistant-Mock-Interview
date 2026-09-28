import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const axiosInstance = axios.create({
  baseURL: API_URL,

  // AI requests can take several seconds.
  timeout: 60000,

  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================
// REQUEST INTERCEPTOR
// ============================================================

axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token =
        localStorage.getItem("token");

      if (token) {
        config.headers =
          config.headers || {};

        config.headers.Authorization =
          `Bearer ${token}`;
      }
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    // --------------------------------------------------------
    // 401 = authentication problem
    // --------------------------------------------------------

    if (
      error.response?.status === 401 &&
      typeof window !== "undefined"
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("sessionId");

      // Avoid repeatedly redirecting if already on login.
      if (
        window.location.pathname !==
        "/login"
      ) {
        window.location.href = "/login";
      }
    }

    // --------------------------------------------------------
    // Network error
    // --------------------------------------------------------

    if (
      !error.response &&
      typeof window !== "undefined"
    ) {
      console.error(
        "API NETWORK ERROR:",
        {
          message: error.message,
          apiUrl: API_URL,
          requestUrl:
            error.config?.url,
        }
      );
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;