import type { BeatMarker, CompositionLine, MatraCell, Taal } from "../types";

export interface VibhagCellGroup<T> {
  cells: T[];
  startIndex: number;
  isLast: boolean;
}

export const MAX_LINE_CYCLES = 12;

/** Display symbol for beat markers (traditional notation style) */
export function markerSymbol(
  marker: BeatMarker | undefined,
  taaliNumber?: number,
): string {
  if (!marker) return "";
  switch (marker) {
    case "sam":
      return "×";
    case "khali":
      return "०";
    case "taali":
      return taaliNumber != null ? String(taaliNumber) : "1";
    default:
      return "";
  }
}

/** Apply taal's default sam / khali / taali markers to a row of empty cells */
export function applyTaalMarkers(cells: MatraCell[], taal: Taal): MatraCell[] {
  return cells.map((cell, index) => {
    const matra = (index % taal.matras) + 1;
    if (matra === taal.samMatra) {
      return { ...cell, marker: "sam", taaliNumber: undefined };
    }
    if (taal.khaliMatras.includes(matra)) {
      return { ...cell, marker: "khali", taaliNumber: undefined };
    }
    const taaliIndex = taal.taaliMatras.indexOf(matra);
    if (taaliIndex >= 0) {
      return {
        ...cell,
        marker: "taali",
        taaliNumber: taaliIndex + 2,
      };
    }
    return { ...cell, marker: undefined, taaliNumber: undefined };
  });
}

export function emptyLine(matras: number): MatraCell[] {
  return Array.from({ length: matras }, () => ({ devanagari: "" }));
}

export function newLineForTaal(taal: Taal): CompositionLine {
  return { cells: applyTaalMarkers(emptyLine(taal.matras), taal) };
}

export function lineCycleOptions(
  currentCycles: number,
  maxCycles = MAX_LINE_CYCLES,
): number[] {
  return Array.from(
    new Set([
      ...Array.from({ length: maxCycles }, (_, index) => index + 1),
      Math.max(1, currentCycles),
    ]),
  ).sort((a, b) => a - b);
}

export function groupCellsByVibhag<T>(
  cells: T[],
  taal: Taal,
): VibhagCellGroup<T>[] {
  const groups: Omit<VibhagCellGroup<T>, "isLast">[] = [];
  let startIndex = 0;

  while (startIndex < cells.length) {
    for (const size of taal.vibhag) {
      if (startIndex >= cells.length) break;
      const endIndex = Math.min(startIndex + size, cells.length);
      groups.push({
        cells: cells.slice(startIndex, endIndex),
        startIndex,
      });
      startIndex = endIndex;
    }
  }

  return groups.map((group, index) => ({
    ...group,
    isLast: index === groups.length - 1,
  }));
}
