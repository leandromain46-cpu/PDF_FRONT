import {
  getTravelsByClient,
  createTravel,
  deleteTravel,
  getTravelById
} from "./api.js";

import { appState, setActiveTravelId } from "./state.js";

/************************************************
LOAD TRAVELS
*************************************************/
export async function loadTravels() {

  if (!appState.activeClientId) return;

  const container = document.querySelector("[data-travel-tabs]");
  if (!container) return;

  container.innerHTML = "";

  let travels = [];

  try {
    travels = await getTravelsByClient(appState.activeClientId);
  } catch (err) {
    console.error(err);
  }

  /* ===== SIN VIAJES ===== */
  if (!travels.length) {

    setActiveTravelId(null);

    renderEmptyTravelTab();
    populateTravelSwitcher([]);

    document.dispatchEvent(new Event("travel-cleared"));
    return;
  }

  /* ===== VALIDAR ACTIVE ===== */
  const exists = travels.some(
    t => Number(t.id) === Number(appState.activeTravelId)
  );

  if (!exists) {
    setActiveTravelId(travels[0].id);
  }

  /* ===== RENDER ===== */
  travels.forEach(renderTravelTab);

  populateTravelSwitcher(travels);

  document.dispatchEvent(new Event("travel-selected"));
}

/************************************************
EVENT REFRESH
*************************************************/
document.addEventListener("travel-saved", loadTravels);
document.addEventListener("client-selected", loadTravels);

/************************************************
TRAVEL SWITCHER
*************************************************/
function populateTravelSwitcher(travels) {

  const select = document.querySelector("[data-travel-switcher]");
  if (!select) return;

  select.innerHTML = "";

  if (!travels.length) {
    const opt = document.createElement("option");
    opt.textContent = "Sin viajes";
    select.appendChild(opt);
    return;
  }

  travels.forEach(t => {

    const opt = document.createElement("option");

    opt.value = t.id;
    opt.textContent = t.destino || `Viaje ${t.id}`;

    if (Number(t.id) === Number(appState.activeTravelId)) {
      opt.selected = true;
    }

    select.appendChild(opt);
  });
}

/************************************************
CAMBIO DESDE SELECT
*************************************************/
document.addEventListener("change", e => {

  const select = e.target.closest("[data-travel-switcher]");
  if (!select) return;

  setActiveTravelId(Number(select.value));

  document.dispatchEvent(new Event("travel-selected"));
});

/************************************************
RENDER TAB
*************************************************/
function renderTravelTab(travel) {

  const container = document.querySelector("[data-travel-tabs]");
  if (!container) return;

  const div = document.createElement("div");

  div.className = "travel-tab";
  div.dataset.travelId = travel.id;

  if (Number(travel.id) === Number(appState.activeTravelId)) {
    div.classList.add("active");
  }

  div.innerHTML = `
    <input
      type="text"
      class="form-control form-control-sm d-inline-block w-auto"
      value="${travel.destino || "Viaje"}"
      data-travel-title
    >

    <button class="btn btn-sm btn-outline-secondary" data-duplicate-travel>⧉</button>
    <button class="btn btn-sm btn-outline-success" data-add-travel>AGREGAR +</button>
    <button class="btn btn-sm btn-outline-danger" data-delete-travel>✕</button>
  `;

  container.appendChild(div);
}

/************************************************
CLICK HANDLER GLOBAL
*************************************************/
document.addEventListener("click", async e => {

  if (!appState.activeClientId) return;

  const tab = e.target.closest(".travel-tab");
  const travelId = Number(tab?.dataset.travelId);

  /* SELECT TAB */
  if (tab && !e.target.closest("button")) {

    setActiveTravelId(travelId);

    document.querySelectorAll(".travel-tab")
      .forEach(t => t.classList.remove("active"));

    tab.classList.add("active");

    document.dispatchEvent(new Event("travel-selected"));
  }

  /* ADD */
  if (e.target.closest("[data-add-travel]")) {

    const newTravel = await createTravel({
      cliente_id: appState.activeClientId,
      destino: "Nuevo viaje"
    });

    await loadTravels();

    setActiveTravelId(newTravel.id);
    document.dispatchEvent(new Event("travel-selected"));
  }

  /* DELETE */
  if (e.target.closest("[data-delete-travel]") && tab) {

    if (!confirm("Eliminar viaje?")) return;

    await deleteTravel(travelId);

    if (Number(appState.activeTravelId) === travelId) {
      setActiveTravelId(null);
    }

    await loadTravels();
  }

  /* DUPLICATE */
  if (e.target.closest("[data-duplicate-travel]") && tab) {

    const title = tab.querySelector("[data-travel-title]").value;

    const newTravel = await createTravel({
      cliente_id: appState.activeClientId,
      destino: `${title} copia`
    });

    await loadTravels();

    setActiveTravelId(newTravel.id);
    document.dispatchEvent(new Event("travel-selected"));
  }

  /* GLOBAL DELETE */
  if (e.target.closest("[data-delete-travel-global]")) {

    if (!appState.activeTravelId) return;
    if (!confirm("Eliminar viaje?")) return;

    await deleteTravel(appState.activeTravelId);

    setActiveTravelId(null);

    await loadTravels();
  }

  /* GLOBAL DUPLICATE */
  if (e.target.closest("[data-duplicate-travel-global]")) {

    if (!appState.activeTravelId) return;

    const current = await getTravelById(appState.activeTravelId);

    const newTravel = await createTravel({
      cliente_id: appState.activeClientId,
      destino: `${current.destino || "Viaje"} copia`
    });

    await loadTravels();

    setActiveTravelId(newTravel.id);
    document.dispatchEvent(new Event("travel-selected"));
  }

});

/************************************************
EMPTY TAB
*************************************************/
function renderEmptyTravelTab() {

  const container = document.querySelector("[data-travel-tabs]");
  if (!container) return;

  const div = document.createElement("div");

  div.className = "travel-tab";

  div.innerHTML = `
    <input
      type="text"
      class="form-control form-control-sm d-inline-block w-auto"
      placeholder="Nuevo viaje"
      disabled
    >

    <button class="btn btn-sm btn-outline-success" data-add-travel>
      AGREGAR +
    </button>
  `;

  container.appendChild(div);
}
