import { createTravel } from "./api.js";
import { appState } from "./state.js";

export async function ensureTravelExists() {

  // 🔁 Si ya existe viaje activo, solo notificamos
  if (appState.activeTravelId) {
    document.dispatchEvent(new Event("travelChanged"));
    document.dispatchEvent(new Event("travel-selected"));
    return;
  }

  // 🛑 Validación cliente
  if (!appState.activeClientId) {
    alert("Seleccioná un cliente primero");
    return;
  }

  // 🆕 Crear viaje
  const payload = {
    cliente_id: appState.activeClientId,
    titulo: "Viaje en creación",
    destino: "",
    fecha_inicio: null,
    fecha_fin: null
  };

  try {
    const travel = await createTravel(payload);

    appState.activeTravelId = travel.id;

    // 🔥 Notificamos a todo el sistema
    document.dispatchEvent(new Event("travelChanged"));
    document.dispatchEvent(new Event("travel-selected"));

  } catch (error) {
    console.error("Error creando viaje:", error);
  }
}
