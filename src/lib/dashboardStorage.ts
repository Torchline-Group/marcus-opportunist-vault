import type { DashboardState } from "./dashboardTypes";

const KEY = "opportunist_dashboard_state_v1";

export function loadDashboardState(): DashboardState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DashboardState;
  } catch {
    return null;
  }
}

export function saveDashboardState(state: DashboardState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function getDefaultState(): DashboardState {
  return {
    version: 1,
    ideas: [],
    stores: [],
    products: [],
    techProjects: [],
    ui: { mainTab: "dashboard" }
  };
}

