import { login, setAuthToken } from "./api.js";

document.addEventListener("submit", async e => {

  if (!e.target.matches("[data-login-form]")) return;
  e.preventDefault();

  const user = document.querySelector("[data-login-username]").value;
  const pass = document.querySelector("[data-login-password]").value;

  const res = await login(user, pass);

  setAuthToken(res.accessToken);
  localStorage.setItem("auth_token", res.accessToken);
  localStorage.setItem("refresh_token", res.refreshToken);

  window.location.href = "/index.html";
});
