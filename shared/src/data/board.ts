import type { BoardDefinition, BoardNode, BoardNodeType } from "../types.js";

type NodeSeed = Omit<BoardNode, "connections">;
const room = (id: string, name: string, locationId: string, x: number, y: number, secretPassage?: string): NodeSeed => ({ id, type: "ROOM", name, locationId, x, y, secretPassage });
const corridor = (id: string, x: number, y: number): NodeSeed => ({ id, type: "CORRIDOR", x, y });

const nodeSeeds: NodeSeed[] = [
  room("room_archive", "비밀 기록실", "location_archive", 185, 165, "room_dining"),
  room("room_greenhouse", "유리 온실", "location_greenhouse", 500, 145),
  room("room_gallery", "밤의 화랑", "location_gallery", 820, 165, "room_library"),
  room("room_observatory", "천문 관측실", "location_observatory", 185, 485),
  room("room_courtyard", "안개 중정", "location_courtyard", 500, 455),
  room("room_workshop", "기계 작업실", "location_workshop", 820, 485),
  room("room_library", "원형 서고", "location_library", 185, 790, "room_gallery"),
  room("room_conservatory", "음악 연습실", "location_conservatory", 500, 790),
  room("room_dining", "연회 식당", "location_dining", 820, 790, "room_archive"),
  corridor("corridor_top_left_1", 310, 165), corridor("corridor_top_left_2", 395, 165),
  corridor("corridor_top_right_1", 605, 165), corridor("corridor_top_right_2", 700, 165),
  corridor("corridor_left_top_1", 185, 280), corridor("corridor_left_top_2", 185, 380),
  corridor("corridor_left_bottom_1", 185, 600), corridor("corridor_left_bottom_2", 185, 690),
  corridor("corridor_right_top_1", 820, 280), corridor("corridor_right_top_2", 820, 380),
  corridor("corridor_right_bottom_1", 820, 600), corridor("corridor_right_bottom_2", 820, 690),
  corridor("corridor_mid_left_1", 310, 455), corridor("corridor_mid_left_2", 395, 455),
  corridor("corridor_mid_right_1", 605, 455), corridor("corridor_mid_right_2", 700, 455),
  corridor("corridor_vertical_top_1", 500, 270), corridor("corridor_vertical_top_2", 500, 375),
  corridor("corridor_vertical_bottom_1", 500, 600), corridor("corridor_vertical_bottom_2", 500, 690),
  corridor("corridor_bottom_left_1", 310, 790), corridor("corridor_bottom_left_2", 395, 790),
  corridor("corridor_bottom_right_1", 605, 790), corridor("corridor_bottom_right_2", 700, 790)
];

export const boardEdges: ReadonlyArray<readonly [string, string]> = [
  ["room_archive", "corridor_top_left_1"], ["corridor_top_left_1", "corridor_top_left_2"], ["corridor_top_left_2", "room_greenhouse"],
  ["room_greenhouse", "corridor_top_right_1"], ["corridor_top_right_1", "corridor_top_right_2"], ["corridor_top_right_2", "room_gallery"],
  ["room_archive", "corridor_left_top_1"], ["corridor_left_top_1", "corridor_left_top_2"], ["corridor_left_top_2", "room_observatory"],
  ["room_observatory", "corridor_left_bottom_1"], ["corridor_left_bottom_1", "corridor_left_bottom_2"], ["corridor_left_bottom_2", "room_library"],
  ["room_gallery", "corridor_right_top_1"], ["corridor_right_top_1", "corridor_right_top_2"], ["corridor_right_top_2", "room_workshop"],
  ["room_workshop", "corridor_right_bottom_1"], ["corridor_right_bottom_1", "corridor_right_bottom_2"], ["corridor_right_bottom_2", "room_dining"],
  ["room_observatory", "corridor_mid_left_1"], ["corridor_mid_left_1", "corridor_mid_left_2"], ["corridor_mid_left_2", "room_courtyard"],
  ["room_courtyard", "corridor_mid_right_1"], ["corridor_mid_right_1", "corridor_mid_right_2"], ["corridor_mid_right_2", "room_workshop"],
  ["room_greenhouse", "corridor_vertical_top_1"], ["corridor_vertical_top_1", "corridor_vertical_top_2"], ["corridor_vertical_top_2", "room_courtyard"],
  ["room_courtyard", "corridor_vertical_bottom_1"], ["corridor_vertical_bottom_1", "corridor_vertical_bottom_2"], ["corridor_vertical_bottom_2", "room_conservatory"],
  ["room_library", "corridor_bottom_left_1"], ["corridor_bottom_left_1", "corridor_bottom_left_2"], ["corridor_bottom_left_2", "room_conservatory"],
  ["room_conservatory", "corridor_bottom_right_1"], ["corridor_bottom_right_1", "corridor_bottom_right_2"], ["corridor_bottom_right_2", "room_dining"],
  ["corridor_top_left_2", "corridor_vertical_top_1"], ["corridor_top_right_1", "corridor_vertical_top_1"],
  ["corridor_left_top_2", "corridor_mid_left_1"], ["corridor_left_bottom_1", "corridor_mid_left_1"],
  ["corridor_right_top_2", "corridor_mid_right_2"], ["corridor_right_bottom_1", "corridor_mid_right_2"],
  ["corridor_bottom_left_2", "corridor_vertical_bottom_2"], ["corridor_bottom_right_1", "corridor_vertical_bottom_2"]
];

const connections = new Map<string, string[]>();
for (const node of nodeSeeds) connections.set(node.id, []);
for (const [from, to] of boardEdges) { connections.get(from)?.push(to); connections.get(to)?.push(from); }

export const board: BoardDefinition = {
  id: "midnight_manor_v1",
  name: "흑야 저택",
  width: 1000,
  height: 1000,
  nodes: nodeSeeds.map((node) => ({ ...node, connections: connections.get(node.id) ?? [] }))
};

export const boardNodeById = new Map(board.nodes.map((node) => [node.id, node]));
export const boardNodesByType = (type: BoardNodeType): BoardNode[] => board.nodes.filter((node) => node.type === type);
