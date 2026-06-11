import { NodeSpec, GraphState, EdgeSpec } from "./types.js";
import { GraphExecutor } from "./executor.js";
import { LLMProvider } from "../providers/types.js";

/**
 * Handles executing nested flow graphs within a parent engine context
 */
export class SubgraphRunner {
  private provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  async runSubgraph(subgraphNode: NodeSpec, parentState: GraphState): Promise<GraphState> {
    const config = subgraphNode.subgraphConfig;
    if (!config || !config.nodes || config.nodes.length === 0) {
      throw new Error(`Invalid Subgraph configuration on node: ${subgraphNode.id}`);
    }

    const subExecutor = new GraphExecutor(config.nodes, config.connections, this.provider);
    
    // Inject parent state fields into isolated child graph memory scope
    const subStateInput = { ...parentState.values };
    
    const resultState = await subExecutor.execute(subStateInput, `subgraph_${subgraphNode.id}`);
    return resultState;
  }
}
