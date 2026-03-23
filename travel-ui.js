import { updateTravel, getTravelById, getCliente } from "./api.js";
import { appState, setSelectedTravelName } from "./state.js";
import { ensureTravelExists } from "./travel.bootstrap.js";

/*************************************
 * INIT
 *************************************/
document.addEventListener("DOMContentLoaded", () => {
  syncTravelFormVisibility();
});

/*************************************
 * EVENTOS DE CONTEXTO
 *************************************/
document.addEventListener("travel-selected", async () => {
  syncTravelFormVisibility();
  await loadTravelForm();
});

document.addEventListener("travel-cleared", () => {
  clearTravelForm();
  syncTravelFormVisibility();
});

document.addEventListener("client-selected", () => {
  syncTravelFormVisibility();
});

/*************************************
 * CARGAR FORMULARIO AL SELECCIONAR VIAJE
 *************************************/
async function loadTravelForm() {
  if (!appState.activeTravelId) {
    clearTravelForm();
    return;
  }

  try {
    const travelId = Number(appState.activeTravelId);
    const travel = await getTravelById(travelId);

    /* protección race condition */
    if (Number(appState.activeTravelId) !== travelId) return;
    if (!travel) {
      clearTravelForm();
      return;
    }

    set("nombre", travel.nombre);
    set("destino", travel.destino);
    set("fecha_inicio", formatDateForInput(travel.fecha_inicio));
    set("fecha_fin", formatDateForInput(travel.fecha_fin));
    set("pasajero", travel.pasajero);
    set("tipo_viaje", travel.tipo_viaje);
    set("estado", travel.estado);
    set("notas", travel.notas);

    setSelectedTravelName(
      travel.destino || travel.nombre || `Viaje ${travel.id || travelId}`
    );
    syncTravelHeaderLabel();

    await fillClientAssociated(travel.cliente_id || appState.activeClientId);
  } catch (err) {
    console.error("Error cargando viaje", err);
  }
}

/*************************************
 * SINCRONIZAR CLIENTE ASOCIADO
 *************************************/
async function fillClientAssociated(clienteId) {
  if (!clienteId) {
    set("cliente_nombre", "");
    return;
  }

  try {
    const cliente = await getCliente(clienteId);
    if (cliente) {
      set("cliente_nombre", cliente.nombre);
    } else {
      set("cliente_nombre", "");
    }
  } catch (err) {
    console.error("Error cargando cliente asociado", err);
    set("cliente_nombre", "");
  }
}

/*************************************
 * GUARDAR FORMULARIO VIAJE
 *************************************/
document.addEventListener("click", async e => {
  if (!e.target.closest("[data-travel-save]")) return;

  if (!appState.activeTravelId) {
    alert("Seleccioná un viaje antes de guardar");
    return;
  }

  if (!appState.activeClientId) {
    alert("Seleccioná un cliente antes de guardar el viaje");
    return;
  }

  try {
    await ensureTravelExists();

    const payload = {
      cliente_id: appState.activeClientId,
      nombre: val("nombre"),
      destino: val("destino"),
      fecha_inicio: formatDateForAPI(val("fecha_inicio")),
      fecha_fin: formatDateForAPI(val("fecha_fin")),
      pasajero: val("pasajero"),
      tipo_viaje: val("tipo_viaje"),
      estado: val("estado"),
      notas: val("notas")
    };

    await updateTravel(appState.activeTravelId, payload);

    setSelectedTravelName(
      payload.destino || payload.nombre || `Viaje ${appState.activeTravelId}`
    );
    syncTravelHeaderLabel();

    document.dispatchEvent(new Event("travel-saved"));
    document.dispatchEvent(new Event("travel-selected"));

    alert("Viaje guardado");
  } catch (err) {
    console.error("Error guardando viaje", err);
  }
});

/*************************************
 * HELPERS FORM
 *************************************/
function val(key) {
  return document.querySelector(`[data-travel="${key}"]`)?.value || "";
}

function set(key, value) {
  document.querySelectorAll(`[data-travel="${key}"]`).forEach(el => {
    el.value = value ?? "";
  });
}

function formatDateForInput(isoDate) {
  if (!isoDate) return "";

  const raw = String(isoDate);
  if (raw.includes("T")) return raw.split("T")[0];
  if (raw.includes(" ")) return raw.split(" ")[0];

  return raw;
}

function formatDateForAPI(dateValue) {
  if (!dateValue) return null;
  return String(dateValue).split("T")[0];
}

/*************************************
 * LIMPIAR FORMULARIO
 *************************************/
export function clearTravelForm() {
  document.querySelectorAll("[data-travel]").forEach(el => {
    el.value = "";
  });
}

/*************************************
 * UI AUXILIAR
 *************************************/
function syncTravelFormVisibility() {
  const section = document.querySelector('[data-view="viaje"]');
  if (!section) return;

  if (appState.activeTravelId) {
    section.classList.remove("travel-empty");
  } else {
    section.classList.add("travel-empty");
  }

  syncTravelHeaderLabel();
}

function syncTravelHeaderLabel() {
  const label = document.querySelector("[data-travel-selected-label]");
  if (!label) return;

  label.textContent = appState.selectedTravelName || "—";
}