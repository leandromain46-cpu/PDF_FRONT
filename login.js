import { apiFetch, setToken } from "./api.js";

const form = document.querySelector("[data-login-form]");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.querySelector("[data-login-username]").value;
  const password = document.querySelector("[data-login-password]").value;

  const res = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  setToken(data.token);
  window.location.href = "index.html";
});
