import { updateTravel, getTravelById, getCliente } from "./api.js";
import { appState } from "./state.js";
import { ensureTravelExists } from "./travel.bootstrap.js";

/*************************************
 * CARGAR FORMULARIO AL SELECCIONAR VIAJE
 *************************************/
document.addEventListener("travel-selected", loadTravelForm);

async function loadTravelForm() {
  if (!appState.activeTravelId) return;

  try {
    const travelId = appState.activeTravelId;
    const travel = await getTravelById(travelId);

    /* protección race condition */
    if (travelId !== appState.activeTravelId) return;
    if (!travel) return;

    set("nombre", travel.nombre);
    set("destino", travel.destino);
    set("fecha_inicio", formatDateForInput(travel.fecha_inicio));
    set("fecha_fin", formatDateForInput(travel.fecha_fin));
    set("pasajero", travel.pasajero);
    set("tipo_viaje", travel.tipo_viaje);
    set("estado", travel.estado);
    set("notas", travel.notas);

    console.log("TRAVEL:", travel);
    console.log("cliente_id:", travel.cliente_id);
    console.log("activeClientId:", appState.activeClientId);

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
    }
  } catch (err) {
    console.error("Error cargando cliente asociado", err);
  }
}

/*************************************
 * GUARDAR FORMULARIO VIAJE
 *************************************/
document.addEventListener("click", async e => {
  if (!e.target.closest("[data-travel-save]")) return;
  if (!appState.activeTravelId) return;
 await ensureTravelExists(); // 👈 ESTA LÍNEA
  if (!appState.activeClientId) {
    alert("Seleccioná un cliente antes de guardar el viaje");
    return;
  }

  try {
    const payload = {
      cliente_id: appState.activeClientId,
      nombre: val("nombre"),
      destino: val("destino"),
      fecha_inicio: formatDateForAPI(val("fecha_inicio")),
      fecha_fin: formatDateForAPI(val("fecha_fin")),
      pasajero: val("pasajero"),
      tipo_viaje: val("tipo_viaje"),
      estado: val("estado"),
      notas: val("notas"),
    };

    await updateTravel(appState.activeTravelId, payload);

    document.dispatchEvent(new Event("travel-saved"));

    alert("Viaje guardado");
  } catch (err) {
    console.error("Error guardando viaje", err);
  }
});

/*************************************
 * HELPERS
 *************************************/
function val(key) {
  return document.querySelector(`[data-travel="${key}"]`)?.value || null;
}

function set(key, value) {
  const el = document.querySelector(`[data-travel="${key}"]`);
  if (el) el.value = value ?? "";
}

function formatDateForInput(isoDate) {
  if (!isoDate) return "";
  return isoDate.split("T")[0];
}

function formatDateForAPI(dateValue) {
  if (!dateValue) return null;
  // Devuelve solo la fecha en formato 'YYYY-MM-DD' evitando errores MySQL
  return dateValue.split("T")[0];
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
 * LIMPIAR CUANDO NO HAY VIAJE
 *************************************/
document.addEventListener("travel-cleared", clearTravelForm);