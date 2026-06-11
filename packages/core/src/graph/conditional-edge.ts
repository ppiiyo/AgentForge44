import { EdgeSpec, GraphState } from "./types.js";

/**
 * Conditional Router evaluates dynamic logic criteria to direct agent flow paths
 */
export class ConditionalEdgeEvaluator {
  static evaluate(edges: EdgeSpec[], state: GraphState): EdgeSpec | null {
    const activeEdges = edges.filter(e => e.condition);
    if (activeEdges.length === 0) {
      return edges[0] || null;
    }

    for (const edge of activeEdges) {
      if (!edge.condition) continue;

      try {
        // Evaluate isolated expression inside safe parameters scope
        const evaluateFn = new Function("values", `
          const { lastOutput } = values;
          return !!(${edge.condition});
        `);
        if (evaluateFn(state.values) === true) {
          return edge;
        }
      } catch (err) {
        console.warn(`Conditional edge evaluation threw error for expression '${edge.condition}':`, err);
      }
    }

    // Default connection fallback
    return edges.find(e => !e.condition) || edges[0] || null;
  }
}
