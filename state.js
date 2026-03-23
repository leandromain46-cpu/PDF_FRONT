export const appState = {
  activeClientId: null,
  activeTravelId: null
};

export function setActiveClientId(id) {
  appState.activeClientId = id;
  appState.activeTravelId = null;
}

export function setActiveTravelId(id) {
  appState.activeTravelId = id;
}
