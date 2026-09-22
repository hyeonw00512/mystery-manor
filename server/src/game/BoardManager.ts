import { board, boardNodeById, characters, type BoardNode } from "@mystery/shared";

export class BoardManager {
  readonly board = board;

  getNode(nodeId: string): BoardNode {
    const node = boardNodeById.get(nodeId);
    if (!node) throw new Error(`보드에서 ${nodeId} 칸을 찾을 수 없습니다.`);
    return node;
  }

  getStartingNode(characterId: string): BoardNode {
    const character = characters.find((candidate) => candidate.id === characterId);
    if (!character) throw new Error("캐릭터의 시작 위치를 찾을 수 없습니다.");
    return this.getNode(character.startNodeId);
  }

  validate(): void {
    for (const node of this.board.nodes) {
      for (const connectionId of node.connections) {
        const connected = this.getNode(connectionId);
        if (!connected.connections.includes(node.id)) throw new Error(`${node.id}와 ${connectionId}의 연결이 대칭이 아닙니다.`);
      }
      if (node.secretPassage) this.getNode(node.secretPassage);
    }
  }

  getReachableNodeIds(startNodeId: string, steps: number, useSecretPassages: boolean): string[] {
    if (!Number.isInteger(steps) || steps < 1) return [];
    this.getNode(startNodeId);
    const distances = new Map<string, number>([[startNodeId, 0]]);
    const queue = [startNodeId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const current = this.getNode(currentId);
      const distance = distances.get(currentId)!;
      if (distance >= steps) continue;
      if (current.type === "ROOM" && currentId !== startNodeId) continue;
      const connections = [...current.connections];
      if (useSecretPassages && current.secretPassage) connections.push(current.secretPassage);
      for (const nextId of connections) {
        if (distances.has(nextId)) continue;
        distances.set(nextId, distance + 1);
        queue.push(nextId);
      }
    }
    return [...distances.entries()].filter(([nodeId, distance]) => nodeId !== startNodeId && distance <= steps).map(([nodeId]) => nodeId);
  }
}

export const boardManager = new BoardManager();
