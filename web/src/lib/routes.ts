import type { Composition, CompositionKind, CompositionLine } from "../types";
import { compositionLineSectionLabels } from "./lineSections";
import { transliterateBol } from "./transliteration";

const KIND_ALIASES: Record<string, CompositionKind> = {
  taal: "taal",
  taals: "taal",
  kayda: "kayda",
  kaydas: "kayda",
  peshkar: "peshkar",
  peshkars: "peshkar",
  prakaar: "prakaar",
  prakaars: "prakaar",
  rela: "rela",
  relas: "rela",
  tukda: "tukda",
  tukdas: "tukda",
  tukada: "tukda",
  tukadas: "tukda",
  chakradar: "chakradar",
  chakradars: "chakradar",
  other: "other",
};

const DEVANAGARI_DIGITS: Record<string, string> = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function pathSegments(pathname: string): string[] {
  return pathname
    .split("/")
    .map((segment) => safeDecode(segment.trim()))
    .filter(Boolean);
}

export function parseKindSegment(
  segment: string | null | undefined,
): CompositionKind | undefined {
  if (!segment) return undefined;
  return KIND_ALIASES[segment.toLowerCase()];
}

export function slugifySegment(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Mark}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "composition";
}

function bolSlugPart(devanagari: string): string {
  const english = transliterateBol(devanagari).replace(/\s+/g, "");
  return english.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "");
}

export function openingBolSlug(composition: Composition): string {
  const bolParts = composition.lines
    .flatMap((line) => line.cells)
    .map((cell) => cell.devanagari.trim())
    .filter(Boolean)
    .map(bolSlugPart)
    .filter(Boolean)
    .slice(0, 8);

  if (bolParts.length > 0) return bolParts.join("-");

  return slugifySegment(
    composition.title || composition.titleDevanagari || "composition",
  );
}

function normalizeDigits(value: string): string {
  return value.replace(/[०-९]/g, (digit) => DEVANAGARI_DIGITS[digit] ?? digit);
}

function trailingTitleNumber(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = normalizeDigits(value).trim().match(/(?:^|[\s._-])(\d+)$/u);
  return match?.[1];
}

export function compositionRouteKey(composition: Composition): string {
  const titleNumber =
    trailingTitleNumber(composition.title) ??
    trailingTitleNumber(composition.titleDevanagari);
  if (titleNumber) return `comp-${composition.kind}-${titleNumber}`;

  const titleSlug = slugifySegment(
    composition.title || composition.titleDevanagari || "composition",
  );
  return `comp-${titleSlug}`;
}

export function buildBrowsePath(
  taalId: string,
  kind: CompositionKind | "all",
): string {
  if (taalId === "all" && kind === "all") return "/";
  if (taalId === "all") return `/?kind=${kind}`;
  if (kind === "all") return `/${encodeURIComponent(taalId)}`;
  return `/${encodeURIComponent(taalId)}/${kind}`;
}

export function buildCompositionPath(composition: Composition): string {
  const slug = `${openingBolSlug(composition)}--${compositionRouteKey(
    composition,
  )}`;
  return `/${encodeURIComponent(composition.taalId)}/${composition.kind}/${encodeURIComponent(
    slug,
  )}`;
}

export function compositionIdFromSlug(segment: string): string | undefined {
  const decoded = safeDecode(segment);
  const separatorIndex = decoded.lastIndexOf("--");
  if (separatorIndex >= 0) return decoded.slice(separatorIndex + 2);
  if (decoded.startsWith("comp-")) return decoded;
  return undefined;
}

export function findCompositionByRouteId(
  compositions: Composition[],
  id: string,
  taalId: string,
  kind: CompositionKind | "all",
): Composition | undefined {
  const exactIdMatch = compositions.find((composition) => composition.id === id);
  if (exactIdMatch) return exactIdMatch;

  const scopedCompositions = compositions.filter((composition) => {
    if (composition.taalId !== taalId) return false;
    if (kind !== "all" && composition.kind !== kind) return false;
    return true;
  });

  return scopedCompositions.find((composition) => {
    const titleSlug = slugifySegment(
      composition.title || composition.titleDevanagari || "composition",
    );
    return (
      compositionRouteKey(composition) === id ||
      openingBolSlug(composition) === id ||
      titleSlug === id
    );
  });
}

export function sectionAnchorId(label: string, occurrence = 1): string {
  const slug = slugifySegment(label);
  return occurrence > 1 ? `${slug}-${occurrence}` : slug;
}

export function compositionLineSectionAnchors(
  lines: CompositionLine[],
  mainSectionLabel?: string,
): string[] {
  const seen = new Map<string, number>();
  const labels = compositionLineSectionLabels(lines, mainSectionLabel);

  return labels.map((label, index) => {
    const previousLabel = index > 0 ? labels[index - 1] : "";
    if (!label || label === previousLabel) return "";

    const occurrence = (seen.get(label) ?? 0) + 1;
    seen.set(label, occurrence);
    return sectionAnchorId(label, occurrence);
  });
}

export function compositionSectionLinks(
  lines: CompositionLine[],
  mainSectionLabel?: string,
): { id: string; label: string }[] {
  const anchors = compositionLineSectionAnchors(lines, mainSectionLabel);
  const labels = compositionLineSectionLabels(lines, mainSectionLabel);
  return anchors.flatMap((id, index) => {
    if (!id) return [];
    return [{ id, label: labels[index] }];
  });
}
