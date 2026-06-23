import { FlowConnection } from '../../types.js';

export class CycleDetector {
  /**
   * Detect back-edges in the flow graph starting from the input nodes using DFS.
   * Returns a set of "sourceId->targetId" strings representing back-edges.
   */
  static detectBackEdges(inputNodeIds: string[], connections: FlowConnection[]): Set<string> {
    const backEdges = new Set<string>();
    const visited = new Set<string>();
    const path = new Set<string>();

    function dfs(nodeId: string) {
      visited.add(nodeId);
      path.add(nodeId);

      const outgoing = connections.filter(c => c.sourceId === nodeId);
      for (const conn of outgoing) {
        if (path.has(conn.targetId)) {
          backEdges.add(`${conn.sourceId}->${conn.targetId}`);
        } else if (!visited.has(conn.targetId)) {
          dfs(conn.targetId);
        }
      }

      path.delete(nodeId);
    }

    inputNodeIds.forEach(id => dfs(id));
    return backEdges;
  }
}
