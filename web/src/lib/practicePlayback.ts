import type {
  Composition,
  CompositionKind,
  CompositionLine,
  CompositionLineSection,
  MatraCell,
  Taal,
} from "../types";
import { COMPOSITION_KIND_LABELS } from "../types";
import { mainSectionLabelForKind } from "./exportText";
import { compositionLineSectionLabels } from "./lineSections";

export const DEFAULT_PRACTICE_BPM = 96;
export const MIN_PRACTICE_BPM = 24;
export const MAX_PRACTICE_BPM = 360;
export const DEFAULT_CUE_BEATS = 4;

export const PRACTICE_BPM_PRESETS = [
  { bpm: 60, label: "Vilambit" },
  { bpm: 80, label: "ek-gun" },
  { bpm: 96, label: "Madhya" },
  { bpm: 120, label: "Steady" },
  { bpm: 144, label: "Tej" },
  { bpm: 160, label: "Drut" },
] as const;

export interface PracticeLineItem {
  /** Index in the ordered practice sequence */
  sequenceIndex: number;
  /** Original line index in composition.lines */
  sourceLineIndex: number;
  /** Display heading for this line/section */
  label: string;
  /** Structural section type */
  section?: CompositionLineSection;
  /** Whether this line begins a new named section */
  isSectionStart: boolean;
  /** Matra cells in this line */
  cells: MatraCell[];
  /** Global beat index where this line starts (inclusive) */
  startBeat: number;
  /** Global beat index where this line ends (exclusive) */
  endBeat: number;
}

export interface PracticeSequence {
  lines: PracticeLineItem[];
  totalBeats: number;
}

export interface PracticeBeatPosition {
  globalBeatIndex: number;
  lineSequenceIndex: number;
  cellIndex: number;
  matraInLine: number;
  matraInCycle: number;
  cycleInLine: number;
  totalCyclesInLine: number;
  cell: MatraCell;
  line: PracticeLineItem;
}

export type PracticeTimelineSnapshot =
  | {
      phase: "cue";
      cueNumber: number;
      cueBeatIndex: number;
      cueTotalBeats: number;
      beatProgress: number;
    }
  | {
      phase: "playing";
      globalBeatIndex: number;
      beatProgress: number;
      loopIteration: number;
      position: PracticeBeatPosition;
    }
  | {
      phase: "completed";
      totalBeats: number;
    };

export function clampPracticeBpm(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PRACTICE_BPM;
  return Math.min(MAX_PRACTICE_BPM, Math.max(MIN_PRACTICE_BPM, Math.round(value)));
}

export function beatDurationMs(bpm: number): number {
  const safeBpm = clampPracticeBpm(bpm);
  return 60_000 / safeBpm;
}

export function cyclesPerMinute(bpm: number, taalMatras: number): number {
  if (taalMatras <= 0) return 0;
  return clampPracticeBpm(bpm) / taalMatras;
}

export function formatCyclesPerMinute(bpm: number, taalMatras: number): string {
  const cycles = cyclesPerMinute(bpm, taalMatras);
  if (Number.isInteger(cycles)) return String(cycles);
  const rounded = Number(cycles.toFixed(1));
  return String(rounded);
}

