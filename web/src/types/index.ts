/** Sam (X), Khali (0), Taali (1, 2, 3 …) markers above matras */
export type BeatMarker = "sam" | "khali" | "taali";

export interface MatraCell {
  /** Bol in Marathi (Devanagari script), e.g. धा */
  devanagari: string;
  /** Optional beat marker shown above this matra */
  marker?: BeatMarker;
  /** For taali: which clap number (1, 2, 3 …) */
  taaliNumber?: number;
}

export type CompositionLineSection = "kayda" | "prakaar" | "tihai" | "other";

export interface CompositionLine {
  cells: MatraCell[];
  /** Optional structural section, useful for Kayda -> Prakar -> Tihai layout */
  section?: CompositionLineSection;
  /** Optional visible section name, e.g. Prakar 1 */
  sectionTitle?: string;
}

export type CompositionKind =
  | "taal"
  | "kayda"
  | "peshkar"
  | "prakaar"
  | "rela"
  | "tukda"
  | "chakradar"
  | "other";

export interface Composition {
  id: string;
  taalId: string;
  kind: CompositionKind;
  /** UID of creator/owner in shared library mode */
  ownerUid?: string;
  /** Optional display label for owner */
  ownerDisplayName?: string;
  title: string;
  /** Title in Marathi (Devanagari script) */
  titleDevanagari?: string;
  lines: CompositionLine[];
  notes?: string;
  guruNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Taal {
  id: string;
  name: string;
  nameDevanagari: string;
  matras: number;
  /** Beat group sizes, e.g. [4,4,4,4] for Teentaal */
  vibhag: number[];
  /** 1-based matra indices for sam, khali, taali (template for new lines) */
  samMatra: number;
  khaliMatra: number;
  taaliMatras: number[];
}

export type DisplayMode = "both" | "devanagari" | "latin";

export const COMPOSITION_KIND_LABELS: Record<CompositionKind, string> = {
  taal: "Original Taal",
  kayda: "Kayda",
  peshkar: "Peshkar",
  prakaar: "Prakaar",
  rela: "Rela",
  tukda: "Tukda",
  chakradar: "Chakradar",
  other: "Other",
};

export const COMPOSITION_LINE_SECTION_LABELS: Record<
  CompositionLineSection,
  string
> = {
  kayda: "Main Kayda",
  prakaar: "Prakar",
  tihai: "Tihai",
  other: "Other",
};
