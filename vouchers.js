import { apiFetch } from "./api.js";
import { appState } from "./state.js";

/* =========================================
INIT
========================================= */
document.addEventListener("DOMContentLoaded", () => {
  resetVouchersUI();
});

/* =========================================
EVENTOS DE CONTEXTO
========================================= */
document.addEventListener("travel-selected", async () => {
  await loadVouchersByTravel();
});

document.addEventListener("travel-cleared", () => {
  resetVouchersUI();
});

document.addEventListener("client-selected", () => {
  if (!appState.activeTravelId) {
    resetVouchersUI();
  }
});

/* =========================================
EVENTOS UI
========================================= */
document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-voucher-add]")) {
    e.preventDefault();
    addEmptyVoucherCard();
    return;
  }

  const saveBtn = e.target.closest("[data-voucher-save]");
  if (saveBtn) {
    e.preventDefault();

    if (!appState.activeTravelId) {
      alert("Seleccioná un viaje primero");
      return;
    }

    const card = saveBtn.closest("[data-voucher-card]");
    if (!card) return;

    await saveVoucherCard(card);
    return;
  }

  const deleteBtn = e.target.closest("[data-voucher-delete]");
  if (deleteBtn) {
    e.preventDefault();

    const card = deleteBtn.closest("[data-voucher-card]");
    if (!card) return;

    await deleteVoucherCard(card);
    return;
  }

  const deleteFileBtn = e.target.closest("[data-voucher-file-delete]");
  if (deleteFileBtn) {
    e.preventDefault();

    const fileId = deleteFileBtn.getAttribute("data-voucher-file-delete");
    if (!fileId) return;

    await deleteVoucherFileRecord(fileId);
  }
});

/* =========================================
CARGAR POR VIAJE
========================================= */
async function loadVouchersByTravel() {
  if (!appState.activeTravelId) {
    resetVouchersUI();
    return;
  }

  try {
    const res = await apiFetch(`/vouchers/viaje/${appState.activeTravelId}`, {
      method: "GET"
    });

    const vouchers = await safeJson(res);

    if (!Array.isArray(vouchers) || !vouchers.length) {
      resetVouchersUI();
      return;
    }

    renderVouchers(vouchers);
  } catch (err) {
    console.error("LOAD VOUCHERS ERROR:", err);
    resetVouchersUI();
  }
}