export function formatDurationSeconds(totalBeats: number, bpm: number): string {
  if (totalBeats <= 0) return "0s";
  const totalSeconds = (totalBeats * 60) / clampPracticeBpm(bpm);
  if (totalSeconds < 60) {
    const rounded = Number(totalSeconds.toFixed(1));
    return `${rounded}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (seconds === 60) {
    return `${minutes + 1}m 0s`;
  }
  return `${minutes}m ${seconds}s`;
}

function sectionPlayRank(
  kind: CompositionKind,
  section: CompositionLineSection | undefined,
): number {
  if (kind === "kayda" || kind === "rela") {
    if (section === "kayda") return 0;
    if (section === "prakaar") return 1;
    if (section === "tihai") return 2;
    return 1;
  }
  if (kind === "tukda") {
    if (section === "tukda") return 0;
    if (section === "chakradar") return 1;
    if (section === "tihai") return 2;
    return 1;
  }
  return 0;
}

function lineHasAnyBol(line: CompositionLine): boolean {
  return line.cells.some((cell) => cell.devanagari.trim().length > 0);
}

/**
 * Builds the ordered start-to-end lyric/practice sequence for a composition.
 * For Kayda/Rela compositions, guarantees Main Kayda/Rela -> Prakaars -> Tihai order
 * while preserving relative order of lines within each section.
 */
export function buildPracticeSequence(
  composition: Composition,
  _taal?: Taal,
): PracticeSequence {
  const nonEmptyEntries = composition.lines
    .map((line, sourceLineIndex) => ({ line, sourceLineIndex }))
    .filter(({ line }) => line.cells.length > 0);

  const hasSpokenLines = nonEmptyEntries.some(({ line }) => lineHasAnyBol(line));
  const filteredEntries = hasSpokenLines
    ? nonEmptyEntries.filter(({ line }) => lineHasAnyBol(line))
    : nonEmptyEntries;

  const orderedEntries = [...filteredEntries].sort((a, b) => {
    const rankDiff =
      sectionPlayRank(composition.kind, a.line.section) -
      sectionPlayRank(composition.kind, b.line.section);
    if (rankDiff !== 0) return rankDiff;
    return a.sourceLineIndex - b.sourceLineIndex;
  });

  const mainLabel = mainSectionLabelForKind(composition.kind);
  const rawLabels = compositionLineSectionLabels(
    orderedEntries.map((entry) => entry.line),
    mainLabel,
  );

  let runningBeat = 0;
  const items: PracticeLineItem[] = orderedEntries.map((entry, sequenceIndex) => {
    const fallbackLabel =
      orderedEntries.length === 1
        ? COMPOSITION_KIND_LABELS[composition.kind]
        : `Line ${sequenceIndex + 1}`;
    const label = rawLabels[sequenceIndex] || fallbackLabel;
    const prevLabel = sequenceIndex > 0 ? (rawLabels[sequenceIndex - 1] || "") : "";
    const isSectionStart =
      sequenceIndex === 0 || label !== (prevLabel || `Line ${sequenceIndex}`);

    const startBeat = runningBeat;
    const endBeat = startBeat + entry.line.cells.length;
    runningBeat = endBeat;

    return {
      sequenceIndex,
      sourceLineIndex: entry.sourceLineIndex,
      label,
      section: entry.line.section,
      isSectionStart,
      cells: entry.line.cells,
      startBeat,
      endBeat,
    };
  });

  return {
    lines: items,
    totalBeats: runningBeat,
  };
}

export function resolvePracticeBeatPosition(
  sequence: PracticeSequence,
  taal: Taal,
  globalBeatIndex: number,
): PracticeBeatPosition | null {
  if (
    sequence.lines.length === 0 ||
    globalBeatIndex < 0 ||
    globalBeatIndex >= sequence.totalBeats
  ) {
    return null;
  }

  const line = sequence.lines.find(
    (item) => globalBeatIndex >= item.startBeat && globalBeatIndex < item.endBeat,
  );
  if (!line) return null;

  const cellIndex = globalBeatIndex - line.startBeat;
  const cell = line.cells[cellIndex];
  if (!cell) return null;

  const safeTaalMatras = Math.max(1, taal.matras);
  const matraInCycle = (cellIndex % safeTaalMatras) + 1;
  const cycleInLine = Math.floor(cellIndex / safeTaalMatras) + 1;
  const totalCyclesInLine = Math.max(
    1,
    Math.ceil(line.cells.length / safeTaalMatras),
  );

  return {
    globalBeatIndex,
    lineSequenceIndex: line.sequenceIndex,
    cellIndex,
    matraInLine: cellIndex + 1,
    matraInCycle,
    cycleInLine,
    totalCyclesInLine,
    cell,
    line,
  };
}

/**
 * Resolves exact timeline state at `elapsedMs` from session start (including cue beats).
 */
export function resolvePracticeTimeline(params: {
  elapsedMs: number;
  bpm: number;
  cueBeats?: number;
  sequence: PracticeSequence;
  taal: Taal;
  loop?: boolean;
}): PracticeTimelineSnapshot {
  const {
    elapsedMs,
    bpm,
    cueBeats = DEFAULT_CUE_BEATS,
    sequence,
    taal,
    loop = false,
  } = params;

  if (sequence.totalBeats === 0) {
    return { phase: "completed", totalBeats: 0 };
  }

  const beatMs = beatDurationMs(bpm);
  const clampedElapsed = Math.max(0, elapsedMs);
  const totalElapsedBeats = clampedElapsed / beatMs;
  const safeCueBeats = Math.max(0, Math.floor(cueBeats));

  if (totalElapsedBeats < safeCueBeats) {
    const cueBeatIndex = Math.floor(totalElapsedBeats);
    const cueNumber = safeCueBeats - cueBeatIndex;
    const beatProgress = totalElapsedBeats - cueBeatIndex;
    return {
      phase: "cue",
      cueNumber,
      cueBeatIndex,
      cueTotalBeats: safeCueBeats,
      beatProgress,
    };
  }

  const playElapsedBeats = totalElapsedBeats - safeCueBeats;
  const rawBeatIndex = Math.floor(playElapsedBeats);
  const beatProgress = playElapsedBeats - rawBeatIndex;

  if (!loop && rawBeatIndex >= sequence.totalBeats) {
    return {
      phase: "completed",
      totalBeats: sequence.totalBeats,
    };
  }

  const loopIteration = Math.floor(rawBeatIndex / sequence.totalBeats);
  const globalBeatIndex = rawBeatIndex % sequence.totalBeats;
  const position = resolvePracticeBeatPosition(sequence, taal, globalBeatIndex);

  if (!position) {
    return {
      phase: "completed",
      totalBeats: sequence.totalBeats,
    };
  }

  return {
    phase: "playing",
    globalBeatIndex,
    beatProgress,
    loopIteration,
    position,
  };
}
