/* ================================
BOOTSTRAP APP FRONTEND
================================ */

import {
  setAuthToken,
  showApp,
  showLogin,
  login,
  logout
} from "./api.js";

import { appState, setQuoteTab, setTravelTab, setView } from "./state.js";

/* UI / módulos funcionales */
import "./travel-tabs.js";
import "./travel-ui.js";
import "./clients.js";
import "./services.js";
import "./pdf.js";
import "./quotes.js";
import "./itinerary.js";
import "./vouchers.js";
import "./operators.js";

/* ================================
INIT
================================ */
document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  restoreSession();
  initLoginForm();
  initLogoutButton();
  initMainTabs();
  initTravelTabs();
  initQuoteTabs();
  initGlobalStateSync();
  syncAppUI();

  console.log("APP cargada correctamente");
}

/* ================================
RESTORE JWT SESSION
================================ */
function restoreSession() {
  const savedToken = localStorage.getItem("auth_token");

  if (savedToken) {
    setAuthToken(savedToken);
    showApp();
    syncAppUI();
  } else {
    showLogin();
  }
}

/* ================================
LOGIN FORM
================================ */
function initLoginForm() {
  const form = document.querySelector("[data-login-form]");

  form?.addEventListener("submit", async e => {
    e.preventDefault();

    const username = document.querySelector("[data-login-username]")?.value || "";
    const password = document.querySelector("[data-login-password]")?.value || "";

    try {
      await login(username, password);
      syncAppUI();
      console.log("Login exitoso");
    } catch (err) {
      alert("Credenciales incorrectas");
      console.error(err);
    }
  });
}

/* ================================
LOGOUT BUTTON
================================ */
function initLogoutButton() {
  const btn = document.getElementById("logout-btn");

  btn?.addEventListener("click", () => {
    logout();
    console.log("Sesión cerrada");
  });
}

/* ================================
MAIN NAV
================================ */
function initMainTabs() {
  document.addEventListener("click", e => {
    const btn = e.target.closest("[data-main-tab]");
    if (!btn) return;

    const tab = btn.dataset.mainTab;

    if (tab === "clientes") {
      if (appState.activeTravelId) {
        setView("viaje");
      } else if (appState.activeClientId) {
        setView("cliente");
      } else {
        setView("clientes");
      }
    }

    if (tab === "inicio") {
      setView("clientes");
    }

    syncAppUI();
  });
}

/* ================================
TRAVEL NAV
================================ */
function initTravelTabs() {
  document.addEventListener("click", e => {
    const btn = e.target.closest("[data-travel-tab]");
    if (!btn) return;

    const tab = btn.dataset.travelTab;

    setTravelTab(tab);

    if (appState.activeTravelId) {
      setView("viaje");
    }

    syncTravelTabs();
    syncTravelPanels();
    syncAppUI();
  });
}

/* ================================
QUOTE NAV
================================ */
function initQuoteTabs() {
  document.addEventListener("click", e => {
    const btn = e.target.closest("[data-quote-tab]");
    if (!btn) return;

    const tab = btn.dataset.quoteTab;
    setQuoteTab(tab);

    syncQuoteTabs();
    syncQuotePanels();
    syncAppUI();
  });
}

/* ================================
GLOBAL STATE SYNC
================================ */
function initGlobalStateSync() {
  document.addEventListener("client-selected", () => {
    syncAppUI();
  });

  document.addEventListener("travel-selected", () => {
    syncAppUI();
  });

  document.addEventListener("travel-cleared", () => {
    syncAppUI();
  });

  document.addEventListener("travel-saved", () => {
    syncAppUI();
  });
}

/* ================================
SYNC APP UI
================================ */
function syncAppUI() {
  syncViews();
  syncMainTabs();
  syncTravelTabs();
  syncTravelPanels();
  syncQuoteTabs();
  syncQuotePanels();
  syncBreadcrumb();
  syncSelectedLabels();
}

