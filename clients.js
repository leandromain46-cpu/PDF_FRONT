import { qs, val } from "./dom.js";
import { appState, setActiveClientId } from "./state.js";
import {
  getClientes,
  getCliente,
  createCliente,
  deleteCliente,
  createClientDocument,
  getClientDocuments,
  deleteClientDocument,
} from "./api.js";

/********************************
INIT
*********************************/
document.addEventListener("DOMContentLoaded", async () => {
  await loadClients();
});

/********************************
LOAD CLIENTES
*********************************/
export async function loadClients() {
  const clients = await getClientes();

  const select = qs("[data-client-select]");
  if (!select) return;

  select.innerHTML = `<option value="">Seleccionar cliente</option>`;

  clients.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.nombre;
    select.appendChild(opt);
  });
}

/********************************
SELECT CLIENTE
*********************************/
document.addEventListener("change", async e => {
  const select = e.target.closest("[data-client-select]");
  if (!select) return;

  const id = Number(select.value);
  setActiveClientId(id);

  if (!id) {
    clearClientForm();
    document.dispatchEvent(new Event("client-selected"));
    return;
  }

  const client = await getCliente(id);

  fillClientForm(client);
  loadClientDocuments(id);

  document.dispatchEvent(new Event("travel-cleared"));
  document.dispatchEvent(new Event("client-selected"));
});

/********************************
GLOBAL CLICK HANDLER
*********************************/
document.addEventListener("click", async e => {
  /* NUEVO CLIENTE */
  if (e.target.closest("[data-client-new]")) {
    setActiveClientId(null);
    clearClientForm();
  }

  /* GUARDAR CLIENTE */
  if (e.target.closest("[data-client-save]")) {
    const payload = {
      nombre: val("name"),
      telefono: val("phone"),
      email: val("email"),
      notas: val("notes"),
      status: val("status"),
      location: val("location"),
      created_at: val("created")
    };

    const saved = await createCliente(payload);
    const clientId = saved.id || appState.activeClientId;

    setActiveClientId(clientId);

    await loadClients();
    qs("[data-client-select]").value = clientId;

    const full = await getCliente(clientId);
    fillClientForm(full);
  }

  /* ELIMINAR CLIENTE */
  if (e.target.closest("[data-client-delete]")) {
    if (!appState.activeClientId) return;
    if (!confirm("Eliminar cliente?")) return;

    await deleteCliente(appState.activeClientId);

    setActiveClientId(null);
    clearClientForm();
    loadClients();
  }

  /* GUARDAR DOCUMENTO */
  if (e.target.closest("[data-doc-save]")) {
    if (!appState.activeClientId) return alert("Seleccioná cliente");

    const formData = new FormData();
    formData.append("client_id", appState.activeClientId);
    formData.append("type", qs('[data-doc="type"]').value);
    formData.append("number", qs('[data-doc="number"]').value);
    formData.append("expiry", qs('[data-doc="expiry"]').value);
    formData.append("notes", qs('[data-doc="notes"]').value);

    const fileInput = qs('[data-doc="files"]');
    if (fileInput.files[0]) {
      formData.append("file", fileInput.files[0]);
    }

    await createClientDocument(formData);

    loadClientDocuments(appState.activeClientId);
    clearDocForm();
  }

  /* ELIMINAR DOCUMENTO */
  const deleteBtn = e.target.closest("[data-doc-delete]");
  if (deleteBtn) {
    if (!confirm("Eliminar documento?")) return;

    await deleteClientDocument(deleteBtn.dataset.docDelete);

    loadClientDocuments(appState.activeClientId);
  }
});

/********************************
DOCUMENTOS
*********************************/
async function loadClientDocuments(clientId) {
  const docs = await getClientDocuments(clientId);

  const list = qs("[data-doc-list]");
  if (!list) return;

  list.innerHTML = "";

  docs.forEach(d => {
    const div = document.createElement("div");

    div.innerHTML = `
      <div class="border p-2 mb-2">
        <strong>${d.type}</strong> - ${d.number}
        <button data-doc-delete="${d.id}">Eliminar</button>
      </div>
    `;

    list.appendChild(div);
  });
}

/********************************
FORM HELPERS
*********************************/
function fillClientForm(c) {
  set("id", c.id);
  set("name", c.nombre);
  set("phone", c.telefono);
  set("email", c.email);
  set("notes", c.notas);
  set("status", c.status);
  set("location", c.location);
  set("created", c.created_at);
}

function clearClientForm() {
  ["id", "name", "phone", "email", "notes", "status", "location", "created"].forEach(k =>
    set(k, "")
  );
}

function clearDocForm() {
  ["type", "number", "expiry", "notes"].forEach(k => {
    const el = qs(`[data-doc="${k}"]`);
    if (el) el.value = "";
  });
}

function set(key, value) {
  const el = document.querySelector(`[data-client="${key}"]`);
  if (el) el.value = value || "";
}