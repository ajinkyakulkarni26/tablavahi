import type { Composition, CompositionKind } from "../types";
import { COMPOSITION_KIND_LABELS } from "../types";
import { TAALS } from "../data/taals";
import { getTaal } from "../data/taals";

interface BrowsePanelProps {
  compositions: Composition[];
  selectedTaalId: string;
  selectedKind: CompositionKind | "all";
  searchQuery: string;
  onTaalChange: (id: string) => void;
  onKindChange: (kind: CompositionKind | "all") => void;
  onSearchChange: (q: string) => void;
  onSelect: (composition: Composition) => void;
  onAddNew: () => void;
}

export function BrowsePanel({
  compositions,
  selectedTaalId,
  selectedKind,
  searchQuery,
  onTaalChange,
  onKindChange,
  onSearchChange,
  onSelect,
  onAddNew,
}: BrowsePanelProps) {
  const filtered = compositions.filter((c) => {
    if (selectedTaalId !== "all" && c.taalId !== selectedTaalId) return false;
    if (selectedKind !== "all" && c.kind !== selectedKind) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      (c.titleDevanagari?.includes(searchQuery.trim()) ?? false) ||
      COMPOSITION_KIND_LABELS[c.kind].toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-parchment-dark bg-white/70 p-4 md:flex-row md:items-end">
        <label className="flex-1">
          <span className="text-xs font-medium text-ink/50 uppercase">Taal</span>
          <select
            value={selectedTaalId}
            onChange={(e) => onTaalChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-parchment-dark bg-parchment px-3 py-2"
          >
            <option value="all">All taals</option>
            {TAALS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nameDevanagari} ({t.name})
              </option>
            ))}
          </select>
        </label>

        <label className="flex-1">
          <span className="text-xs font-medium text-ink/50 uppercase">Type</span>
          <select
            value={selectedKind}
            onChange={(e) =>
              onKindChange(e.target.value as CompositionKind | "all")
            }
            className="mt-1 w-full rounded-lg border border-parchment-dark bg-parchment px-3 py-2"
          >
            <option value="all">All types</option>
            {(Object.keys(COMPOSITION_KIND_LABELS) as CompositionKind[]).map(
              (k) => (
                <option key={k} value={k}>
                  {COMPOSITION_KIND_LABELS[k]}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="flex-[1.5]">
          <span className="text-xs font-medium text-ink/50 uppercase">Search</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="e.g. Teentaal Kayda"
            className="mt-1 w-full rounded-lg border border-parchment-dark bg-parchment px-3 py-2"
          />
        </label>
      </div>

      <div className="mb-6 flex justify-center">
        <button
          type="button"
          onClick={onAddNew}
          className="rounded-full bg-maroon px-6 py-2.5 font-medium text-parchment shadow-md hover:bg-maroon-light"
        >
          + Add composition
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-ink/50">
          No compositions found. Try changing filters or add a new one.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const taal = getTaal(c.taalId);
            const maxLineMatras = Math.max(
              0,
              ...c.lines.map((line) => line.cells.length),
            );
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  className="group w-full rounded-xl border border-parchment-dark bg-white/80 p-5 text-left shadow-sm transition hover:border-saffron/50 hover:shadow-md"
                >
                  <span className="text-xs font-medium tracking-wide text-saffron-dark uppercase">
                    {COMPOSITION_KIND_LABELS[c.kind]}
                    {taal && ` · ${taal.name}`}
                  </span>
                  {c.titleDevanagari && (
                    <p className="font-devanagari mt-2 text-xl font-bold text-ink group-hover:text-maroon">
                      {c.titleDevanagari}
                    </p>
                  )}
                  <p className="mt-1 font-medium text-ink/80">{c.title}</p>
                  <p className="mt-2 text-xs text-ink/45">
                    {c.lines.length} line{c.lines.length !== 1 ? "s" : ""} ·{" "}
                    {maxLineMatras} max matras
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
