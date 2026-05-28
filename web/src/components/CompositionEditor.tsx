import { useCallback, useMemo, useRef, useState } from "react";
import type {
  BeatMarker,
  Composition,
  CompositionKind,
  CompositionLine,
  MatraCell,
} from "../types";
import { COMPOSITION_KIND_LABELS } from "../types";
import { TAALS, getTaal } from "../data/taals";
import {
  applyTaalMarkers,
  emptyLine,
  markerSymbol,
  newLineForTaal,
} from "../lib/annotations";
import { COMMON_BOLS, transliterateBol } from "../lib/transliteration";
import { mr } from "../locale/mr";

interface CompositionEditorProps {
  initial?: Composition;
  onSave: (composition: Composition) => void;
  onCancel: () => void;
}

type ActiveCell = {
  lineIndex: number;
  cellIndex: number;
  selectionStart: number;
  selectionEnd: number;
};

function createId(): string {
  return `comp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function cellKey(lineIndex: number, cellIndex: number): string {
  return `${lineIndex}-${cellIndex}`;
}

export function CompositionEditor({
  initial,
  onSave,
  onCancel,
}: CompositionEditorProps) {
  const [taalId, setTaalId] = useState(initial?.taalId ?? "teentaal");
  const [kind, setKind] = useState<CompositionKind>(initial?.kind ?? "kayda");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [titleDevanagari, setTitleDevanagari] = useState(
    initial?.titleDevanagari ?? "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [guruNote, setGuruNote] = useState(initial?.guruNote ?? "");
  const [lines, setLines] = useState<CompositionLine[]>(
    initial?.lines ?? [newLineForTaal(getTaal("teentaal")!)],
  );
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [advanceAfterInsert, setAdvanceAfterInsert] = useState(true);
  const cellInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const taal = useMemo(() => getTaal(taalId), [taalId]);
  const activeMatraCell =
    activeCell != null ? lines[activeCell.lineIndex]?.cells[activeCell.cellIndex] : undefined;

  const rememberActiveCell = (
    lineIndex: number,
    cellIndex: number,
    input: HTMLInputElement,
  ) => {
    const cursor = input.value.length;
    setActiveCell({
      lineIndex,
      cellIndex,
      selectionStart: input.selectionStart ?? cursor,
      selectionEnd: input.selectionEnd ?? cursor,
    });
  };

  const focusCell = (
    lineIndex: number,
    cellIndex: number,
    options: {
      selectAll?: boolean;
      selectionStart?: number;
      selectionEnd?: number;
    } = {},
  ) => {
    window.requestAnimationFrame(() => {
      const input = cellInputRefs.current[cellKey(lineIndex, cellIndex)];
      const fallbackLength =
        lines[lineIndex]?.cells[cellIndex]?.devanagari.length ?? 0;
      const valueLength = input?.value.length ?? fallbackLength;
      const selectionStart =
        options.selectionStart ?? (options.selectAll ? 0 : valueLength);
      const selectionEnd = options.selectionEnd ?? valueLength;

      input?.focus();
      input?.setSelectionRange(selectionStart, selectionEnd);
      setActiveCell({
        lineIndex,
        cellIndex,
        selectionStart,
        selectionEnd,
      });
    });
  };

  const getAdjacentCell = (
    lineIndex: number,
    cellIndex: number,
    direction: "previous" | "next",
  ): Pick<ActiveCell, "lineIndex" | "cellIndex"> | null => {
    if (direction === "previous") {
      if (cellIndex > 0) return { lineIndex, cellIndex: cellIndex - 1 };
      const previousLine = lines[lineIndex - 1];
      if (previousLine) {
        return { lineIndex: lineIndex - 1, cellIndex: previousLine.cells.length - 1 };
      }
      return null;
    }

    if (cellIndex < (lines[lineIndex]?.cells.length ?? 0) - 1) {
      return { lineIndex, cellIndex: cellIndex + 1 };
    }
    if (lines[lineIndex + 1]) return { lineIndex: lineIndex + 1, cellIndex: 0 };
    return null;
  };

  const handleTaalChange = useCallback((newTaalId: string) => {
    const newTaal = getTaal(newTaalId);
    if (!newTaal) return;
    setTaalId(newTaalId);
    setLines((prev) =>
      prev.map((line) => {
        const cells = emptyLine(newTaal.matras).map((cell, i) => ({
          ...cell,
          devanagari: line.cells[i]?.devanagari ?? "",
        }));
        return { cells: applyTaalMarkers(cells, newTaal) };
      }),
    );
  }, []);

  const updateCell = (
    lineIndex: number,
    cellIndex: number,
    patch: Partial<MatraCell>,
  ) => {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[lineIndex], cells: [...next[lineIndex].cells] };
      line.cells[cellIndex] = { ...line.cells[cellIndex], ...patch };
      next[lineIndex] = line;
      return next;
    });
  };

  const addLine = () => {
    if (!taal) return;
    setLines((prev) => [...prev, newLineForTaal(taal)]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const duplicateLine = (index: number) => {
    setLines((prev) => {
      const copy = structuredClone(prev[index]);
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const applyMarkersToLine = (lineIndex: number) => {
    if (!taal) return;
    setLines((prev) => {
      const next = [...prev];
      next[lineIndex] = {
        cells: applyTaalMarkers(next[lineIndex].cells, taal),
      };
      return next;
    });
  };

  const insertBolIntoActiveCell = (bol: string) => {
    if (!activeCell || !activeMatraCell) return;

    const { lineIndex, cellIndex, selectionStart, selectionEnd } = activeCell;
    const nextCell = advanceAfterInsert
      ? getAdjacentCell(lineIndex, cellIndex, "next")
      : null;
    let nextCursor = selectionStart + bol.length;

    setLines((prev) => {
      const current = prev[lineIndex]?.cells[cellIndex];
      if (!current) return prev;

      const start = Math.min(selectionStart, current.devanagari.length);
      const end = Math.min(selectionEnd, current.devanagari.length);
      nextCursor = start + bol.length;
      const nextValue = `${current.devanagari.slice(0, start)}${bol}${current.devanagari.slice(end)}`;

      const next = [...prev];
      const line = { ...next[lineIndex], cells: [...next[lineIndex].cells] };
      line.cells[cellIndex] = { ...current, devanagari: nextValue };
      next[lineIndex] = line;
      return next;
    });

    const nextActiveCell = {
      lineIndex,
      cellIndex,
      selectionStart: nextCursor,
      selectionEnd: nextCursor,
    };
    setActiveCell(nextActiveCell);

    if (nextCell) {
      focusCell(nextCell.lineIndex, nextCell.cellIndex, { selectAll: true });
      return;
    }

    focusCell(lineIndex, cellIndex, {
      selectionStart: nextCursor,
      selectionEnd: nextCursor,
    });
  };

  const clearActiveCell = () => {
    if (!activeCell || !activeMatraCell) return;
    updateCell(activeCell.lineIndex, activeCell.cellIndex, { devanagari: "" });
    focusCell(activeCell.lineIndex, activeCell.cellIndex);
  };

  const moveActiveCell = (direction: "previous" | "next") => {
    if (!activeCell) return;
    const target = getAdjacentCell(
      activeCell.lineIndex,
      activeCell.cellIndex,
      direction,
    );
    if (target) focusCell(target.lineIndex, target.cellIndex, { selectAll: true });
  };

  const updateActiveCellMarker = (
    marker: BeatMarker | undefined,
    taaliNumber?: number,
  ) => {
    if (!activeCell || !activeMatraCell) return;
    updateCell(activeCell.lineIndex, activeCell.cellIndex, {
      marker,
      taaliNumber,
    });
    focusCell(activeCell.lineIndex, activeCell.cellIndex, { selectAll: true });
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert("Please enter a title for this composition.");
      return;
    }
    if (!taal) return;
    const now = new Date().toISOString();
    const composition: Composition = {
      id: initial?.id ?? createId(),
      taalId,
      kind,
      title: title.trim(),
      titleDevanagari: titleDevanagari.trim() || undefined,
      lines,
      notes: notes.trim() || undefined,
      guruNote: guruNote.trim() || undefined,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(composition);
  };

  if (!taal) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="mb-6 text-center text-2xl font-semibold text-ink">
        {initial ? "Edit composition" : "Add new composition"}
      </h2>

      <div className="mb-8 grid gap-4 rounded-xl border border-parchment-dark bg-white/70 p-5 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium tracking-wide text-ink/60 uppercase">
            Taal
          </span>
          <select
            value={taalId}
            onChange={(e) => handleTaalChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-parchment-dark bg-parchment px-3 py-2"
          >
            {TAALS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nameDevanagari} ({t.name}) — {t.matras} matras
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium tracking-wide text-ink/60 uppercase">
            Type
          </span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as CompositionKind)}
            className="mt-1 w-full rounded-lg border border-parchment-dark bg-parchment px-3 py-2"
          >
            {(Object.keys(COMPOSITION_KIND_LABELS) as CompositionKind[]).map(
              (k) => (
                <option key={k} value={k}>
                  {COMPOSITION_KIND_LABELS[k]}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="block md:col-span-2">
          <span className="text-xs font-medium tracking-wide text-ink/60 uppercase">
            Title (English)
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Teentaal Kayda — Lesson 1"
            className="mt-1 w-full rounded-lg border border-parchment-dark bg-parchment px-3 py-2"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-xs font-medium tracking-wide text-ink/60 uppercase">
            {mr.titleMarathi}
          </span>
          <input
            type="text"
            value={titleDevanagari}
            onChange={(e) => setTitleDevanagari(e.target.value)}
            placeholder={mr.titleMarathiPlaceholder}
            className="font-devanagari mt-1 w-full rounded-lg border border-parchment-dark bg-parchment px-3 py-2 text-lg"
          />
        </label>

      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="font-devanagari text-sm text-ink/70">{mr.editorHint}</p>
        <button
          type="button"
          onClick={addLine}
          className="rounded-full bg-saffron px-4 py-1.5 text-sm font-medium text-ink shadow-sm hover:bg-saffron-dark"
        >
          + Add line ({taal.matras} matras)
        </button>
      </div>

      {/* Quick-insert bols */}
      <div className="mb-6 rounded-lg border border-dashed border-saffron/40 bg-saffron/5 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-ink/60 uppercase">
              Quick insert
            </p>
            <p className="text-xs text-ink/50">
              {activeMatraCell
                ? `Selected: Line ${activeCell!.lineIndex + 1}, Matra ${activeCell!.cellIndex + 1}`
                : "Select a matra cell, then tap a bol."}
            </p>
          </div>

          <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-ink/70">
            <input
              type="checkbox"
              checked={advanceAfterInsert}
              onChange={(e) => setAdvanceAfterInsert(e.target.checked)}
              className="accent-maroon"
            />
            Advance after insert
          </label>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!activeMatraCell}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => moveActiveCell("previous")}
            className="rounded-full border border-parchment-dark bg-white px-3 py-1.5 text-xs text-ink/70 hover:border-saffron disabled:cursor-not-allowed disabled:opacity-45"
          >
            Previous cell
          </button>
          <button
            type="button"
            disabled={!activeMatraCell}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => moveActiveCell("next")}
            className="rounded-full border border-parchment-dark bg-white px-3 py-1.5 text-xs text-ink/70 hover:border-saffron disabled:cursor-not-allowed disabled:opacity-45"
          >
            Next cell
          </button>
          <button
            type="button"
            disabled={!activeMatraCell}
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearActiveCell}
            className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs text-red-700/70 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Clear cell
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {[
            ["", "No marker"],
            ["sam", "× Sam"],
            ["khali", "० Khali"],
            ["taali-2", "2 Taali"],
            ["taali-3", "3 Taali"],
            ["taali-4", "4 Taali"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={!activeMatraCell}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (!value) {
                  updateActiveCellMarker(undefined, undefined);
                } else if (value.startsWith("taali-")) {
                  updateActiveCellMarker(
                    "taali",
                    Number(value.split("-")[1]),
                  );
                } else {
                  updateActiveCellMarker(value as BeatMarker, undefined);
                }
              }}
              className="rounded-full border border-parchment-dark bg-parchment px-3 py-1.5 text-xs text-ink/70 hover:border-saffron hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
        {COMMON_BOLS.map(({ devanagari, latin }) => (
          <button
            key={devanagari}
            type="button"
            disabled={!activeMatraCell}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertBolIntoActiveCell(devanagari)}
            className="rounded-lg border border-parchment-dark bg-white px-3 py-2 text-sm text-ink/70 shadow-sm transition hover:border-saffron hover:text-maroon disabled:cursor-not-allowed disabled:opacity-45"
            title={
              activeMatraCell
                ? `Insert ${devanagari} into selected cell`
                : "Select a matra cell first"
            }
          >
            <span className="font-devanagari font-semibold">{devanagari}</span>{" "}
            <span className="text-maroon-light">({latin})</span>
          </button>
        ))}
        </div>
      </div>

      <div className="space-y-8">
        {lines.map((line, lineIndex) => (
          <div
            key={lineIndex}
            className="rounded-xl border border-parchment-dark bg-white/80 p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-maroon">
                Line {lineIndex + 1}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyMarkersToLine(lineIndex)}
                  className="text-xs text-maroon-light hover:underline"
                >
                  Reset × ० 2 3 markers
                </button>
                <button
                  type="button"
                  onClick={() => duplicateLine(lineIndex)}
                  className="text-xs text-ink/50 hover:underline"
                >
                  Duplicate
                </button>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(lineIndex)}
                    className="text-xs text-red-700/70 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {line.cells.map((cell, cellIndex) => (
                <div
                  key={cellIndex}
                  className="flex w-[4.5rem] flex-col items-stretch"
                >
                  <select
                    value={
                      cell.marker
                        ? cell.marker === "taali"
                          ? `taali-${cell.taaliNumber ?? 2}`
                          : cell.marker
                        : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) {
                        updateCell(lineIndex, cellIndex, {
                          marker: undefined,
                          taaliNumber: undefined,
                        });
                      } else if (v.startsWith("taali-")) {
                        updateCell(lineIndex, cellIndex, {
                          marker: "taali",
                          taaliNumber: Number(v.split("-")[1]),
                        });
                      } else {
                        updateCell(lineIndex, cellIndex, {
                          marker: v as BeatMarker,
                          taaliNumber: undefined,
                        });
                      }
                    }}
                    className="mb-0.5 rounded border border-parchment-dark bg-parchment px-0.5 py-0.5 text-center text-xs"
                    title="Beat marker"
                  >
                    <option value="">—</option>
                    <option value="sam">× Sam</option>
                    <option value="khali">० Khali</option>
                    <option value="taali-2">2 Taali</option>
                    <option value="taali-3">3 Taali</option>
                    <option value="taali-4">4 Taali</option>
                  </select>
                  <span className="text-center font-devanagari text-xs text-maroon/80">
                    {markerSymbol(cell.marker, cell.taaliNumber) || "·"}
                  </span>
                  <input
                    ref={(node) => {
                      cellInputRefs.current[cellKey(lineIndex, cellIndex)] = node;
                    }}
                    type="text"
                    value={cell.devanagari}
                    onFocus={(e) =>
                      rememberActiveCell(lineIndex, cellIndex, e.currentTarget)
                    }
                    onClick={(e) =>
                      rememberActiveCell(lineIndex, cellIndex, e.currentTarget)
                    }
                    onKeyUp={(e) =>
                      rememberActiveCell(lineIndex, cellIndex, e.currentTarget)
                    }
                    onSelect={(e) =>
                      rememberActiveCell(lineIndex, cellIndex, e.currentTarget)
                    }
                    onChange={(e) => {
                      updateCell(lineIndex, cellIndex, {
                        devanagari: e.target.value,
                      });
                      rememberActiveCell(lineIndex, cellIndex, e.currentTarget);
                    }}
                    className={`font-devanagari rounded border bg-white px-1 py-1.5 text-center text-lg font-semibold focus:border-saffron focus:ring-1 focus:ring-saffron/30 focus:outline-none ${
                      activeCell?.lineIndex === lineIndex &&
                      activeCell?.cellIndex === cellIndex
                        ? "border-saffron ring-1 ring-saffron/30"
                        : "border-parchment-dark"
                    }`}
                    placeholder="धा"
                    lang="mr"
                    inputMode="text"
                    aria-label={`Matra ${cellIndex + 1} bol`}
                  />
                  <span className="truncate text-center text-[11px] text-maroon-light">
                    {transliterateBol(cell.devanagari) || "—"}
                  </span>
                  <span className="text-center text-[10px] text-ink/35">
                    {cellIndex + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="text-xs font-medium tracking-wide text-ink/60 uppercase">
            Notes
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-parchment-dark bg-parchment px-3 py-2 text-sm"
            placeholder="Performance notes, lay, etc."
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs font-medium tracking-wide text-ink/60 uppercase">
            {mr.guruNoteLabel}
          </span>
          <textarea
            value={guruNote}
            onChange={(e) => setGuruNote(e.target.value)}
            rows={2}
            className="font-devanagari mt-1 w-full rounded-lg border border-parchment-dark bg-parchment px-3 py-2 text-sm italic"
            placeholder={mr.guruNotePlaceholder}
          />
        </label>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-maroon px-8 py-2.5 font-medium text-parchment shadow-md hover:bg-maroon-light"
        >
          Save composition
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-ink/20 px-6 py-2.5 text-sm text-ink/70 hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
