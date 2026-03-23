import { apiFetch } from "./api.js";
import { appState } from "./state.js";

/************************************************************
 * CARGAR SERVICIOS DESDE BACKEND
 ************************************************************/
export async function loadServicios() {

  if (!appState.activeQuoteId) return;

  try {

    const res = await apiFetch(
      `/servicios/cotizacion/${appState.activeQuoteId}`
    );

    const servicios = await res.json();

    // 🔥 limpiar todas las listas
    document.querySelectorAll(".services-list")
      .forEach(el => el.innerHTML = "");

    const template = document.getElementById("service-template");
    if (!template) return;

    servicios.forEach(servicio => {

      const category = document.querySelector(
        `[data-category="${servicio.categoria}"]`
      );

      if (!category) return;

      const list = category.querySelector(".services-list");
      if (!list) return;

      const node = template.content.cloneNode(true);
      const card = node.querySelector(".service-card");

      // rellenar campos básicos
      card.querySelector('[data-field="tipo"]').value = servicio.tipo || "";
      card.querySelector('[data-field="descripcion"]').value = servicio.descripcion || "";
      card.querySelector('[data-field="observaciones"]').value = servicio.observaciones || "";
      card.querySelector('[data-field="moneda"]').value = servicio.moneda || "USD";
      card.querySelector('[data-field="precio"]').value = servicio.precio || 0;
      card.querySelector('[data-field="adultos"]').value = servicio.adultos || 0;
      card.querySelector('[data-field="menores"]').value = servicio.menores || 0;
      card.querySelector('[data-field="subtotal"]').value = servicio.subtotal || 0;

      // mostrar bloque específico correcto
      card.querySelectorAll(".service-specific")
        .forEach(div => div.classList.add("hidden"));

      const specific = card.querySelector(
        `.service-specific[data-specific="${servicio.tipo}"]`
      );

      if (specific) {
        specific.classList.remove("hidden");

        if (servicio.metadata) {
          specific.querySelectorAll("input, select").forEach(input => {
            if (input.name && servicio.metadata[input.name] !== undefined) {
              input.value = servicio.metadata[input.name];
            }
          });
        }
      }

      // botón eliminar
      card.querySelector("[data-remove]").addEventListener("click", () => {
        card.remove();
        updateTotals();
      });

      // recalcular en vivo
      card.querySelectorAll('[data-field="precio"], [data-field="adultos"], [data-field="menores"]')
        .forEach(input => {
          input.addEventListener("input", () => {
            updateServiceSubtotal(card);
            updateTotals();
          });
        });

      list.appendChild(node);

    });

    updateTotals();

    console.log("Servicios cargados:", servicios.length);

  } catch (err) {
    console.error("Error cargando servicios:", err);
  }
}


/************************************************************
 * FUNCIONES COPIADAS PARA REUSO
 ************************************************************/
function updateServiceSubtotal(serviceEl) {
  const precio = Number(serviceEl.querySelector('[data-field="precio"]')?.value || 0);
  const adultos = Number(serviceEl.querySelector('[data-field="adultos"]')?.value || 0);
  const menores = Number(serviceEl.querySelector('[data-field="menores"]')?.value || 0);

  const subtotal = precio * (adultos + menores);
  const subtotalInput = serviceEl.querySelector('[data-field="subtotal"]');

  if (subtotalInput) {
    subtotalInput.value = subtotal.toFixed(2);
  }
}

function updateTotals() {
  const totals = {};

  document.querySelectorAll("[data-category]").forEach(category => {
    const key = category.dataset.category;
    let sum = 0;

    category.querySelectorAll('[data-field="subtotal"]').forEach(input => {
      sum += Number(input.value || 0);
    });

    totals[key] = sum;

    const totalEl = document.querySelector(`[data-total-category="${key}"]`);
    if (totalEl) {
      totalEl.textContent = `USD ${sum.toFixed(2)}`;
    }
  });

  const totalGeneral = Object.values(totals)
    .reduce((acc, n) => acc + n, 0);

  const totalGeneralEl = document.querySelector("[data-total-general]");
  if (totalGeneralEl) {
    totalGeneralEl.textContent = `USD ${totalGeneral.toFixed(2)}`;
  }
}
