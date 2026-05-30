import { useEffect, useMemo, useState } from "react";
import type { Composition, DisplayMode } from "../types";
import { COMPOSITION_KIND_LABELS } from "../types";
import { getTaal } from "../data/taals";
import {
  buildCompositionTextSections,
  formatCompositionAsText,
  mainSectionLabelForKind,
} from "../lib/exportText";
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
  const [copyStatus, setCopyStatus] = useState("");
  const mainSectionLabel = mainSectionLabelForKind(composition.kind);
  const sectionLinks = compositionSectionLinks(
    composition.lines,
    mainSectionLabel,
  );
  const textSections = useMemo(
    () => (taal ? buildCompositionTextSections(composition, taal) : []),
    [composition, taal],
  );
  const fullText = useMemo(
    () => (taal ? formatCompositionAsText(composition, taal) : ""),
    [composition, taal],
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

  const copyText = async (label: string, text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopyStatus(`Copied ${label}.`);
      window.setTimeout(() => setCopyStatus(""), 2500);
    } catch {
      setCopyStatus("Copy failed. Please try again.");
    }
  };

  return (
    <article className="mx-auto max-w-4xl">
      <button
        type="button"
        onClick={onBack}
        className="no-print mb-4 text-sm text-maroon-light hover:text-maroon hover:underline"
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

      <div className="no-print mt-5 rounded-xl border border-parchment-dark bg-white/75 p-4 text-center shadow-sm">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              void copyText("full composition", fullText);
            }}
            className="rounded-full bg-raga px-4 py-2 text-sm font-medium text-parchment hover:bg-maroon"
          >
            Copy full text
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full border border-maroon/30 bg-white px-4 py-2 text-sm font-medium text-maroon hover:bg-maroon hover:text-parchment"
          >
            Print / Save PDF
          </button>
        </div>

        {textSections.length > 1 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <span className="px-1 py-1 text-xs font-medium text-ink/50">
              Copy section:
            </span>
            {textSections.map((section) => (
              <button
                key={section.label}
                type="button"
                onClick={() => {
                  void copyText(section.label, section.text);
                }}
                className="rounded-full border border-parchment-dark bg-parchment px-3 py-1 text-xs font-medium text-ink/70 hover:border-saffron hover:text-maroon"
              >
                {section.label}
              </button>
            ))}
          </div>
        )}

        {copyStatus && (
          <p className="mt-2 text-xs font-medium text-raga">{copyStatus}</p>
        )}
      </div>

      {sectionLinks.length > 1 && (
        <nav className="no-print mt-4 flex flex-wrap justify-center gap-2 text-xs">
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

      <div className="print-composition-card mt-8 rounded-2xl border border-parchment-dark border-t-4 border-t-saffron bg-white/90 p-6 shadow-lg shadow-ink/5 md:p-10">
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
        <div className="no-print mt-8 flex justify-center">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-maroon/30 bg-white px-6 py-2 text-sm font-medium text-maroon transition hover:bg-maroon hover:text-parchment"
          >
            Edit this composition
          </button>
        </div>
      ) : (
        <p className="no-print mt-8 text-center text-xs text-ink/50">
          This shared composition is read-only for your account.
        </p>
      )}
    </article>
  );
}
