import { apiFetch } from "./api.js";
import { appState } from "./state.js";

/************************************************************
 * CONTEXTO ACTIVO
 ************************************************************/
function getActiveCotizacionId() {
  return appState.activeQuoteId || null;
}

/************************************************************
 * INIT
 ************************************************************/
document.addEventListener("DOMContentLoaded", async () => {
  await syncPdfContext();
});

/************************************************************
 * EVENTOS DE CONTEXTO
 ************************************************************/
document.addEventListener("travel-selected", async () => {
  await syncPdfContext();
});

document.addEventListener("travel-cleared", () => {
  resetPdfUI();
});

document.addEventListener("client-selected", () => {
  if (!appState.activeTravelId || !appState.activeQuoteId) {
    resetPdfUI();
  }
});

document.addEventListener("travel-saved", async () => {
  if (!appState.activeTravelId || !appState.activeQuoteId) return;
  await syncPdfContext();
});

document.addEventListener("quote-tab-changed", async () => {
  if (!appState.activeTravelId || !appState.activeQuoteId) return;
  await syncPdfContext();
});

/************************************************************
 * GENERAR PDF
 ************************************************************/
document.addEventListener("click", async e => {
  const btn = e.target.closest("[data-pdf-generate]");
  if (!btn) return;

  const type = btn.dataset.pdfType || "partial";
  const cotizacionId = getActiveCotizacionId();

  if (!cotizacionId) {
    alert("No hay cotización activa seleccionada.");
    return;
  }

  try {
    const res = await apiFetch(
      `/pdfs/${type}?cotizacion_id=${cotizacionId}`,
      { method: "GET" }
    );

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    window.open(url, "_blank");
  } catch (err) {
    console.error("Error generando PDF", err);
    alert("No se pudo generar el PDF.");
  }
});

/************************************************************
 * SYNC CONTEXTO
 ************************************************************/
async function syncPdfContext() {
  const cotizacionId = getActiveCotizacionId();

  if (!cotizacionId) {
    resetPdfUI();
    return;
  }

  await Promise.all([
    loadPdfSections(cotizacionId),
    loadPdfs(cotizacionId)
  ]);
}

/************************************************************
 * CARGAR SECCIONES PDF
 ************************************************************/
export async function loadPdfSections(cotizacionId = null) {
  const id = cotizacionId || getActiveCotizacionId();
  const container = document.querySelector("[data-pdf-sections-list]");

  if (!container) return;

  if (!id) {
    renderPdfSectionsEmpty("Seleccioná una cotización para ver las secciones del PDF.");
    return;
  }

  try {
    const res = await apiFetch(`/pdf-sections/${id}`);
    const sections = await res.json();

    if (!Array.isArray(sections) || !sections.length) {
      renderPdfSectionsEmpty("No hay secciones configuradas para esta cotización.");
      return;
    }

    renderPdfSections(sections);
  } catch (err) {
    console.error("Error cargando secciones PDF", err);
    renderPdfSectionsEmpty("No se pudieron cargar las secciones del PDF.");
  }
}

/************************************************************
 * CARGAR LISTA DE PDFs
 ************************************************************/
export async function loadPdfs(cotizacionId = null) {
  const id = cotizacionId || getActiveCotizacionId();

  if (!id) {
    renderPdfListEmpty("Seleccioná una cotización para ver los PDFs generados.");
    return;
  }

  try {
    const res = await apiFetch(`/pdfs/${id}`);
    const pdfs = await res.json();

    if (!Array.isArray(pdfs) || !pdfs.length) {
      renderPdfListEmpty("Todavía no hay PDFs generados para esta cotización.");
      return;
    }

    renderPdfList(pdfs);
  } catch (err) {
    console.error("Error cargando PDFs", err);
    renderPdfListEmpty("No se pudo cargar la lista de PDFs.");
  }
}

/************************************************************
 * RENDER SECCIONES
 ************************************************************/
function renderPdfSections(sections) {
  const container = document.querySelector("[data-pdf-sections-list]");
  if (!container) return;

  container.innerHTML = "";

  sections.forEach(section => {
    const div = document.createElement("div");
    div.className = "pdf-section border rounded p-2 mb-2";

    div.innerHTML = `
      <strong>${escapeHtml(section.title || "Sección")}</strong>
      <textarea rows="3" class="form-control mt-2" readonly>${escapeHtml(section.content || "")}</textarea>
    `;

    container.appendChild(div);
  });
}

function renderPdfSectionsEmpty(message) {
  const container = document.querySelector("[data-pdf-sections-list]");
  if (!container) return;

  container.innerHTML = `
    <div class="border rounded p-3 text-muted small">
      ${escapeHtml(message)}
    </div>
  `;
}

/************************************************************
 * RENDER LISTA PDF
 ************************************************************/
function renderPdfList(pdfs) {
  const container = getPdfListContainer();
  if (!container) return;

  container.innerHTML = "";

  pdfs.forEach(pdf => {
    const div = document.createElement("div");
    div.className =
      "pdf-item border rounded p-3 mb-2 d-flex justify-content-between align-items-center flex-wrap gap-3";

    div.innerHTML = `
      <div>
        <strong>${escapeHtml(pdf.nombre || pdf.name || "Documento PDF")}</strong>
        <div class="small text-muted">
          ${escapeHtml(formatDateTime(pdf.created_at || pdf.createdAt))}
        </div>
      </div>

      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-sm btn-outline-secondary" data-pdf-view>
          Ver
        </button>
        <button class="btn btn-sm btn-outline-primary" data-pdf-download>
          Descargar
        </button>
      </div>
    `;

    container.appendChild(div);

    div.querySelector("[data-pdf-view]")?.addEventListener("click", async () => {
      try {
        const res = await apiFetch(`/pdfs/latest/${pdf.cotizacion_id}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } catch (err) {
        console.error("Error viendo PDF", err);
        alert("Error abriendo PDF");
      }
    });

    div.querySelector("[data-pdf-download]")?.addEventListener("click", async () => {
      try {
        const res = await apiFetch(`/pdfs/latest/${pdf.cotizacion_id}`);
        const blob = await res.blob();

        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = pdf.nombre || pdf.name || "documento.pdf";
        a.click();
      } catch (err) {
        console.error("Error descargando PDF", err);
        alert("Error descargando PDF");
      }
    });
  });
}

function renderPdfListEmpty(message) {
  const container = getPdfListContainer();
  if (!container) return;

  container.innerHTML = `
    <div class="border rounded p-3 text-muted small">
      ${escapeHtml(message)}
    </div>
  `;
}

/************************************************************
 * CONTENEDOR DINÁMICO PDF LIST
 ************************************************************/
function getPdfListContainer() {
  let container = document.querySelector("[data-pdf-runtime-list]");
  if (container) return container;

  const managementSection = document.querySelector("[data-pdf-management]");
  if (!managementSection) return null;

  container = document.createElement("div");
  container.className = "mt-3";
  container.setAttribute("data-pdf-runtime-list", "");

  managementSection.appendChild(container);
  return container;
}

/************************************************************
 * RESET UI
 ************************************************************/
function resetPdfUI() {
  renderPdfSectionsEmpty("Seleccioná una cotización para ver las secciones del PDF.");
  renderPdfListEmpty("Seleccioná una cotización para ver los PDFs generados.");
}

/************************************************************
 * HELPERS
 ************************************************************/
function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}