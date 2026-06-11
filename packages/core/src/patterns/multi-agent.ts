import { NodeSpec, EdgeSpec, GraphSpec } from "../graph/types.js";

/**
 * Visual multi-agent pipeline generator factory.
 * Pre-packages configurations for industry standard multi-agent patterns.
 */
export class MultiAgentPatternsFactory {
  
  /**
   * Supervisor Pattern:
   * A single master director LLM routes incoming intents to specialized worker nodes.
   */
  static createSupervisorPattern(): GraphSpec {
    const nodes: NodeSpec[] = [
      {
        id: "supervisor-node",
        type: "gemini",
        title: "Router Supervisor",
        fields: {
          systemInstruction: "You are the Agent Supervisor. Classify the task into: 'coder', 'writer', or 'researcher'. Output ONLY the single chosen word class.",
          temperature: 0.1
        }
      },
      {
        id: "coder-agent",
        type: "gemini",
        title: "Software Engineer",
        fields: {
          systemInstruction: "You are a professional software engineer. Provide high-quality TypeScript code solutions.",
          temperature: 0.2
        }
      },
      {
        id: "writer-agent",
        type: "gemini",
        title: "Technical Copywriter",
        fields: {
          systemInstruction: "You are a technical document writer. Produce clean, readable, well-formatted Markdown documentation.",
          temperature: 0.7
        }
      },
      {
        id: "output-node",
        type: "output",
        title: "Consolidated Delivery",
        fields: {}
      }
    ];

    const connections: EdgeSpec[] = [
      {
        id: "route-coder",
        sourceId: "supervisor-node",
        targetId: "coder-agent",
        condition: "lastOutput.toLowerCase().includes('coder')"
      },
      {
        id: "route-writer",
        sourceId: "supervisor-node",
        targetId: "writer-agent",
        condition: "lastOutput.toLowerCase().includes('writer') || lastOutput.toLowerCase().includes('research')"
      },
      {
        id: "coder-to-out",
        sourceId: "coder-agent",
        targetId: "output-node"
      },
      {
        id: "writer-to-out",
        sourceId: "writer-agent",
        targetId: "output-node"
      }
    ];

    return { nodes, connections };
  }

  /**
   * Debate/Consensus Pattern:
   * Multiple models argue their answers independently; a judge node converges onto the final truth.
   */
  static createDebatePattern(): GraphSpec {
    return {
      nodes: [
        {
          id: "debater-optimist",
          type: "gemini",
          title: "Optimist Agent",
          fields: {
            systemInstruction: "Support the argument with positive reasons and structural opportunities.",
            temperature: 0.8
          }
        },
        {
          id: "debater-pessimist",
          type: "gemini",
          title: "Skeptic/Critic Critic",
          fields: {
            systemInstruction: "Analyze all vulnerabilities, bugs, security risks, and technical debt constraints.",
            temperature: 0.4
          }
        },
        {
          id: "referee-judge",
          type: "gemini",
          title: "Referee / Moderator Node",
          fields: {
            systemInstruction: "Synthesize the positive points and active critiques. Produce a unified, secure middleground resolution.",
            temperature: 0.2
          }
        }
      ],
      connections: [
        { id: "opt-to-ref", sourceId: "debater-optimist", targetId: "referee-judge" },
        { id: "pes-to-ref", sourceId: "debater-pessimist", targetId: "referee-judge" }
      ]
    };
  }
}
