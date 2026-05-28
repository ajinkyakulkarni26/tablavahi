import type { TablaDesign } from "../types/media";

export const TABLA_DESIGNS: TablaDesign[] = [
  {
    id: "classic",
    name: "Classic Vahi",
    nameMarathi: "क्लासिक वही",
    descriptionMarathi:
      "सौम्य पर्चमेंट पार्श्वभूमी — गुरुकुल वहितल्या नोटेशनसारखे वाचण्यास अनुकूल.",
    themeId: "classic",
  },
  {
    id: "warm-guru",
    name: "Warm Guru",
    nameMarathi: "उबदार गुरू",
    descriptionMarathi:
      "साफ्रन आणि तपकिरी रंग अधिक — समर्पण आणि परंपरेवर भर.",
    themeId: "warm-guru",
  },
  {
    id: "ink-contrast",
    name: "Ink Contrast",
    nameMarathi: "इंक कॉन्ट्रास्ट",
    descriptionMarathi:
      "तीव्र काळा-पांढरा कॉन्ट्रास्ट — प्रदर्शन किंवा प्रिंटसाठी स्पष्ट.",
    themeId: "ink-contrast",
  },
  {
    id: "minimal",
    name: "Minimal",
    nameMarathi: "मिनिमल",
    descriptionMarathi:
      "साधी पांढरी पार्श्वभूमी — फक्त बोल आणि खुणांवर लक्ष.",
    themeId: "minimal",
  },
];

export function getTablaDesign(id: string): TablaDesign | undefined {
  return TABLA_DESIGNS.find((d) => d.id === id);
}

export const DEFAULT_DESIGN_ID = "classic";
