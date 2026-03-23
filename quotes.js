import { apiFetch } from "./api.js";
import { appState } from "./state.js";
import { loadServicios } from "./services-loader.js";

/* =========================
   UTIL
========================= */
async function safeJson(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Error en la petición");
  }
  return res.json();
}

/* =========================
   LISTAR COTIZACIONES
========================= */
export async function loadQuotes() {
  try {
    if (!appState.activeTravelId) return;

    const container = document.getElementById("quotes-list");
    if (!container) return;

    const res = await apiFetch(
      `/cotizaciones/viaje/${appState.activeTravelId}`
    );

    const quotes = await safeJson(res);

    container.innerHTML = "";

    if (!quotes.length) {
      container.innerHTML =
        `<div style="opacity:.6">No hay cotizaciones aún</div>`;
    } else {
      quotes.forEach(q => {
        container.insertAdjacentHTML(
          "beforeend",
          `
          <div class="quote-item"
               style="border:1px solid #ddd;border-radius:6px;padding:12px;margin-bottom:10px;background:#fff;">

            <div class="quote-header"
                 data-toggle="${q.id}"
                 style="cursor:pointer;display:flex;justify-content:space-between;">

              <strong>${q.titulo || "Sin título"}</strong>
              <span>▼</span>
            </div>

            <div class="quote-body"
                 id="quote-${q.id}"
                 style="display:none;margin-top:10px;">

              <div><strong>Condición legal:</strong> ${q.condicion_legal || "-"}</div>
              <div><strong>Total:</strong> USD ${q.total || "0.00"}</div>

              <div style="margin-top:8px;">
                <button data-edit="${q.id}">Editar</button>
                <button data-delete="${q.id}">Eliminar</button>
              </div>
            </div>
          </div>
          `
        );
      });
    }

    await renderTravelHeader();

  } catch (err) {
    console.error("Error cargando cotizaciones:", err);
  }
}

/* =========================
   HEADER DEL VIAJE
========================= */
async function renderTravelHeader() {
  try {
    if (!appState.activeTravelId) return;

    const res = await apiFetch(`/viajes/${appState.activeTravelId}`);
    const viaje = await safeJson(res);

    const header = document.getElementById("travel-header");
    if (header) {
      header.innerHTML = `
        <h3>Viaje #${viaje.id}</h3>
        <div>Cliente: ${viaje.cliente_nombre || "-"}</div>
        <div>Fecha: ${viaje.fecha_inicio || "-"}</div>
      `;
    }

    setClienteEnFormulario(viaje);

  } catch (err) {
    console.error("Error cargando header del viaje:", err);
  }
}

function setClienteEnFormulario(viaje) {
  const clienteInput = document.querySelector('[data-basic="cliente_nom"]');
  if (clienteInput) {
    clienteInput.value = viaje.cliente_nombre || "";
  }
}

/* =========================
   GUARDAR
========================= */
document.addEventListener("click", async (e) => {
  if (!e.target.matches("[data-quote-save]")) return;

  const id = document.querySelector('[data-basic="idpresupuesto"]').value;

  const payload = {
    viaje_id: appState.activeTravelId,
    titulo: document.querySelector('[data-basic="titulo"]').value,
    condicion_legal: document.querySelector('[data-basic="condicion_legal"]').value
  };

  try {
    if (id) {
      await apiFetch(`/cotizaciones/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      await apiFetch("/cotizaciones", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    await loadQuotes();

  } catch (err) {
    console.error("Error guardando:", err);
  }
});

/* =========================
   ELIMINAR
========================= */
document.addEventListener("click", async (e) => {
  if (!e.target.matches("[data-delete]")) return;

  const id = e.target.dataset.delete;
  if (!id) return;

  if (!confirm("¿Eliminar cotización?")) return;

  try {
    const res = await apiFetch(`/cotizaciones/${id}`, {
      method: "DELETE"
    });

    await safeJson(res);
    await loadQuotes();

  } catch (err) {
    console.error("Error eliminando:", err);
  }
});

/* =========================
   EDITAR
========================= */
document.addEventListener("click", async (e) => {
  if (!e.target.matches("[data-edit]")) return;

  const id = e.target.dataset.edit;
  if (!id) return;

  try {
    const res = await apiFetch(`/cotizaciones/${id}`);
    const cotizacion = await safeJson(res);

    document.querySelector('[data-basic="idpresupuesto"]').value = cotizacion.id || "";
    document.querySelector('[data-basic="titulo"]').value = cotizacion.titulo || "";
    document.querySelector('[data-basic="condicion_legal"]').value = cotizacion.condicion_legal || "";
    document.querySelector('[data-basic="creationfecha"]').value =
      cotizacion.fecha_creacion?.split("T")[0] || "";

  } catch (err) {
    console.error("Error cargando cotización:", err);
  }
});

/* =========================
   TOGGLE + SELECCIÓN ACTIVA
========================= */
document.addEventListener("click", async (e) => {

  const toggle = e.target.closest("[data-toggle]");
  if (!toggle) return;

  const id = toggle.dataset.toggle;
  if (!id) return;

  const body = document.getElementById(`quote-${id}`);
  if (!body) return;

  body.style.display =
    body.style.display === "none" ? "block" : "none";

  appState.activeQuoteId = id;

  // 🔥 cargar servicios reales desde backend
  await loadServicios();

  // 🔥 resaltar
  document.querySelectorAll(".quote-item").forEach(el =>
    el.classList.remove("quote-selected")
  );

  toggle.closest(".quote-item")?.classList.add("quote-selected");

  console.log("Cotización activa:", id);
});

/* =========================
   AUTOLOAD
========================= */
document.addEventListener("travelChanged", async () => {
  await loadQuotes();
});

document.addEventListener("DOMContentLoaded", async () => {
  if (appState.activeTravelId) {
    await loadQuotes();
  }
});

document.getElementById("btn-ver-viaje")?.addEventListener("click", async () => {
  if (!appState.activeTravelId) {
    alert("Seleccioná un viaje primero");
    return;
  }
  await loadQuotes();
});
