import type { Composition, CompositionLine } from "../types";

export type CompositionWhitespaceIssue = {
  compositionId: string;
  compositionTitle: string;
  lineIndex: number;
  cellIndex: number;
  value: string;
  trimmedValue: string;
};

function trimOptional(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function normalizeCompositionLines(
  sourceLines: CompositionLine[],
): CompositionLine[] {
  return sourceLines.map((line) => ({
    ...line,
    sectionTitle: trimOptional(line.sectionTitle),
    cells: line.cells.map((cell) => ({
      ...cell,
      devanagari: cell.devanagari.trim(),
    })),
  }));
}

export function normalizeComposition(composition: Composition): Composition {
  return {
    ...composition,
    title: composition.title.trim(),
    titleDevanagari: trimOptional(composition.titleDevanagari),
    lines: normalizeCompositionLines(composition.lines),
    notes: trimOptional(composition.notes),
    guruNote: trimOptional(composition.guruNote),
  };
}

export function normalizeCompositions(
  compositions: Composition[],
): Composition[] {
  return compositions.map(normalizeComposition);
}

export function findCompositionWhitespaceIssues(
  compositions: Composition[],
): CompositionWhitespaceIssue[] {
  return compositions.flatMap((composition) =>
    composition.lines.flatMap((line, lineIndex) =>
      line.cells.flatMap((cell, cellIndex) => {
        const trimmedValue = cell.devanagari.trim();
        if (cell.devanagari === trimmedValue) return [];
        return [
          {
            compositionId: composition.id,
            compositionTitle:
              composition.title.trim() ||
              composition.titleDevanagari?.trim() ||
              composition.id,
            lineIndex,
            cellIndex,
            value: cell.devanagari,
            trimmedValue,
          },
        ];
      }),
    ),
  );
}
