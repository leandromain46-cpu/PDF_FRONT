export const appState = {
  view: "clientes", // clientes | cliente | viaje

  activeClientId: null,
  activeTravelId: null,
  activeQuoteId: null,

  clientTab: "ficha", // ficha | documentacion | viajes
  travelTab: "datos", // datos | cotizaciones | operadores | vouchers | itinerario
  quoteTab: "presupuesto", // presupuesto | servicios

  serviceType: "",

  selectedClientName: "",
  selectedTravelName: ""
};

export function setView(view) {
  appState.view = view;
}

export function setActiveClientId(id) {
  const numericId = id ? Number(id) : null;

  appState.activeClientId = numericId;
  appState.activeTravelId = null;
  appState.activeQuoteId = null;

  appState.serviceType = "";
  appState.selectedTravelName = "";

  if (numericId) {
    appState.view = "cliente";
    appState.clientTab = "ficha";
    appState.travelTab = "datos";
    appState.quoteTab = "presupuesto";
  } else {
    appState.view = "clientes";
    appState.clientTab = "ficha";
    appState.travelTab = "datos";
    appState.quoteTab = "presupuesto";
    appState.selectedClientName = "";
  }
}

export function setActiveTravelId(id) {
  const numericId = id ? Number(id) : null;

  appState.activeTravelId = numericId;
  appState.activeQuoteId = null;

  appState.travelTab = "datos";
  appState.quoteTab = "presupuesto";
  appState.serviceType = "";

  if (numericId) {
    appState.view = "viaje";
  } else if (appState.activeClientId) {
    appState.view = "cliente";
  } else {
    appState.view = "clientes";
  }
}

export function setActiveQuoteId(id) {
  appState.activeQuoteId = id ? Number(id) : null;
}

export function setClientTab(tab) {
  appState.clientTab = tab || "ficha";
}

export function setTravelTab(tab) {
  appState.travelTab = tab || "datos";
}

export function setQuoteTab(tab) {
  appState.quoteTab = tab || "presupuesto";
}

export function setServiceType(type) {
  appState.serviceType = type || "";
}

export function setSelectedClientName(name) {
  appState.selectedClientName = name || "";
}

export function setSelectedTravelName(name) {
  appState.selectedTravelName = name || "";
}

export function resetClientContext() {
  appState.activeClientId = null;
  appState.activeTravelId = null;
  appState.activeQuoteId = null;

  appState.view = "clientes";
  appState.clientTab = "ficha";
  appState.travelTab = "datos";
  appState.quoteTab = "presupuesto";
  appState.serviceType = "";

  appState.selectedClientName = "";
  appState.selectedTravelName = "";
}

export function resetTravelContext() {
  appState.activeTravelId = null;
  appState.activeQuoteId = null;

  appState.selectedTravelName = "";
  appState.travelTab = "datos";
  appState.quoteTab = "presupuesto";
  appState.serviceType = "";

  if (appState.activeClientId) {
    appState.view = "cliente";
  } else {
    appState.view = "clientes";
  }
}