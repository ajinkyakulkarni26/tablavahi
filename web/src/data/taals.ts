import type { Taal } from "../types";

export const TAALS: Taal[] = [
  {
    id: "teentaal",
    name: "Teentaal",
    nameDevanagari: "तीनताल",
    matras: 16,
    vibhag: [4, 4, 4, 4],
    samMatra: 1,
    khaliMatra: 9,
    taaliMatras: [5, 13],
  },
  {
    id: "ektaal",
    name: "Ektaal",
    nameDevanagari: "एकताल",
    matras: 12,
    vibhag: [2, 2, 2, 2, 2, 2],
    samMatra: 1,
    khaliMatra: 7,
    taaliMatras: [5, 11],
  },
  {
    id: "jhaptaal",
    name: "Jhaptaal",
    nameDevanagari: "झपताल",
    matras: 10,
    vibhag: [2, 3, 2, 3],
    samMatra: 1,
    khaliMatra: 6,
    taaliMatras: [4, 9],
  },
  {
    id: "rupak",
    name: "Rupak",
    nameDevanagari: "रूपक",
    matras: 7,
    vibhag: [3, 2, 2],
    samMatra: 1,
    khaliMatra: 4,
    taaliMatras: [],
  },
  {
    id: "dadra",
    name: "Dadra",
    nameDevanagari: "दादरा",
    matras: 6,
    vibhag: [3, 3],
    samMatra: 1,
    khaliMatra: 4,
    taaliMatras: [],
  },
];

export function getTaal(id: string): Taal | undefined {
  return TAALS.find((t) => t.id === id);
}
