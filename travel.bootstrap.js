import { createTravel } from "./api.js";
import {
  appState,
  setActiveTravelId,
  setSelectedTravelName,
  setTravelTab,
  setQuoteTab,
  setView
} from "./state.js";

/* =========================================================
   ASEGURAR QUE EXISTA UN VIAJE ACTIVO
========================================================= */
export async function ensureTravelExists() {
  /* Si ya hay viaje activo, solo sincronizamos contexto */
  if (appState.activeTravelId) {
    setView("viaje");
    setTravelTab("datos");
    setQuoteTab("presupuesto");

    document.dispatchEvent(new Event("travel-selected"));
    return appState.activeTravelId;
  }

  /* Validación de cliente */
  if (!appState.activeClientId) {
    alert("Seleccioná un cliente primero");
    return null;
  }

  /* Crear viaje mínimo */
  const payload = {
    cliente_id: appState.activeClientId,
    nombre: "Viaje en creación",
    destino: "Nuevo viaje",
    fecha_inicio: null,
    fecha_fin: null,
    pasajero: "",
    estado: "Borrador",
    notas: ""
  };

  try {
    const travel = await createTravel(payload);

    if (!travel?.id) {
      throw new Error("No se recibió un id de viaje válido");
    }

    setActiveTravelId(travel.id);
    setSelectedTravelName(travel.destino || travel.nombre || "Nuevo viaje");
    setView("viaje");
    setTravelTab("datos");
    setQuoteTab("presupuesto");

    document.dispatchEvent(new Event("travel-saved"));
    document.dispatchEvent(new Event("travel-selected"));

    return travel.id;
  } catch (error) {
    console.error("Error creando viaje:", error);
    alert("No se pudo crear el viaje automáticamente.");
    return null;
  }
}