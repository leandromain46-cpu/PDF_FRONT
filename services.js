import { apiFetch } from "./api.js";
import { appState, setServiceType } from "./state.js";

/* =========================================
   INIT CONTROL
========================================= */
let serviceFilterBound = false;

/* =========================================
   INIT
========================================= */
document.addEventListener("DOMContentLoaded", async () => {
  bindServiceFilter();
  resetServicesUI();
});

/* =========================================
   EVENTOS DE CONTEXTO
========================================= */
document.addEventListener("travel-selected", async () => {
  await reloadServicesContext();
});

document.addEventListener("travel-cleared", () => {
  resetServicesUI();
});

document.addEventListener("client-selected", () => {
  if (!appState.activeTravelId || !appState.activeQuoteId) {
    resetServicesUI();
  }
});

document.addEventListener("travel-saved", async () => {
  if (!appState.activeTravelId || !appState.activeQuoteId) return;
  await reloadServicesContext();
});

document.addEventListener("quote-tab-changed", () => {
  syncServiceFilterUI();
  syncVisibleServicesByType();
});

/* =========================================
   API PÚBLICA
========================================= */
export async function loadServicios() {
  await reloadServicesContext();
}

/* =========================================
   RECARGA COMPLETA DEL CONTEXTO
========================================= */
async function reloadServicesContext() {
  clearServicesList();
  resetTotals();

  if (!appState.activeTravelId || !appState.activeQuoteId) {
    renderEmptyServicesState("Seleccioná una cotización para cargar los servicios.");
    syncServiceFilterUI();
    return;
  }

  try {
    const res = await apiFetch(`/servicios/cotizacion/${appState.activeQuoteId}`);
    const services = await safeJson(res);

    clearServicesList();

    if (!Array.isArray(services) || !services.length) {
      renderEmptyServicesState("No hay servicios cargados para esta cotización.");
      resetTotals();
      syncServiceFilterUI();
      return;
    }

    services.forEach(service => {
      renderServiceCard(service);
    });

    syncServiceFilterUI();
    syncVisibleServicesByType();
    updateTotals();
  } catch (err) {
    console.error("Error cargando servicios:", err);
    clearServicesList();
    renderEmptyServicesState("No se pudieron cargar los servicios.");
    resetTotals();
    syncServiceFilterUI();
  }
}

/* =========================================
   FILTRO DE TIPO DE SERVICIO
========================================= */
function bindServiceFilter() {
  if (serviceFilterBound) return;
  serviceFilterBound = true;

  document.addEventListener("change", e => {
    const select = e.target.closest("[data-service-filter]");
    if (!select) return;

    setServiceType(select.value || "");
    syncVisibleServicesByType();
  });
}

function syncServiceFilterUI() {
  const select = document.querySelector("[data-service-filter]");
  if (!select) return;

  select.value = appState.serviceType || "";
}

function syncVisibleServicesByType() {
  const cards = document.querySelectorAll(".service-card");

  cards.forEach(card => {
    const tipo = card.querySelector('[data-field="tipo"]')?.value || "";
    const shouldShow = !appState.serviceType || tipo === appState.serviceType;
    card.classList.toggle("d-none", !shouldShow);
  });
}

/* =========================================
   AGREGAR SERVICIO
========================================= */
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-add-service]");
  if (!btn) return;

  if (!appState.activeTravelId) {
    alert("Seleccioná un viaje primero");
    return;
  }

  if (!appState.activeQuoteId) {
    alert("Seleccioná una cotización primero");
    return;
  }

  const list = document.querySelector(".services-list");
  const tpl = document.getElementById("service-template");

  if (!tpl || !list) return;

  removeEmptyServicesState();

  const defaultType = appState.serviceType || btn.dataset.addService || "hotel";

  const node = tpl.content.cloneNode(true);
  const serviceEl = node.querySelector(".service-card");

  if (!serviceEl) return;

  serviceEl.dataset.serviceId = crypto.randomUUID();

  wireServiceCard(serviceEl);

  const tipoSelect = serviceEl.querySelector('[data-field="tipo"]');
  if (tipoSelect) {
    tipoSelect.value = defaultType;
  }

  setDefaultSpecificFields(serviceEl, defaultType);
  toggleSpecificFields(serviceEl, defaultType);
  updateServiceSubtotal(serviceEl);

  list.appendChild(serviceEl);

  syncVisibleServicesByType();
  updateTotals();
});

