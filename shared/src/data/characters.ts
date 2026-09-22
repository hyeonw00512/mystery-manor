import type { Character } from "../types.js";

export const characters: Character[] = [
  { id: "char_ember", name: "엠버", role: "암호 해독가", color: "#c96d3b", initials: "EM", startNodeId: "corridor_top_left_1" },
  { id: "char_noir", name: "누아르", role: "야간 경비원", color: "#53658c", initials: "NO", startNodeId: "corridor_top_right_1" },
  { id: "char_ivy", name: "아이비", role: "고문서 연구원", color: "#4f8068", initials: "IV", startNodeId: "corridor_left_bottom_1" },
  { id: "char_lumen", name: "루멘", role: "조명 기술자", color: "#b38b3e", initials: "LU", startNodeId: "corridor_right_bottom_1" },
  { id: "char_sable", name: "세이블", role: "보험 조사관", color: "#76577d", initials: "SA", startNodeId: "corridor_bottom_left_1" },
  { id: "char_frost", name: "프로스트", role: "법의학 분석가", color: "#4b8291", initials: "FR", startNodeId: "corridor_bottom_right_1" }
];
