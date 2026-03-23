export function getActiveCotizacionId() {
  const input = document.querySelector('[data-basic="idpresupuesto"]');

  if (!input || !input.value) {
    alert("Debe ingresar ID de cotización");
    return null;
  }

  return input.value;
}

export function qs(sel) {
  return document.querySelector(sel);
}

export function val(key) {
  return document.querySelector(`[data-client="${key}"]`)?.value || "";
}

export function docVal(key) {
  return document.querySelector(`[data-doc="${key}"]`)?.value || "";
}
