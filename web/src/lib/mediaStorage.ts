import { DEFAULT_DESIGN_ID } from "../data/tablaDesigns";
const DESIGN_KEY = "tablavahi-active-design";

export function loadActiveDesignId(): string {
  try {
    return localStorage.getItem(DESIGN_KEY) ?? DEFAULT_DESIGN_ID;
  } catch {
    return DEFAULT_DESIGN_ID;
  }
}

export function saveActiveDesignId(designId: string): void {
  localStorage.setItem(DESIGN_KEY, designId);
}
