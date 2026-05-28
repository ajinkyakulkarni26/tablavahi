import type { Composition } from "../types";
import { SAMPLE_COMPOSITIONS } from "../data/sampleData";

const STORAGE_KEY = "tablavahi-compositions";

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
