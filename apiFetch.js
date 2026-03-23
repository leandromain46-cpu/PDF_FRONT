const API_BASE = "/api";

export function setAuthToken(token) {
  localStorage.setItem("auth_token", token);
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("auth_token");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    alert("Sesión expirada. Volvé a iniciar sesión.");
    localStorage.removeItem("auth_token");
    window.location.href = "/login.html";
    throw new Error("Unauthorized");
  }

  return res;
}
