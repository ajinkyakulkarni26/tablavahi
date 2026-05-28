import type { Composition } from "../types";
import { SAMPLE_COMPOSITIONS } from "../data/sampleData";
import type { QuickInsertBol } from "./transliteration";

const STORAGE_KEY = "tablavahi-compositions";
const USER_QUICK_INSERT_KEY = "tablavahi-user-quick-insert-bols";

export function loadCompositions(): Composition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveCompositions(SAMPLE_COMPOSITIONS);
      return [...SAMPLE_COMPOSITIONS];
    }
    const parsed = JSON.parse(raw) as Composition[];
    return Array.isArray(parsed) ? parsed : [...SAMPLE_COMPOSITIONS];
  } catch {
    return [...SAMPLE_COMPOSITIONS];
  }
}

export function saveCompositions(compositions: Composition[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(compositions));
}

export function upsertComposition(
  compositions: Composition[],
  composition: Composition,
): Composition[] {
  const index = compositions.findIndex((c) => c.id === composition.id);
  if (index >= 0) {
    const next = [...compositions];
    next[index] = composition;
    return next;
  }
  return [...compositions, composition];
}

export function deleteComposition(
  compositions: Composition[],
  id: string,
): Composition[] {
  return compositions.filter((c) => c.id !== id);
}

export function resetToSamples(): Composition[] {
  saveCompositions(SAMPLE_COMPOSITIONS);
  return [...SAMPLE_COMPOSITIONS];
}

export function loadUserQuickInsertBols(): QuickInsertBol[] {
  try {
    const raw = localStorage.getItem(USER_QUICK_INSERT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuickInsertBol[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (bol) =>
        typeof bol?.devanagari === "string" &&
        bol.devanagari.trim() &&
        typeof bol?.latin === "string",
    );
  } catch {
    return [];
  }
}

export function saveUserQuickInsertBols(bols: QuickInsertBol[]): void {
  localStorage.setItem(USER_QUICK_INSERT_KEY, JSON.stringify(bols));
}
