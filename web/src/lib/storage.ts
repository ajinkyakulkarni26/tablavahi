import type { Composition } from "../types";
import { SAMPLE_COMPOSITIONS } from "../data/sampleData";
import {
  findCompositionWhitespaceIssues,
  normalizeCompositions,
} from "./compositionNormalization";
import type { QuickInsertBol } from "./transliteration";
import { clampPracticeBpm, DEFAULT_PRACTICE_BPM } from "./practicePlayback";

const STORAGE_KEY = "tablavahi-compositions";
const USER_QUICK_INSERT_KEY = "tablavahi-user-quick-insert-bols";
const PRACTICE_BPM_KEY = "tablavahi-practice-bpm";
const PRACTICE_SOUND_KEY = "tablavahi-practice-sound";

function normalizeQuickInsertBols(bols: QuickInsertBol[]): QuickInsertBol[] {
  const seen = new Set<string>();
  return bols
    .map((bol) => ({
      devanagari: bol.devanagari.trim(),
      latin: bol.latin.trim(),
    }))
    .filter((bol) => {
      if (!bol.devanagari || seen.has(bol.devanagari)) return false;
      seen.add(bol.devanagari);
      return true;
    });
}

export function loadCompositions(): Composition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveCompositions(SAMPLE_COMPOSITIONS);
      return normalizeCompositions(SAMPLE_COMPOSITIONS);
    }
    const parsed = JSON.parse(raw) as Composition[];
    if (!Array.isArray(parsed)) {
      return normalizeCompositions(SAMPLE_COMPOSITIONS);
    }

    const normalized = normalizeCompositions(parsed);
    if (findCompositionWhitespaceIssues(parsed).length > 0) {
      saveCompositions(normalized);
    }
    return normalized;
  } catch {
    return normalizeCompositions(SAMPLE_COMPOSITIONS);
  }
}

export function saveCompositions(compositions: Composition[]): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalizeCompositions(compositions)),
  );
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
  return normalizeCompositions(SAMPLE_COMPOSITIONS);
}

export function loadUserQuickInsertBols(): QuickInsertBol[] {
  try {
    const raw = localStorage.getItem(USER_QUICK_INSERT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuickInsertBol[];
    if (!Array.isArray(parsed)) return [];

    const validBols = parsed.filter(
      (bol) =>
        typeof bol?.devanagari === "string" &&
        bol.devanagari.trim() &&
        typeof bol?.latin === "string",
    );
    const normalizedBols = normalizeQuickInsertBols(validBols);
    if (JSON.stringify(validBols) !== JSON.stringify(normalizedBols)) {
      saveUserQuickInsertBols(normalizedBols);
    }
    return normalizedBols;
  } catch {
    return [];
  }
}

export function saveUserQuickInsertBols(bols: QuickInsertBol[]): void {
  localStorage.setItem(
    USER_QUICK_INSERT_KEY,
    JSON.stringify(normalizeQuickInsertBols(bols)),
  );
}

export function loadPracticeBpm(): number {
  try {
    const raw = localStorage.getItem(PRACTICE_BPM_KEY);
    if (!raw) return DEFAULT_PRACTICE_BPM;
    return clampPracticeBpm(Number(raw));
  } catch {
    return DEFAULT_PRACTICE_BPM;
  }
}

export function savePracticeBpm(bpm: number): void {
  try {
    localStorage.setItem(PRACTICE_BPM_KEY, String(clampPracticeBpm(bpm)));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function loadPracticeSoundEnabled(): boolean {
  try {
    const raw = localStorage.getItem(PRACTICE_SOUND_KEY);
    if (raw === null) return true;
    return raw !== "false";
  } catch {
    return true;
  }
}

export function savePracticeSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(PRACTICE_SOUND_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore storage errors
  }
}