/* =========================================
   GUARDAR SERVICIOS
========================================= */
document.addEventListener("click", async e => {
  if (!e.target.closest("[data-services-save]")) return;

  if (!appState.activeTravelId) {
    alert("Seleccioná un viaje primero");
    return;
  }

  if (!appState.activeQuoteId) {
    alert("Seleccioná una cotización primero");
    return;
  }

  const cards = Array.from(document.querySelectorAll(".service-card"));
  const services = cards.map(card => buildServicePayload(card)).filter(Boolean);

  try {
    const oldRes = await apiFetch(`/servicios/cotizacion/${appState.activeQuoteId}`);
    const existing = await safeJson(oldRes);

    if (Array.isArray(existing)) {
      for (const s of existing) {
        await apiFetch(`/servicios/${s.id}`, { method: "DELETE" });
      }
    }

    for (const service of services) {
      await apiFetch("/servicios", {
        method: "POST",
        body: JSON.stringify(service)
      });
    }

    await reloadServicesContext();
    alert("Servicios guardados correctamente");
  } catch (err) {
    console.error("Error guardando servicios:", err);
    alert("Error guardando servicios");
  }
});

/* =========================================
   RENDER DE CARD EXISTENTE
========================================= */
function renderServiceCard(service = {}) {
  const list = document.querySelector(".services-list");
  const tpl = document.getElementById("service-template");

  if (!tpl || !list) return;

  removeEmptyServicesState();

  const node = tpl.content.cloneNode(true);
  const serviceEl = node.querySelector(".service-card");

  if (!serviceEl) return;

  serviceEl.dataset.serviceId = service.id || crypto.randomUUID();

  if (service.id) {
    serviceEl.dataset.backendId = service.id;
  }

  wireServiceCard(serviceEl);
  hydrateServiceCard(serviceEl, service);

  list.appendChild(serviceEl);
}

/* =========================================
   WIRING CARD
========================================= */
function wireServiceCard(serviceEl) {
  const removeBtn = serviceEl.querySelector("[data-remove]");
  removeBtn?.addEventListener("click", () => {
    serviceEl.remove();

    const remaining = document.querySelectorAll(".service-card").length;

    if (!remaining) {
      renderEmptyServicesState("No hay servicios cargados para esta cotización.");
    }

    updateTotals();
  });

  serviceEl
    .querySelectorAll('[data-field="precio"], [data-field="adultos"], [data-field="menores"]')
    .forEach(input => {
      input.addEventListener("input", () => {
        updateServiceSubtotal(serviceEl);
        updateTotals();
      });
    });

  const tipoSelect = serviceEl.querySelector('[data-field="tipo"]');
  tipoSelect?.addEventListener("change", () => {
    const type = tipoSelect.value || "";

    clearSpecificFields(serviceEl);
    setDefaultSpecificFields(serviceEl, type);
    toggleSpecificFields(serviceEl, type);
    syncVisibleServicesByType();
    updateServiceSubtotal(serviceEl);
    updateTotals();
  });
}

/* =========================================
   HYDRATE CARD
========================================= */
function hydrateServiceCard(serviceEl, service) {
  const tipo = service.tipo || service.categoria || "hotel";
  const metadata = normalizeMetadata(service.metadata);

  setField(serviceEl, "tipo", tipo);
  setField(serviceEl, "descripcion", service.descripcion || "");
  setField(serviceEl, "observaciones", service.observaciones || "");
  setField(serviceEl, "moneda", service.moneda || "USD");
  setField(serviceEl, "precio", service.precio || 0);
  setField(serviceEl, "adultos", service.adultos || 0);
  setField(serviceEl, "menores", service.menores || 0);
  setField(serviceEl, "subtotal", service.subtotal || 0);

  toggleSpecificFields(serviceEl, tipo);
  hydrateSpecificFields(serviceEl, tipo, metadata);
  updateServiceSubtotal(serviceEl);
}

/* =========================================
   SPECIFIC FIELDS
========================================= */
function toggleSpecificFields(serviceEl, type) {
  serviceEl.querySelectorAll(".service-specific")
    .forEach(div => div.classList.add("hidden"));

  const block = serviceEl.querySelector(`.service-specific[data-specific="${type}"]`);
  if (block) {
    block.classList.remove("hidden");
  }
}

function hydrateSpecificFields(serviceEl, type, metadata) {
  const block = serviceEl.querySelector(`.service-specific[data-specific="${type}"]`);
  if (!block) return;

  const inputs = block.querySelectorAll("input, select, textarea");

  inputs.forEach((input, index) => {
    const keyByName = input.name;
    const keyByDataset = input.dataset.meta;
    const keyByIndex = `field_${index}`;

    const value =
      metadata[keyByName] ??
      metadata[keyByDataset] ??
      metadata[keyByIndex] ??
      "";

    input.value = value;
  });
}

function collectSpecificMetadata(card, tipo) {
  const metadata = {};
  const block = card.querySelector(`.service-specific[data-specific="${tipo}"]`);
  if (!block) return metadata;

  block.querySelectorAll("input, select, textarea").forEach((input, index) => {
    const key = input.name || input.dataset.meta || `field_${index}`;
    metadata[key] = input.value ?? "";
  });

  return metadata;
}

