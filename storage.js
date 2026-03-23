import { appState } from "./state.js";

const STORAGE_KEY = "travel_app_state_v1";

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

export function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    Object.assign(appState, JSON.parse(saved));
  } catch {
    console.warn("Estado inválido, se ignora");
  }
}