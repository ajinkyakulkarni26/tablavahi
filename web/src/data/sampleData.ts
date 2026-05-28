import type { Composition, CompositionLine } from "../types";
import { applyTaalMarkers, emptyLine } from "../lib/annotations";
import { getTaal } from "./taals";

const teentaal = getTaal("teentaal")!;

function line(bols: string[]): CompositionLine {
  const cells = emptyLine(teentaal.matras).map((cell, i) => ({
    ...cell,
    devanagari: bols[i] ?? "",
  }));
  return { cells: applyTaalMarkers(cells, teentaal) };
}

const now = new Date().toISOString();

/** Sample Teentaal Kayda — replace with your own guru's compositions */
export const SAMPLE_COMPOSITIONS: Composition[] = [
  {
    id: "sample-teentaal-kayda-1",
    taalId: "teentaal",
    kind: "kayda",
    title: "Teentaal Kayda (Sample)",
    titleDevanagari: "तीनताल कायदा",
    guruNote:
      "हे नमुना स्वरूप दाखवण्यासाठी आहे. तुमच्या तबला वहीतून तुमचे खरे कायदा येथे भरा.",
    lines: [
      line([
        "धा", "धा", "धा", "धा", "धा", "धा", "धा", "न",
        "तित", "धा", "धा", "धा", "धा", "धा", "धा", "न",
      ]),
      line([
        "धा", "धिन", "धा", "धा", "धा", "धिन", "धा", "न",
        "तित", "धा", "धिन", "धा", "धा", "धिन", "धा", "न",
      ]),
      line([
        "धा", "धा", "त", "क", "त", "धा", "धा", "न",
        "तित", "धा", "धा", "त", "क", "त", "धा", "न",
      ]),
      line([
        "धा", "धा", "धा", "धा", "गे", "ना", "ती", "ना",
        "क", "धा", "धा", "धा", "गे", "ना", "ती", "ना",
      ]),
    ],
    notes: "Sam (×) on matra 1, Taali 2 & 3 on 5 & 13, Khali (०) on 9.",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "sample-teentaal-peshkar-1",
    taalId: "teentaal",
    kind: "peshkar",
    title: "Teentaal Peshkar (Sample)",
    titleDevanagari: "तीनताल पेशकार",
    lines: [
      line([
        "धा", "धा", "न", "न", "ना", "ना", "न", "न",
        "धा", "धा", "न", "न", "ना", "ना", "न", "न",
      ]),
    ],
    createdAt: now,
    updatedAt: now,
  },
];
