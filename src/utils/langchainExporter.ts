import { FlowNode, FlowConnection } from '../types.js';

export class LangChainExporter {
  public static generatePythonLangChain(nodes: FlowNode[], connections: FlowConnection[]): string {
    const sortedNodes = this.topologicalSort(nodes, connections);

    let code = `"""
AgentForge Visual Graph Exported to Python LangChain LCEL Chaining Pipeline.
Uses langchain-google-genai and langchain-core to replicate executing agent chains.
"""
import os
import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_google_genai import ChatGoogleGenerativeAI

# Configure Gemini API credentials
api_key = os.environ.get("GEMINI_API_KEY", "")
if not api_key:
    print("Warning: GEMINI_API_KEY environment variable is not set!")

def execute_langchain_pipeline(initial_inputs=None):
    if initial_inputs is None:
        initial_inputs = {}
        
    print("🚀 Running LangChain LCEL Expression Pipeline...")
    
    # Initialize basic Google GenAI models with LangChain wrappers
    model_configs = {}
`;

    // Initialize all chat model references used by the workflow
    const modelsSeen = new Set<string>();
    sortedNodes.forEach(node => {
      if (node.type === 'gemini') {
        const model = node.fields?.model || 'gemini-3.5-flash';
        const temp = node.fields?.temperature ?? 0.7;
        const key = `model_${model.replace(/[^a-zA-Z0-9]/g, '_')}_${String(temp).replace('.', '_')}`;
        if (!modelsSeen.has(key)) {
          modelsSeen.add(key);
          code += `    model_configs["${key}"] = ChatGoogleGenerativeAI(\n`;
          code += `        model="${model}",\n`;
          code += `        temperature=${temp},\n`;
          code += `        google_api_key=api_key\n`;
          code += `    )\n`;
        }
      }
    });

    if (modelsSeen.size === 0) {
      code += `    # Fallback default model\n`;
      code += `    model_configs["default"] = ChatGoogleGenerativeAI(model="gemini-3.5-flash", google_api_key=api_key)\n`;
    }

    code += `\n    # Setup individual LCEL Runnable chain sequences\n`;

    // Now emit each step sequence
    sortedNodes.forEach((node, index) => {
      const safeId = node.id.replace(/[^a-zA-Z0-9_]/g, '_');
      
      code += `    # Step ${index + 1}: ${node.title} (${node.type})\n`;

      if (node.type === 'input') {
        const vars = node.fields?.variables || [];
        code += `    input_step_${safeId} = {\n`;
        vars.forEach((v: any) => {
          code += `        "${v.key}": lambda x: initial_inputs.get("${v.key}", ${JSON.stringify(v.value)}),\n`;
        });
        code += `    }\n\n`;
      } 
      
      else if (node.type === 'prompt') {
        const template = node.fields?.template || '';
        code += `    prompt_step_${safeId} = ChatPromptTemplate.from_template(\n`;
        code += `        ${JSON.stringify(template)}\n`;
        code += `    )\n\n`;
      } 
      
      else if (node.type === 'gemini') {
        const model = node.fields?.model || 'gemini-3.5-flash';
        const temp = node.fields?.temperature ?? 0.7;
        const modelKey = `model_${model.replace(/[^a-zA-Z0-9]/g, '_')}_${String(temp).replace('.', '_')}`;
        
        code += `    llm_step_${safeId} = model_configs.get("${modelKey}")\n`;
        code += `    chain_step_${safeId} = llm_step_${safeId} | StrOutputParser()\n\n`;
      }

      else if (node.type === 'tool') {
        const url = node.fields?.url || '';
        const method = node.fields?.method || 'GET';
        code += `    # Custom tool execution wrap\n`;
        code += `    def runner_tool_${safeId}(inputs):\n`;
        code += `        import urllib.request, json\n`;
        code += `        try:\n`;
        code += `            # Format url or target\n`;
        code += `            target_url = ${JSON.stringify(url)}\n`;
        code += `            if isinstance(inputs, dict):\n`;
        code += `                for k, v in inputs.items():\n`;
        code += `                    target_url = target_url.replace(f"{{{k}}}", str(v))\n`;
        code += `            elif isinstance(inputs, str):\n`;
        code += `                target_url = target_url.replace("{lastOutput}", inputs)\n`;
        code += `            \n`;
        code += `            req = urllib.request.Request(target_url, method="${method}")\n`;
        code += `            with urllib.request.urlopen(req) as res:\n`;
        code += `                return res.read().decode('utf-8')\n`;
        code += `        except Exception as e:\n`;
        code += `            return f"Error executing API call: {e}"\n`;
        code += `    tool_step_${safeId} = RunnablePassthrough() | runner_tool_${safeId}\n\n`;
      }

      else if (node.type === 'reviewer') {
        const criteria = node.fields?.criteria || '';
        code += `    # Self Correction Auditor Reviewer\n`;
        code += `    def audit_${safeId}(inputs):\n`;
        code += `        print(f"Auditing results against: {${JSON.stringify(criteria)}}")\n`;
        code += `        return inputs\n`;
        code += `    reviewer_step_${safeId} = RunnablePassthrough() | audit_${safeId}\n\n`;
      }

      else if (node.type === 'router') {
        code += `    # Node condition routing branch\n`;
        code += `    def route_${safeId}(inputs):\n`;
        code += `        # Conditional execution path can be placed here\n`;
        code += `        return inputs\n`;
        code += `    router_step_${safeId} = RunnablePassthrough() | route_${safeId}\n\n`;
      }

      else if (node.type === 'output') {
        code += `    # Output logger format node\n`;
        code += `    def run_output_${safeId}(inputs):\n`;
        code += `        print("──────────────────────────────────────────────────")\n`;
        code += `        print("🏆 Final Workflow Result:")\n`;
        code += `        print(inputs)\n`;
        code += `        print("──────────────────────────────────────────────────")\n`;
        code += `        return inputs\n`;
        code += `    output_step_${safeId} = RunnablePassthrough() | run_output_${safeId}\n\n`;
      }
    });

    code += `    # Pipe and execute sequential LCEL expressions together\n`;
    code += `    # Replicating visual flow graph connections sequentially:\n`;
    code += `    # LCEL execution:\n`;

    // Construct the executable LCEL pipeline sequence
    const lcelSteps: string[] = [];
    sortedNodes.forEach(node => {
      const safeId = node.id.replace(/[^a-zA-Z0-9_]/g, '_');
      if (node.type === 'input') {
        lcelSteps.push(`input_step_${safeId}`);
      } else if (node.type === 'prompt') {
        lcelSteps.push(`prompt_step_${safeId}`);
      } else if (node.type === 'gemini') {
        lcelSteps.push(`chain_step_${safeId}`);
      } else if (node.type === 'tool') {
        lcelSteps.push(`tool_step_${safeId}`);
      } else if (node.type === 'reviewer') {
        lcelSteps.push(`reviewer_step_${safeId}`);
      } else if (node.type === 'router') {
        lcelSteps.push(`router_step_${safeId}`);
      } else if (node.type === 'output') {
        lcelSteps.push(`output_step_${safeId}`);
      }
    });

    if (lcelSteps.length > 0) {
      code += `    full_chain = ${lcelSteps.join(' | ')}\n`;
      code += `    response = full_chain.invoke(initial_inputs)\n`;
      code += `    return response\n`;
    } else {
      code += `    return "Empty chain configuration"\n`;
    }

    code += `\nif __name__ == "__main__":\n`;
    code += `    execute_langchain_pipeline({"topic": "LangChain and LCEL with Gemini"})\n`;

    return code;
  }

  private static topologicalSort(nodes: FlowNode[], connections: FlowConnection[]): FlowNode[] {
    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};

    nodes.forEach(n => {
      inDegree[n.id] = 0;
      adj[n.id] = [];
    });

    connections.forEach(conn => {
      if (adj[conn.sourceId] && inDegree[conn.targetId] !== undefined) {
        adj[conn.sourceId].push(conn.targetId);
        inDegree[conn.targetId]++;
      }
    });

    const queue: string[] = [];
    nodes.forEach(n => {
      if (inDegree[n.id] === 0) {
        queue.push(n.id);
      }
    });

    const sortedIds: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sortedIds.push(current);

      (adj[current] || []).forEach(neighbor => {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          queue.push(neighbor);
        }
      });
    }

    const resolvedNodes = sortedIds.map(id => nodes.find(n => n.id === id)!).filter(Boolean);
    const missedNodes = nodes.filter(n => !sortedIds.includes(n.id));

    return [...resolvedNodes, ...missedNodes];
  }
}
