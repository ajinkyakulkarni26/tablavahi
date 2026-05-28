/**
 * Common Tabla bols: Marathi (Devanagari) → Latin (for younger readers).
 * Longer keys first so compound bols match correctly.
 */
const BOL_MAP: readonly [string, string][] = [
  ["धिन", "Dhin"],
  ["धा", "Dha"],
  ["दा", "Da"],
  ["दिन", "Din"],
  ["द्य", "Dy"],
  ["दि", "Di"],
  ["तिन", "Tin"],
  ["तित", "Tit"],
  ["ता", "Ta"],
  ["ति", "Ti"],
  ["ते", "Te"],
  ["त", "T"],
  ["न", "Na"],
  ["ने", "Ne"],
  ["नी", "Ni"],
  ["नम", "Nam"],
  ["क", "Ka"],
  ["कत", "Kat"],
  ["ग", "Ge"],
  ["गे", "Ge"],
  ["गि", "Gi"],
  ["ध", "Dh"],
  ["द", "D"],
  ["र", "Ra"],
  ["रे", "Re"],
  ["ड", "Dha"],
  ["ड़", "Dha"],
  ["घ", "Gha"],
  ["भ", "Bha"],
  ["म", "Ma"],
  ["य", "Ya"],
  ["ल", "La"],
  ["स", "Sa"],
  ["ह", "Ha"],
  ["|", "|"],
  ["॥", "||"],
  ["०", "0"],
  ["×", "X"],
];

export function transliterateBol(devanagari: string): string {
  const trimmed = devanagari.trim();
  if (!trimmed) return "";

  const exact = BOL_MAP.find(([dev]) => dev === trimmed);
  if (exact) return exact[1];

  let result = "";
  let i = 0;
  while (i < trimmed.length) {
    let matched = false;
    for (const [dev, lat] of BOL_MAP) {
      if (trimmed.startsWith(dev, i)) {
        result += lat;
        i += dev.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += trimmed[i];
      i += 1;
    }
  }
  return result;
}

export const COMMON_BOLS: readonly { devanagari: string; latin: string }[] = [
  { devanagari: "धा", latin: "Dha" },
  { devanagari: "धिन", latin: "Dhin" },
  { devanagari: "दा", latin: "Da" },
  { devanagari: "दिन", latin: "Din" },
  { devanagari: "त", latin: "T" },
  { devanagari: "ता", latin: "Ta" },
  { devanagari: "तिन", latin: "Tin" },
  { devanagari: "तित", latin: "Tit" },
  { devanagari: "ति", latin: "Ti" },
  { devanagari: "ते", latin: "Te" },
  { devanagari: "न", latin: "Na" },
  { devanagari: "ने", latin: "Ne" },
  { devanagari: "क", latin: "Ka" },
  { devanagari: "कत", latin: "Kat" },
  { devanagari: "ग", latin: "Ge" },
  { devanagari: "गे", latin: "Ge" },
  { devanagari: "र", latin: "Ra" },
  { devanagari: "रे", latin: "Re" },
  { devanagari: "|", latin: "|" },
];
