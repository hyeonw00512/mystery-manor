import type { Character } from "../types.js";

export const characters: Character[] = [
  { id: "char_ember", name: "기록보관인", role: "봉인 문서의 수호자", color: "#e34b52", initials: "A", startNodeId: "corridor_top_left_1" },
  { id: "char_noir", name: "지도제작자", role: "저택 지도를 그린 사람", color: "#3778e6", initials: "M", startNodeId: "corridor_top_right_1" },
  { id: "char_ivy", name: "식물학자", role: "온실을 관리하는 연구자", color: "#27a66d", initials: "B", startNodeId: "corridor_left_bottom_1" },
  { id: "char_lumen", name: "시계공", role: "멈춘 태엽의 주인", color: "#e5a72f", initials: "W", startNodeId: "corridor_right_bottom_1" },
  { id: "char_sable", name: "탐사기자", role: "사건을 기록하는 목격자", color: "#9a5be0", initials: "R", startNodeId: "corridor_bottom_left_1" },
  { id: "char_frost", name: "전시기획자", role: "화랑의 비밀을 아는 사람", color: "#20afce", initials: "C", startNodeId: "corridor_bottom_right_1" }
];
