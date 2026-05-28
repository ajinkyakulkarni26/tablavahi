import { useCallback, useMemo, useState } from "react";
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

function createId(): string {
  return `comp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

  const taal = useMemo(() => getTaal(taalId), [taalId]);

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
      <div className="mb-6 flex flex-wrap gap-1.5 rounded-lg border border-dashed border-saffron/40 bg-saffron/5 p-3">
        <span className="w-full text-xs text-ink/50">Quick insert:</span>
        {COMMON_BOLS.map(({ devanagari, latin }) => (
          <span
            key={devanagari}
            className="rounded bg-white px-2 py-0.5 text-xs text-ink/60"
            title={`Click a cell, then type or paste: ${devanagari}`}
          >
            <span className="font-devanagari font-semibold">{devanagari}</span>{" "}
            <span className="text-maroon-light">({latin})</span>
          </span>
        ))}
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
                    type="text"
                    value={cell.devanagari}
                    onChange={(e) =>
                      updateCell(lineIndex, cellIndex, {
                        devanagari: e.target.value,
                      })
                    }
                    className="font-devanagari rounded border border-parchment-dark bg-white px-1 py-1.5 text-center text-lg font-semibold focus:border-saffron focus:ring-1 focus:ring-saffron/30 focus:outline-none"
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