/* ================================
VIEW VISIBILITY
================================ */
function syncViews() {
  const allViews = document.querySelectorAll("[data-view]");
  allViews.forEach(view => view.classList.add("d-none"));

  if (appState.view === "clientes") {
    document.querySelector('[data-view="clientes"]')?.classList.remove("d-none");
    return;
  }

  if (appState.view === "cliente") {
    document.querySelector('[data-view="cliente"]')?.classList.remove("d-none");
    return;
  }

  if (appState.view === "viaje") {
    document.querySelector('[data-view="cliente"]')?.classList.remove("d-none");
    document.querySelector('[data-view="viaje"]')?.classList.remove("d-none");
    return;
  }
}

/* ================================
MAIN TABS UI
================================ */
function syncMainTabs() {
  document.querySelectorAll("[data-main-tab]").forEach(btn => {
    btn.classList.remove("active");
  });

  const clientesBtn = document.querySelector('[data-main-tab="clientes"]');
  const inicioBtn = document.querySelector('[data-main-tab="inicio"]');

  if (!clientesBtn || !inicioBtn) return;

  if (
    appState.view === "clientes" ||
    appState.view === "cliente" ||
    appState.view === "viaje"
  ) {
    clientesBtn.classList.add("active");
  } else {
    inicioBtn.classList.add("active");
  }
}

/* ================================
TRAVEL TABS UI
================================ */
function syncTravelTabs() {
  document.querySelectorAll("[data-travel-tab]").forEach(btn => {
    const isActive = btn.dataset.travelTab === appState.travelTab;

    btn.classList.toggle("active", isActive);
    btn.classList.remove("btn-primary", "btn-outline-primary");
    btn.classList.add(isActive ? "btn-primary" : "btn-outline-primary");
  });
}

function syncTravelPanels() {
  document.querySelectorAll("[data-travel-panel]").forEach(panel => {
    panel.classList.add("d-none");
  });

  document.querySelectorAll("[data-section]").forEach(section => {
    section.classList.add("d-none");
  });

  if (appState.travelTab === "datos") {
    document.querySelector('[data-travel-panel="datos"]')?.classList.remove("d-none");
    return;
  }

  document.querySelector(`[data-section="${appState.travelTab}"]`)?.classList.remove("d-none");
}

/* ================================
QUOTE TABS UI
================================ */
function syncQuoteTabs() {
  document.querySelectorAll("[data-quote-tab]").forEach(btn => {
    const isActive = btn.dataset.quoteTab === appState.quoteTab;

    btn.classList.toggle("active", isActive);
    btn.classList.remove("btn-secondary", "btn-outline-secondary");
    btn.classList.add(isActive ? "btn-secondary" : "btn-outline-secondary");
  });
}

function syncQuotePanels() {
  document.querySelectorAll("[data-quote-section]").forEach(panel => {
    panel.classList.add("d-none");
  });

  document
    .querySelector(`[data-quote-section="${appState.quoteTab}"]`)
    ?.classList.remove("d-none");
}

/* ================================
BREADCRUMB
================================ */
function syncBreadcrumb() {
  const el = document.querySelector("[data-breadcrumb]");
  if (!el) return;

  const parts = ["Inicio", "Clientes"];

  if (appState.selectedClientName) {
    parts.push(appState.selectedClientName);
  }

  if (appState.selectedTravelName) {
    parts.push(appState.selectedTravelName);
  }

  if (appState.view === "viaje") {
    if (appState.travelTab === "datos") parts.push("Datos del viaje");
    if (appState.travelTab === "cotizaciones") parts.push("Cotizaciones");
    if (appState.travelTab === "operadores") parts.push("Operadores");
    if (appState.travelTab === "vouchers") parts.push("Vouchers y Pasajes");
    if (appState.travelTab === "itinerario") parts.push("Itinerarios");

    if (appState.travelTab === "cotizaciones") {
      if (appState.quoteTab === "presupuesto") parts.push("Datos del Presupuesto");
      if (appState.quoteTab === "servicios") parts.push("Servicios");
    }
  }

  el.textContent = parts.join(" > ");
}

/* ================================
SELECTED LABELS
================================ */
function syncSelectedLabels() {
  const clientLabel = document.querySelector("[data-client-selected-label]");
  if (clientLabel) {
    clientLabel.textContent = appState.selectedClientName || "—";
  }

  const travelLabel = document.querySelector("[data-travel-selected-label]");
  if (travelLabel) {
    travelLabel.textContent = appState.selectedTravelName || "—";
  }
}