/**
 * Common Tabla bols: Marathi (Devanagari) → English transliteration in Roman script.
 * Longer keys first so compound bols match correctly.
 */
const BOL_MAP: readonly [string, string][] = [
  ["तिरकिट", "Tirkit"],
  ["धाति", "Dha Ti"],
  ["धागे", "Dha Ge"],
  ["धाधा", "Dha Dha"],
  ["धिंना", "Dhin Na"],
  ["धिं", "Dhin"],
  ["धिन", "Dhin"],
  ["धी", "Dhi"],
  ["धा", "Dha"],
  ["दा", "Da"],
  ["दिन", "Din"],
  ["द्य", "Dy"],
  ["दि", "Di"],
  ["तिंना", "Tin Na"],
  ["तिं", "Tin"],
  ["तिन", "Tin"],
  ["तिट", "Tita"],
  ["तित", "Tita"],
  ["ताति", "Ta Ti"],
  ["ताता", "Ta Ta"],
  ["ता", "Ta"],
  ["ती", "Ti"],
  ["ति", "Ti"],
  ["ते", "Te"],
  ["त", "T"],
  ["केना", "KeNa"],
  ["के", "Ke"],
  ["ना", "Na"],
  ["न", "Na"],
  ["ने", "Ne"],
  ["नी", "Ni"],
  ["नम", "Nam"],
  ["कत्", "Kat"],
  ["क", "Ka"],
  ["कत", "Kat"],
  ["गेना", "GeNa"],
  ["ग", "Ge"],
  ["गे", "Ge"],
  ["गि", "Gi"],
  ["टधा", "Ta Dha"],
  ["टता", "Ta Ta"],
  ["ट", "Ta"],
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

const DEPENDENT_VOWEL_MAP: Record<string, string> = {
  "ा": "a",
  "ि": "i",
  "ी": "i",
  "ु": "u",
  "ू": "u",
  "ृ": "ri",
  "े": "e",
  "ै": "ai",
  "ो": "o",
  "ौ": "au",
  "ं": "n",
  "ँ": "n",
  "ः": "h",
  "्": "",
};

export interface QuickInsertBol {
  devanagari: string;
  latin: string;
}

function applyDependentVowel(result: string, vowel: string): string {
  if (!vowel) return result.endsWith("a") ? result.slice(0, -1) : result;
  if (vowel === "a") return result;
  if (result.endsWith("a")) return `${result.slice(0, -1)}${vowel}`;
  return `${result}${vowel}`;
}

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
      const vowel = DEPENDENT_VOWEL_MAP[trimmed[i]];
      result =
        vowel != null ? applyDependentVowel(result, vowel) : result + trimmed[i];
      i += 1;
    }
  }
  return result;
}

export const COMMON_BOLS: readonly QuickInsertBol[] = [
  { devanagari: "धा", latin: "Dha" },
  { devanagari: "धिं", latin: "Dhin" },
  { devanagari: "धी", latin: "Dhi" },
  { devanagari: "धागे", latin: "Dha Ge" },
  { devanagari: "धाति", latin: "Dha Ti" },
  { devanagari: "धाधा", latin: "Dha Dha" },
  { devanagari: "धिंना", latin: "Dhin Na" },
  { devanagari: "दा", latin: "Da" },
  { devanagari: "दिन", latin: "Din" },
  { devanagari: "तिरकिट", latin: "Tirkit" },
  { devanagari: "त", latin: "T" },
  { devanagari: "ता", latin: "Ta" },
  { devanagari: "ती", latin: "Ti" },
  { devanagari: "तिं", latin: "Tin" },
  { devanagari: "तिंना", latin: "Tin Na" },
  { devanagari: "तिन", latin: "Tin" },
  { devanagari: "तिट", latin: "Tita" },
  { devanagari: "ताता", latin: "Ta Ta" },
  { devanagari: "ताति", latin: "Ta Ti" },
  { devanagari: "ति", latin: "Ti" },
  { devanagari: "ते", latin: "Te" },
  { devanagari: "ना", latin: "Na" },
  { devanagari: "न", latin: "Na" },
  { devanagari: "ने", latin: "Ne" },
  { devanagari: "कत्", latin: "Kat" },
  { devanagari: "क", latin: "Ka" },
  { devanagari: "कत", latin: "Kat" },
  { devanagari: "केना", latin: "KeNa" },
  { devanagari: "ग", latin: "Ge" },
  { devanagari: "गे", latin: "Ge" },
  { devanagari: "गेना", latin: "GeNa" },
  { devanagari: "टधा", latin: "Ta Dha" },
  { devanagari: "टता", latin: "Ta Ta" },
  { devanagari: "र", latin: "Ra" },
  { devanagari: "रे", latin: "Re" },
  { devanagari: "|", latin: "|" },
];
