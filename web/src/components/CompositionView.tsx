import { useEffect } from "react";
import type { Composition, DisplayMode } from "../types";
import { COMPOSITION_KIND_LABELS } from "../types";
import { getTaal } from "../data/taals";
import { compositionSectionLinks } from "../lib/routes";
import { BolGrid } from "./BolGrid";
import { TaalLegend } from "./TaalLegend";

interface CompositionViewProps {
  composition: Composition;
  displayMode: DisplayMode;
  canEdit: boolean;
  onEdit: () => void;
  onBack: () => void;
}

export function CompositionView({
  composition,
  displayMode,
  canEdit,
  onEdit,
  onBack,
}: CompositionViewProps) {
  const taal = getTaal(composition.taalId);
  const mainSectionLabel =
    composition.kind === "rela" ? "Main Rela" : "Main Kayda";
  const sectionLinks = compositionSectionLinks(
    composition.lines,
    mainSectionLabel,
  );

  useEffect(() => {
    const sectionId = window.location.hash.slice(1);
    if (!sectionId) return;

    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  }, [composition.id]);

  if (!taal) {
    return (
      <p className="text-center text-maroon">Unknown taal: {composition.taalId}</p>
    );
  }

  return (
    <article className="mx-auto max-w-4xl">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-maroon-light hover:text-maroon hover:underline"
      >
        ← Back to library
      </button>

      <header className="mb-6 text-center">
        <p className="text-xs font-medium tracking-widest text-saffron-dark uppercase">
          {COMPOSITION_KIND_LABELS[composition.kind]} · {taal.nameDevanagari}{" "}
          ({taal.name})
        </p>
        {composition.titleDevanagari && (
          <h1 className="font-devanagari mt-2 text-3xl font-bold text-ink md:text-4xl">
            {composition.titleDevanagari}
          </h1>
        )}
        <h2
          className={`text-xl text-ink/80 ${composition.titleDevanagari ? "mt-1" : "mt-2 text-3xl font-bold"}`}
        >
          {composition.title}
        </h2>
        {composition.ownerDisplayName && (
          <p className="mt-2 text-xs text-ink/50">
            Shared by: {composition.ownerDisplayName}
          </p>
        )}
        {composition.guruNote && (
          <p className="mx-auto mt-4 max-w-lg text-sm text-ink/60 italic">
            {composition.guruNote}
          </p>
        )}
      </header>

      <TaalLegend taal={taal} />

      {sectionLinks.length > 1 && (
        <nav className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
          {sectionLinks.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full border border-parchment-dark bg-white px-3 py-1 font-medium text-maroon-light hover:border-saffron hover:text-maroon"
            >
              {section.label}
            </a>
          ))}
        </nav>
      )}

      <div className="mt-8 rounded-2xl border border-parchment-dark border-t-4 border-t-saffron bg-white/90 p-6 shadow-lg shadow-ink/5 md:p-10">
        <BolGrid
          lines={composition.lines}
          taal={taal}
          displayMode={displayMode}
          mainSectionLabel={mainSectionLabel}
        />
      </div>

      {composition.notes && (
        <p className="mt-6 text-center text-sm text-ink/60">{composition.notes}</p>
      )}

      {canEdit ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-maroon/30 bg-white px-6 py-2 text-sm font-medium text-maroon transition hover:bg-maroon hover:text-parchment"
          >
            Edit this composition
          </button>
        </div>
      ) : (
        <p className="mt-8 text-center text-xs text-ink/50">
          This shared composition is read-only for your account.
        </p>
      )}
    </article>
  );
}
