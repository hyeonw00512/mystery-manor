import type { BoardDefinition, BoardNode, BoardNodeType } from "../types.js";

type NodeSeed = Omit<BoardNode, "connections">;
const room = (id: string, name: string, locationId: string, x: number, y: number, secretPassage?: string): NodeSeed => ({ id, type: "ROOM", name, locationId, x, y, secretPassage });
const corridor = (id: string, x: number, y: number): NodeSeed => ({ id, type: "CORRIDOR", x, y });

const nodeSeeds: NodeSeed[] = [
  room("room_archive", "비밀 기록실", "location_archive", 100, 80, "room_dining"),
  room("room_greenhouse", "유리 온실", "location_greenhouse", 500, 70),
  room("room_gallery", "밤의 화랑", "location_gallery", 900, 80, "room_library"),
  room("room_observatory", "천문 관측실", "location_observatory", 100, 350),
  room("room_courtyard", "안개 중정", "location_courtyard", 500, 350),
  room("room_workshop", "기계 작업실", "location_workshop", 900, 350),
  room("room_library", "원형 서고", "location_library", 100, 620, "room_gallery"),
  room("room_conservatory", "음악 연습실", "location_conservatory", 500, 630),
  room("room_dining", "연회 식당", "location_dining", 900, 620, "room_archive"),
  corridor("corridor_top_left_1", 235, 80), corridor("corridor_top_left_2", 360, 80),
  corridor("corridor_top_right_1", 640, 80), corridor("corridor_top_right_2", 765, 80),
  corridor("corridor_left_top_1", 100, 180), corridor("corridor_left_top_2", 100, 255),
  corridor("corridor_left_bottom_1", 100, 445), corridor("corridor_left_bottom_2", 100, 520),
  corridor("corridor_right_top_1", 900, 180), corridor("corridor_right_top_2", 900, 255),
  corridor("corridor_right_bottom_1", 900, 445), corridor("corridor_right_bottom_2", 900, 520),
  corridor("corridor_mid_left_1", 235, 350), corridor("corridor_mid_left_2", 360, 350),
  corridor("corridor_mid_right_1", 640, 350), corridor("corridor_mid_right_2", 765, 350),
  corridor("corridor_vertical_top_1", 500, 175), corridor("corridor_vertical_top_2", 500, 255),
  corridor("corridor_vertical_bottom_1", 500, 445), corridor("corridor_vertical_bottom_2", 500, 525),
  corridor("corridor_bottom_left_1", 235, 620), corridor("corridor_bottom_left_2", 360, 620),
  corridor("corridor_bottom_right_1", 640, 620), corridor("corridor_bottom_right_2", 765, 620)
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
  height: 700,
  nodes: nodeSeeds.map((node) => ({ ...node, connections: connections.get(node.id) ?? [] }))
};

export const boardNodeById = new Map(board.nodes.map((node) => [node.id, node]));
export const boardNodesByType = (type: BoardNodeType): BoardNode[] => board.nodes.filter((node) => node.type === type);
