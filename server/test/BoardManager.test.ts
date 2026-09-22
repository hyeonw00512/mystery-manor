import assert from "node:assert/strict";
import test from "node:test";
import { board, characters } from "@mystery/shared";
import { boardManager } from "../src/game/BoardManager.js";

test("보드의 모든 연결과 비밀 통로가 유효하다", () => {
  assert.doesNotThrow(() => boardManager.validate());
  assert.equal(board.nodes.filter((node) => node.type === "ROOM").length, 9);
  assert.equal(new Set(board.nodes.map((node) => node.id)).size, board.nodes.length);
});

test("모든 캐릭터의 시작 칸이 존재한다", () => {
  for (const character of characters) {
    const node = boardManager.getStartingNode(character.id);
    assert.equal(node.id, character.startNodeId);
    assert.equal(node.type, "CORRIDOR");
  }
});

test("BFS는 이동 거리 이하 칸만 반환하고 중간 장소를 통과하지 않는다", () => {
  const oneStep = boardManager.getReachableNodeIds("corridor_top_left_1", 1, false);
  assert.deepEqual(new Set(oneStep), new Set(["room_archive", "corridor_top_left_2"]));
  const fromRoom = boardManager.getReachableNodeIds("room_archive", 1, true);
  assert.ok(fromRoom.includes("room_dining"));
  const throughRoom = boardManager.getReachableNodeIds("corridor_top_left_1", 3, false);
  assert.ok(!throughRoom.includes("corridor_left_top_1"));
});