/* =========================================
SAVE
========================================= */
async function saveVoucherCard(card) {
  try {
    const payload = getVoucherPayloadFromCard(card);

    if (!payload.tipo) {
      alert("Completá el tipo");
      return;
    }

    const recordId = getVoucherCardId(card);
    let saved;

    if (recordId) {
      const res = await apiFetch(`/vouchers/${recordId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      saved = await safeJson(res);
    } else {
      const res = await apiFetch("/vouchers", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      saved = await safeJson(res);
    }

    if (!saved?.id) {
      throw new Error("No se pudo guardar el voucher");
    }

    setVoucherCardId(card, saved.id);

    const filesInput = card.querySelector('[data-voucher="files"]');
    if (filesInput?.files?.length) {
      await uploadVoucherFiles(saved.id, filesInput.files);
    }

    await loadVouchersByTravel();
    alert("Voucher guardado");
  } catch (err) {
    console.error("SAVE VOUCHER ERROR:", err);
    alert("Error guardando voucher");
  }
}

/* =========================================
DELETE
========================================= */
async function deleteVoucherCard(card) {
  try {
    const id = getVoucherCardId(card);

    if (!id) {
      card.remove();
      toggleVoucherEmptyState();
      return;
    }

    const ok = confirm("¿Eliminar voucher?");
    if (!ok) return;

    await apiFetch(`/vouchers/${id}`, {
      method: "DELETE"
    });

    await loadVouchersByTravel();
    alert("Voucher eliminado");
  } catch (err) {
    console.error("DELETE VOUCHER ERROR:", err);
    alert("Error eliminando voucher");
  }
}

async function deleteVoucherFileRecord(fileId) {
  try {
    const ok = confirm("¿Eliminar archivo?");
    if (!ok) return;

    await apiFetch(`/vouchers/files/${fileId}`, {
      method: "DELETE"
    });

    await loadVouchersByTravel();
    alert("Archivo eliminado");
  } catch (err) {
    console.error("DELETE VOUCHER FILE ERROR:", err);
    alert("Error eliminando archivo");
  }
}

/* =========================================
UPLOAD FILES
========================================= */
async function uploadVoucherFiles(voucherId, filesList) {
  const form = new FormData();

  Array.from(filesList).forEach(file => {
    form.append("files", file);
  });

  const token = localStorage.getItem("auth_token") || localStorage.getItem("token");

  const res = await fetch(buildApiUrl(`/vouchers/${voucherId}/files`), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form
  });

  if (!res.ok) {
    let message = "Error subiendo archivos";
    try {
      const data = await res.json();
      message = data?.error || message;
    } catch {}
    throw new Error(message);
  }

  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("application/json") ? res.json() : null;
}

/* =========================================
RENDER
========================================= */
function renderVouchers(vouchers = []) {
  const list = getVoucherListEl();
  if (!list) return;

  list.innerHTML = "";

  vouchers.forEach(voucher => {
    const card = createVoucherCard(voucher);
    list.appendChild(card);
  });

  toggleVoucherEmptyState();
}

function addEmptyVoucherCard() {
  const list = getVoucherListEl();
  if (!list) return;

  const card = createVoucherCard();
  list.prepend(card);
  toggleVoucherEmptyState();
}

function createVoucherCard(data = {}) {
  const template = document.querySelector("#voucher-template");

  let card;
  if (template?.content?.firstElementChild) {
    card = template.content.firstElementChild.cloneNode(true);
  } else {
    card = document.createElement("div");
    card.className = "card p-3 mb-3";
    card.setAttribute("data-voucher-card", "");
    card.innerHTML = fallbackVoucherTemplate();
  }

  hydrateVoucherCard(card, data);
  return card;
}

function hydrateVoucherCard(card, data = {}) {
  setVoucherCardId(card, data.id || "");
  setVoucherField(card, "tipo", data.tipo || "");
  setVoucherField(card, "servicio", data.servicio || "");
  setVoucherField(card, "proveedor", data.proveedor || "");
  setVoucherField(card, "fecha_asociada", formatDateForInput(data.fecha_asociada));
  setVoucherField(card, "notes", data.notes || "");

  const visibleEl = card.querySelector('[data-voucher="visible_cliente"]');
  if (visibleEl) {
    visibleEl.value = String(Number(data.visible_cliente || 0));
  }

  renderVoucherFiles(card, data.files || []);
}

function renderVoucherFiles(card, files = []) {
  const wrap = card.querySelector("[data-voucher-files-list]");
  if (!wrap) return;

  wrap.innerHTML = "";

  if (!files.length) {
    wrap.innerHTML = `<div class="small text-muted">Sin archivos adjuntos</div>`;
    return;
  }

  files.forEach(file => {
    const item = document.createElement("div");
    item.className = "d-flex align-items-center justify-content-between gap-2 border rounded px-2 py-1 mb-2";
    item.innerHTML = `
      <a href="${normalizeUploadPath(file.file_path)}" target="_blank" class="small text-decoration-none">
        ${escapeHtml(file.original_name || file.stored_name || "archivo")}
      </a>
      <button type="button" class="btn btn-sm btn-outline-danger" data-voucher-file-delete="${file.id}">
        Eliminar archivo
      </button>
    `;
    wrap.appendChild(item);
  });
}

/* =========================================
FORM HELPERS
========================================= */
function getVoucherPayloadFromCard(card) {
  return {
    viaje_id: Number(appState.activeTravelId),
    tipo: getVoucherField(card, "tipo"),
    servicio: getVoucherField(card, "servicio") || null,
    proveedor: getVoucherField(card, "proveedor") || null,
    fecha_asociada: getVoucherField(card, "fecha_asociada") || null,
    visible_cliente: Number(getVoucherField(card, "visible_cliente") || 0),
    notes: getVoucherField(card, "notes") || null
  };
}

function getVoucherField(card, key) {
  const el = card.querySelector(`[data-voucher="${key}"]`);
  if (!el) return "";
  return el.value || "";
}

function setVoucherField(card, key, value) {
  const el = card.querySelector(`[data-voucher="${key}"]`);
  if (el) {
    el.value = value ?? "";
  }
}

function getVoucherCardId(card) {
  return card.getAttribute("data-voucher-id") || "";
}

function setVoucherCardId(card, value) {
  card.setAttribute("data-voucher-id", value || "");
}

/* =========================================
UI HELPERS
========================================= */
function resetVouchersUI() {
  const list = getVoucherListEl();
  if (list) list.innerHTML = "";
  toggleVoucherEmptyState();
}

function toggleVoucherEmptyState() {
  const list = getVoucherListEl();
  const empty = document.querySelector("[data-voucher-empty]");

  if (!list || !empty) return;

  empty.style.display = list.children.length ? "none" : "";
}

function getVoucherListEl() {
  return document.querySelector("[data-vouchers-list]");
}

/* =========================================
UTILS
========================================= */
async function safeJson(res) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return res.json();
}

function formatDateForInput(value) {
  if (!value) return "";
  const raw = String(value);
  if (raw.includes("T")) return raw.split("T")[0];
  if (raw.includes(" ")) return raw.split(" ")[0];
  return raw;
}

function buildApiUrl(path) {
  const base =
    window.API_BASE ||
    localStorage.getItem("api_base") ||
    `${window.location.protocol}//${window.location.hostname}:3000/api`;

  return `${base}${path}`;
}

function normalizeUploadPath(filePath = "") {
  if (!filePath) return "#";

  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }

  const apiBase = buildApiUrl("");
  const origin = apiBase.replace(/\/api\/?$/, "");

  return `${origin}/${String(filePath).replace(/^\/+/, "")}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fallbackVoucherTemplate() {
  return `
    <div class="row g-3">
      <div class="col-md-4">
        <label class="form-label">Tipo</label>
        <input class="form-control" data-voucher="tipo" placeholder="Voucher hotel / Pasaje aéreo / Tren..." />
      </div>
      <div class="col-md-4">
        <label class="form-label">Servicio</label>
        <input class="form-control" data-voucher="servicio" placeholder="Detalle del servicio" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Proveedor</label>
        <input class="form-control" data-voucher="proveedor" placeholder="Proveedor" />
      </div>

      <div class="col-md-4">
        <label class="form-label">Fecha asociada</label>
        <input type="date" class="form-control" data-voucher="fecha_asociada" />
      </div>
      <div class="col-md-4">
        <label class="form-label">Visible cliente</label>
        <select class="form-select" data-voucher="visible_cliente">
          <option value="0">No</option>
          <option value="1">Sí</option>
        </select>
      </div>
      <div class="col-md-4">
        <label class="form-label">Adjuntos</label>
        <input type="file" class="form-control" data-voucher="files" multiple />
      </div>

      <div class="col-12">
        <label class="form-label">Notas</label>
        <textarea class="form-control" rows="3" data-voucher="notes"></textarea>
      </div>

      <div class="col-12">
        <div data-voucher-files-list></div>
      </div>

      <div class="col-12 d-flex gap-2">
        <button type="button" class="btn btn-primary" data-voucher-save>Guardar voucher</button>
        <button type="button" class="btn btn-outline-danger" data-voucher-delete>Eliminar</button>
      </div>
    </div>
  `;
}