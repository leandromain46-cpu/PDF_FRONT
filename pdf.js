import { apiFetch } from "./api.js";
import { appState } from "./state.js";

/************************************************************
 * OBTENER COTIZACIÓN ACTIVA
 ************************************************************/
function getActiveCotizacionId() {
  return appState.activeQuoteId || null;
}

/************************************************************
 * GENERAR PDF (Railway + JWT seguro)
 ************************************************************/
document.addEventListener("click", async (e) => {
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
 * CARGAR SECCIONES PDF
 ************************************************************/
export async function loadPdfSections() {
  const id = getActiveCotizacionId();
  if (!id) return;

  try {
    const res = await apiFetch(`/pdf-sections/${id}`);
    const sections = await res.json();
    renderPdfSections(sections);
  } catch (err) {
    console.error("Error cargando secciones PDF", err);
  }
}

/************************************************************
 * CARGAR LISTA DE PDFs
 ************************************************************/
export async function loadPdfs(cotizacionId = null) {
  const id = cotizacionId || getActiveCotizacionId();
  if (!id) return;

  try {
    const res = await apiFetch(`/pdfs/${id}`);
    const pdfs = await res.json();
    renderPdfList(pdfs);
  } catch (err) {
    console.error("Error cargando PDFs", err);
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
      <strong>${section.title}</strong>
      <textarea rows="3" class="form-control" readonly>
${section.content}
      </textarea>
    `;

    container.appendChild(div);
  });
}

/************************************************************
 * RENDER LISTA PDF
 ************************************************************/
function renderPdfList(pdfs) {
  const container = document.querySelector("[data-pdf-list]");
  if (!container) return;

  container.innerHTML = "";

  pdfs.forEach(pdf => {
    const div = document.createElement("div");
    div.className =
      "pdf-item border rounded p-3 mb-2 d-flex justify-content-between align-items-center";

    div.innerHTML = `
      <div>
        <strong>${pdf.nombre || pdf.name}</strong>
        <div class="small text-muted">
          ${new Date(pdf.created_at || pdf.createdAt).toLocaleString()}
        </div>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary" data-pdf-view>
          Ver
        </button>
        <button class="btn btn-sm btn-outline-primary" data-pdf-download>
          Descargar
        </button>
      </div>
    `;

    container.appendChild(div);

    /* =========================
       VER PDF (seguro con JWT)
    ========================== */
    div.querySelector("[data-pdf-view]").addEventListener("click", async () => {
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

    /* =========================
       DESCARGAR PDF
    ========================== */
    div.querySelector("[data-pdf-download]").addEventListener("click", async () => {
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
