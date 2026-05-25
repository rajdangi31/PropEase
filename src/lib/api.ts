const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

interface FetchOptions extends RequestInit {
  data?: any;
}

async function fetchWithAuth(endpoint: string, options: FetchOptions = {}) {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  if (options.data) {
    config.body = JSON.stringify(options.data);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("auth_token");
      // Optional: Redirect to login if needed, or handle inside components
      window.location.href = "/auth";
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Something went wrong");
  }

  return response.json();
}

export const api = {
  get: (endpoint: string, options?: FetchOptions) => fetchWithAuth(endpoint, { ...options, method: "GET" }),
  post: (endpoint: string, data?: any, options?: FetchOptions) => fetchWithAuth(endpoint, { ...options, method: "POST", data }),
  put: (endpoint: string, data?: any, options?: FetchOptions) => fetchWithAuth(endpoint, { ...options, method: "PUT", data }),
  patch: (endpoint: string, data?: any, options?: FetchOptions) => fetchWithAuth(endpoint, { ...options, method: "PATCH", data }),
  delete: (endpoint: string, options?: FetchOptions) => fetchWithAuth(endpoint, { ...options, method: "DELETE" }),
};
