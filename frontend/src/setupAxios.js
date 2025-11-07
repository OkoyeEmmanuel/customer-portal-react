
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://localhost:4000",
  withCredentials: true, // Allow cookies (for CSRF token)
});

// Add request logging
api.interceptors.request.use(request => {
  console.log('Starting Request:', {
    url: request.url,
    method: request.method,
    headers: request.headers,
    data: request.data
  });
  return request;
});

// Add response logging
api.interceptors.response.use(
  response => {
    console.log('Response:', {
      status: response.status,
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  error => {
    console.error('Response Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return Promise.reject(error);
  }
);

let csrfToken = null;

export async function initCsrf() {
  try {
    const res = await api.get("/api/csrf-token");
    csrfToken = res.data.csrfToken;
    api.defaults.headers.common["CSRF-Token"] = csrfToken;
    api.defaults.headers.common["X-CSRF-Token"] = csrfToken;
    console.log("✅ CSRF token set:", csrfToken);
  } catch (err) {
    console.error("❌ Failed to fetch CSRF token:", err);
  }
}

// Add request interceptor to refresh CSRF token if needed
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response && error.response.status === 403 && error.response.data.error === 'Invalid CSRF token') {
      try {
        // Re-fetch CSRF token
        const res = await api.get("/csrf-token");
        csrfToken = res.data.csrfToken;
        api.defaults.headers.common["CSRF-Token"] = csrfToken;
        
        // Retry the original request
        const config = error.config;
        config.headers["CSRF-Token"] = csrfToken;
        return await api(config);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
