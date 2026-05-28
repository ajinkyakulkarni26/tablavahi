import type { BeatMarker, CompositionLine, MatraCell, Taal } from "../types";

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
      return taaliNumber != null ? String(taaliNumber) : "२";
    default:
      return "";
  }
}

/** Apply taal's default sam / khali / taali markers to a row of empty cells */
export function applyTaalMarkers(cells: MatraCell[], taal: Taal): MatraCell[] {
  return cells.map((cell, index) => {
    const matra = index + 1;
    if (matra === taal.samMatra) {
      return { ...cell, marker: "sam", taaliNumber: undefined };
    }
    if (matra === taal.khaliMatra) {
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