function clearSpecificFields(serviceEl) {
  serviceEl.querySelectorAll(".service-specific input, .service-specific select, .service-specific textarea")
    .forEach(input => {
      if (input.type === "checkbox" || input.type === "radio") {
        input.checked = false;
      } else {
        input.value = "";
      }
    });
}

function setDefaultSpecificFields(serviceEl, type) {
  const block = serviceEl.querySelector(`.service-specific[data-specific="${type}"]`);
  if (!block) return;

  const inputs = block.querySelectorAll("input, select, textarea");
  inputs.forEach(input => {
    if (input.tagName === "SELECT" && input.options.length) {
      input.selectedIndex = 0;
    }
  });
}

/* =========================================
   BUILD PAYLOAD
========================================= */
function buildServicePayload(card) {
  const tipo = getField(card, "tipo");

  if (!tipo) return null;

  return {
    cotizacion_id: Number(appState.activeQuoteId),
    tipo,
    categoria: tipo,
    descripcion: getField(card, "descripcion"),
    observaciones: getField(card, "observaciones"),
    moneda: getField(card, "moneda") || "USD",
    precio: Number(getField(card, "precio") || 0),
    adultos: Number(getField(card, "adultos") || 0),
    menores: Number(getField(card, "menores") || 0),
    subtotal: Number(getField(card, "subtotal") || 0),
    metadata: collectSpecificMetadata(card, tipo)
  };
}

/* =========================================
   SUBTOTAL
========================================= */
function updateServiceSubtotal(serviceEl) {
  const precio = Number(getField(serviceEl, "precio") || 0);
  const adultos = Number(getField(serviceEl, "adultos") || 0);
  const menores = Number(getField(serviceEl, "menores") || 0);

  const subtotal = precio * (adultos + menores);
  setField(serviceEl, "subtotal", subtotal.toFixed(2));
}

/* =========================================
   TOTALES
========================================= */
function updateTotals() {
  const totals = {
    hotel: 0,
    aereo: 0,
    traslado: 0,
    excursion: 0,
    asistencia: 0,
    crucero: 0,
    tren: 0,
    auto: 0,
    gastos: 0
  };

  document.querySelectorAll(".service-card").forEach(card => {
    const tipo = getField(card, "tipo");
    const subtotal = Number(getField(card, "subtotal") || 0);

    if (!tipo) return;

    if (typeof totals[tipo] === "undefined") {
      totals[tipo] = 0;
    }

    totals[tipo] += subtotal;
  });

  Object.entries(totals).forEach(([key, sum]) => {
    const totalEl = document.querySelector(`[data-total-category="${key}"]`);
    if (totalEl) {
      totalEl.textContent = `USD ${sum.toFixed(2)}`;
    }
  });

  const totalGeneral = Object.values(totals)
    .reduce((acc, value) => acc + Number(value || 0), 0);

  const totalGeneralEl = document.querySelector("[data-total-general]");
  if (totalGeneralEl) {
    totalGeneralEl.textContent = `USD ${totalGeneral.toFixed(2)}`;
  }
}

function resetTotals() {
  document.querySelectorAll("[data-total-category]").forEach(el => {
    el.textContent = "USD 0.00";
  });

  const totalGeneralEl = document.querySelector("[data-total-general]");
  if (totalGeneralEl) {
    totalGeneralEl.textContent = "USD 0.00";
  }
}

/* =========================================
   EMPTY STATE
========================================= */
function renderEmptyServicesState(message) {
  const list = document.querySelector(".services-list");
  if (!list) return;

  list.innerHTML = `
    <div class="service-empty-state border rounded p-3 text-muted small">
      ${escapeHtml(message)}
    </div>
  `;
}

function removeEmptyServicesState() {
  document.querySelectorAll(".service-empty-state").forEach(empty => empty.remove());
}

function clearServicesList() {
  document.querySelectorAll(".services-list").forEach(list => {
    list.innerHTML = "";
  });
}

function resetServicesUI() {
  clearServicesList();
  renderEmptyServicesState("Seleccioná una cotización para cargar los servicios.");
  resetTotals();
  syncServiceFilterUI();
}

/* =========================================
   HELPERS
========================================= */
async function safeJson(res) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return res.json();
}

function getField(root, key) {
  return root.querySelector(`[data-field="${key}"]`)?.value || "";
}

function setField(root, key, value) {
  const el = root.querySelector(`[data-field="${key}"]`);
  if (el) {
    el.value = value ?? "";
  }
}

function normalizeMetadata(metadata) {
  if (!metadata) return {};

  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  }

  if (typeof metadata === "object") {
    return metadata;
  }

  return {};
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}