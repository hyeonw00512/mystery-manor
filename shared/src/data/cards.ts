import type { Card } from "../types.js";

export const suspects: Card[] = [
  { id: "suspect_archivist", type: "SUSPECT", name: "기록보관인", icon: "A" },
  { id: "suspect_cartographer", type: "SUSPECT", name: "지도제작자", icon: "M" },
  { id: "suspect_botanist", type: "SUSPECT", name: "식물학자", icon: "B" },
  { id: "suspect_watchmaker", type: "SUSPECT", name: "시계공", icon: "W" },
  { id: "suspect_reporter", type: "SUSPECT", name: "탐사기자", icon: "R" },
  { id: "suspect_curator", type: "SUSPECT", name: "전시기획자", icon: "C" }
];

export const locations: Card[] = [
  { id: "location_archive", type: "LOCATION", name: "비밀 기록실", icon: "01" },
  { id: "location_greenhouse", type: "LOCATION", name: "유리 온실", icon: "02" },
  { id: "location_gallery", type: "LOCATION", name: "밤의 화랑", icon: "03" },
  { id: "location_observatory", type: "LOCATION", name: "천문 관측실", icon: "04" },
  { id: "location_workshop", type: "LOCATION", name: "기계 작업실", icon: "05" },
  { id: "location_library", type: "LOCATION", name: "원형 서고", icon: "06" },
  { id: "location_conservatory", type: "LOCATION", name: "음악 연습실", icon: "07" },
  { id: "location_courtyard", type: "LOCATION", name: "안개 중정", icon: "08" },
  { id: "location_dining", type: "LOCATION", name: "연회 식당", icon: "09" }
];

export const items: Card[] = [
  { id: "item_compass", type: "ITEM", name: "황동 나침반", icon: "⌖" },
  { id: "item_key", type: "ITEM", name: "검은 열쇠", icon: "⌘" },
  { id: "item_lens", type: "ITEM", name: "균열 난 렌즈", icon: "◉" },
  { id: "item_cane", type: "ITEM", name: "은장 지팡이", icon: "⌁" },
  { id: "item_letter", type: "ITEM", name: "봉인된 편지", icon: "✉" },
  { id: "item_gear", type: "ITEM", name: "태엽 장치", icon: "⚙" }
];

export const allCards: Card[] = [...suspects, ...locations, ...items];
