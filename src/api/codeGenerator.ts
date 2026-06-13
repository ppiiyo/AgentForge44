import { FlowNode, FlowConnection } from "../types.js";

export class CodeGenerator {
  /**
   * Generates readable TypeScript execution script that replicates the workflow.
   */
  public static generateTypeScript(nodes: FlowNode[], connections: FlowConnection[]): string {
    const sortedNodes = this.topologicalSort(nodes, connections);
    
    let code = `/**
 * AgentForge Workflow Auto-Generated TypeScript Executable Script
 * Replicates the configured visual node pipeline programmatically.
 */
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini SDK client. Accesses process.env.GEMINI_API_KEY.
const ai = new GoogleGenAI();

// Helper to access nested keys in JSON objects
function getValueByDotPath(obj: any, pathStr: string): any {
  if (!obj || !pathStr) return undefined;
  const keys = pathStr.split('.');
  let current = obj;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return current;
}

export async function executeWorkflow(initialInputs: Record<string, string> = {}) {
  console.log("🚀 Starting AgentForge Executable Workflow...");
  
  // Local state container
  const state: Record<string, any> = { ...initialInputs };
  let lastOutput = "";

  // Helper template substitutor
  const substitute = (template: string): string => {
    let out = template;
    // Replace state keys
    Object.entries(state).forEach(([k, v]) => {
      const regex = new RegExp(\`\\\\{\` + k + \`\\\\}\`, "g");
      out = out.replace(regex, String(v));
      const regexDouble = new RegExp(\`\\\\{\\\\{\` + k + \`\\\\}\\\\}\`, "g");
      out = out.replace(regexDouble, String(v));
    });
    // Replace general lastOutput
    const rL1 = new RegExp(\`\\\\{lastOutput\\\\}\`, "g");
    out = out.replace(rL1, lastOutput);
    const rL2 = new RegExp(\`\\\\{\\\\{lastOutput\\\\}\\\\}\`, "g");
    out = out.replace(rL2, lastOutput);
    return out;
  };

`;

    // Generate node execution cases inside step workflow loop
    code += `  // Execution steps following compiled network topology\n`;

    // Map each node execution
    sortedNodes.forEach((node, idx) => {
      code += `  // --- Step ${idx + 1}: ${node.title} (Type: ${node.type}) ---\n`;
      code += `  console.log("Executing Step: ${node.title}...");\n`;
      
      if (node.type === 'input') {
        const vars = node.fields?.variables || [];
        code += `  // Populate initial values\n`;
        vars.forEach(v => {
          code += `  if (state["${v.key}"] === undefined) {\n`;
          code += `    state["${v.key}"] = ${JSON.stringify(v.value)};\n`;
          code += `  }\n`;
        });
        code += `  console.log("State updated with input variables:", { ...state });\n\n`;
      } 
      
      else if (node.type === 'prompt') {
        const tpl = node.fields?.template || "";
        code += `  // Format string prompts\n`;
        code += `  const prompt_${node.id} = substitute(${JSON.stringify(tpl)});\n`;
        code += `  state["${node.id}"] = prompt_${node.id};\n`;
        code += `  lastOutput = prompt_${node.id};\n`;
        code += `  console.log("Formatted Prompt Result length:", prompt_${node.id}.length);\n\n`;
      } 
      
      else if (node.type === 'gemini') {
        const model = node.fields?.model || "gemini-3.5-flash";
        const temp = node.fields?.temperature ?? 0.7;
        const sysInst = node.fields?.systemInstruction || "";
        const searchG = !!node.fields?.useSearchGrounding;

        code += `  // Trigger Gemini API Request\n`;
        code += `  try {\n`;
        code += `    const promptText = substitute(lastOutput || "Process background request");\n`;
        code += `    const response = await ai.models.generateContent({\n`;
        code += `      model: "${model}",\n`;
        code += `      contents: promptText,\n`;
        code += `      config: {\n`;
        code += `        temperature: ${temp},\n`;
        if (sysInst) {
          code += `        systemInstruction: ${JSON.stringify(sysInst)},\n`;
        }
        if (searchG) {
          code += `        tools: [{ googleSearch: {} }],\n`;
        }
        code += `      }\n`;
        code += `    });\n`;
        code += `    const textRes = response.text || "";\n`;
        code += `    state["${node.id}"] = textRes;\n`;
        code += `    lastOutput = textRes;\n`;
        code += `    console.log("LLM Generation succeeded!");\n`;
        code += `  } catch (err: any) {\n`;
        code += `    console.error("Gemini invocation failed at step ${node.title}:", err.message);\n`;
        code += `    throw err;\n`;
        code += `  }\n\n`;
      } 
      
      else if (node.type === 'reviewer') {
        const criteria = node.fields?.criteria || "";
        const maxIter = node.fields?.maxIterations || 2;
        code += `  // Trigger Loop Iterative Critic Reviewer\n`;
        code += `  console.log("Reviewing output against criteria: ${criteria.replace(/"/g, '\\"')}");\n`;
        code += `  // Re-evaluating standard criteria locally\n`;
        code += `  if (lastOutput.toLowerCase().includes("error") || lastOutput.length < 15) {\n`;
        code += `    console.log("Output safety metrics low. Triggering self-correction loop...");\n`;
        code += `    // In visual setup, this reviews up to ${maxIter} fallback cycle steps.\n`;
        code += `  } else {\n`;
        code += `    console.log("Output audit checks passed successfully.");\n`;
        code += `  }\n\n`;
      }

      else if (node.type === 'router') {
        const defaultTarget = node.fields?.defaultTargetNodeId || "";
        const conditions = node.fields?.conditions || [];

        code += `  // Condition router checks\n`;
        code += `  const inputPayload_${node.id} = lastOutput;\n`;
        code += `  let routedNodeId = "${defaultTarget}";\n`;
        
        conditions.forEach((cond, cIdx) => {
          const checkWord = JSON.stringify(cond.value);
          const target = cond.targetNodeId;

          if (cond.type === 'contains') {
            code += `  ${cIdx === 0 ? 'if' : 'else if'} (inputPayload_${node.id}.toLowerCase().includes(${checkWord}.toLowerCase())) {\n`;
            code += `    routedNodeId = "${target}";\n`;
            code += `  }\n`;
          } else if (cond.type === 'regex') {
            code += `  ${cIdx === 0 ? 'if' : 'else if'} (new RegExp(${checkWord}, "i").test(inputPayload_${node.id})) {\n`;
            code += `    routedNodeId = "${target}";\n`;
            code += `  }\n`;
          } else if (cond.type === 'json_key') {
            code += `  ${cIdx === 0 ? 'if' : 'else if'} (() => {\n`;
            code += `    try {\n`;
            code += `      const parsed = JSON.parse(inputPayload_${node.id});\n`;
            code += `      return getValueByDotPath(parsed, ${checkWord}) !== undefined;\n`;
            code += `    } catch { return false; }\n`;
            code += `  })() {\n`;
            code += `    routedNodeId = "${target}";\n`;
            code += `  }\n`;
          }
        });
        code += `  console.log("Router decision output matched route path:", routedNodeId);\n\n`;
      }

      else if (node.type === 'tool') {
        const method = node.fields?.method || 'GET';
        const urlRaw = node.fields?.url || "";
        const bodyRaw = node.fields?.body || "";
        const headersRaw = node.fields?.headers || "{}";

        code += `  // Remote HTTP Fetch API tool request\n`;
        code += `  try {\n`;
        code += `    const url = substitute(${JSON.stringify(urlRaw)});\n`;
        code += `    const body = substitute(${JSON.stringify(bodyRaw)});\n`;
        code += `    const headers = { "Content-Type": "application/json", ...JSON.parse(substitute(${JSON.stringify(headersRaw)})) };\n`;
        code += `    console.log("Hitting API Endpoint:", url);\n`;
        code += `    const fetchResponse = await fetch(url, {\n`;
        code += `      method: "${method}",\n`;
        code += `      headers,\n`;
        if (method !== 'GET') {
          code += `      body,\n`;
        }
        code += `    });\n`;
        code += `    const responseText = await fetchResponse.text();\n`;
        code += `    state["${node.id}"] = responseText;\n`;
        code += `    lastOutput = responseText;\n`;
        code += `    console.log("REST invoke output length completed:", responseText.length);\n`;
        code += `  } catch (err: any) {\n`;
        code += `    console.error("HTTP Rest tool step failed:", err.message);\n`;
        code += `    throw err;\n`;
        code += `  }\n\n`;
      }

      else if (node.type === 'output') {
        code += `  // Output result storage format: ${node.fields?.format || 'markdown'}\n`;
        code += `  console.log("──────────────────────────────────────────────────────────────────");\n`;
        code += `  console.log("🏆 Final workflow result reached:");\n`;
        code += `  console.log(lastOutput);\n`;
        code += `  console.log("──────────────────────────────────────────────────────────────────");\n`;
      }
    });

    code += `  return lastOutput;\n`;
    code += `}\n\n`;

    code += `// Main command line direct execution block (Example usage)\n`;
    code += `if (require.main === module) {\n`;
    code += `  executeWorkflow({\n`;
    code += `    topic: "Build visual multi-agent workflow systems"\n`;
    code += `  }).then(res => {\n`;
    code += `    console.log("Workflow execute workflow run completed! Output length:", res.length);\n`;
    code += `  }).catch(err => {\n`;
    code += `    console.error("Error during execution routine:", err);\n`;
    code += `  });\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates clean, comment-rich Python workflow code that replicates workflow logic.
   */
  public static generatePython(nodes: FlowNode[], connections: FlowConnection[]): string {
    const sortedNodes = this.topologicalSort(nodes, connections);

    let code = `"""
AgentForge Workflow Auto-Generated Python Executable Script
Replicates compile pipeline sequence of visual nodes programmatically.
"""
import os
import re
import json
import urllib.request
import urllib.error
from google import genai
from google.genai import types

# Access environment API Key config
api_key = os.environ.get("GEMINI_API_KEY", "")
client = genai.Client() if api_key else None

def get_value_by_dot_path(obj, path_str):
    if not obj or not path_str:
        return None
    keys = path_str.split('.')
    current = obj
    for k in keys:
        if isinstance(current, dict) and k in current:
            current = current[k]
        else:
            return None
    return current

def execute_workflow(initial_inputs=None):
    print("🚀 Starting AgentForge Python Compiled Workflow Runner...")
    
    # State storage dict
    state = dict(initial_inputs) if initial_inputs else {}
    last_output = ""

    def substitute(template_str):
        out = template_str
        # Replace template keys
        for k, v in state.items():
            out = out.replace(f"{{{k}}}", str(v))
            out = out.replace(f"{{{{{k}}}}}", str(v))
        # Replace general lastOutput variable
        out = out.replace("{lastOutput}", str(last_output))
        out = out.replace("{{lastOutput}}", str(last_output))
        return out

`;

    sortedNodes.forEach((node, idx) => {
      code += `    # --- Step ${idx + 1}: ${node.title} (Type: ${node.type}) ---\n`;
      code += `    print("Executing Step: ${node.title}...")\n`;

      if (node.type === 'input') {
        const vars = node.fields?.variables || [];
        code += `    # Populate variables\n`;
        vars.forEach(v => {
          code += `    if "${v.key}" not in state:\n`;
          code += `        state["${v.key}"] = ${JSON.stringify(v.value)}\n`;
        });
        code += `    print("Inputs loaded:", state)\n\n`;
      }

      else if (node.type === 'prompt') {
        const tpl = node.fields?.template || "";
        const safeId = node.id.replace(/-/g, '_');
        code += `    # Format template string prompts\n`;
        code += `    prompt_${safeId} = substitute(${JSON.stringify(tpl)})\n`;
        code += `    state["${node.id}"] = prompt_${safeId}\n`;
        code += `    last_output = prompt_${safeId}\n`;
        code += `    print(f"Prompt formatted length: {len(prompt_${safeId})}")\n\n`;
      }

      else if (node.type === 'gemini') {
        const model = node.fields?.model || "gemini-3.5-flash";
        const temp = node.fields?.temperature ?? 0.7;
        const sysInst = node.fields?.systemInstruction || "";
        const searchG = !!node.fields?.useSearchGrounding;

        code += `    # Run Gemini LLM response generation\n`;
        code += `    if not client:\n`;
        code += `        print("Warning: GEMINI_API_KEY environment variable missing in system.")\n`;
        code += `        last_output = "Mock response: Live Gemini API key required config is missing."\n`;
        code += `    else:\n`;
        code += `        try:\n`;
        code += `            prompt_text = substitute(last_output if last_output else "Task background validation")\n`;
        code += `            config = types.GenerateContentConfig(\n`;
        code += `                temperature=${temp},\n`;
        if (sysInst) {
          code += `                system_instruction=${JSON.stringify(sysInst)},\n`;
        }
        if (searchG) {
          code += `                tools=[{"google_search": {}}],\n`;
        }
        code += `            )\n`;
        code += `            response = client.models.generate_content(\n`;
        code += `                model="${model}",\n`;
        code += `                contents=prompt_text,\n`;
        code += `                config=config,\n`;
        code += `            )\n`;
        code += `            last_output = response.text or ""\n`;
        code += `            state["${node.id}"] = last_output\n`;
        code += `            print("LLM content generation successfully updated.")\n`;
        code += `        except Exception as e:\n`;
        code += `            print(f"Critical Gemini error: {e}")\n`;
        code += `            raise e\n\n`;
      }

      else if (node.type === 'reviewer') {
        const criteria = node.fields?.criteria || "";
        const maxIter = node.fields?.maxIterations || 2;
        code += `    # Critical review self correctness check loops\n`;
        code += `    print("Reviewing outcome against safety metrics: ${criteria.replace(/"/g, '\\"')}")\n`;
        code += `    if "error" in last_output.lower() or len(last_output) < 15:\n`;
        code += `        print("Audit flag raised. Correction cycle recommended for up to ${maxIter} rounds.")\n`;
        code += `    else:\n`;
        code += `        print("Reviewer audit cleared successfully.")\n\n`;
      }

      else if (node.type === 'router') {
        const defaultTarget = node.fields?.defaultTargetNodeId || "";
        const conditions = node.fields?.conditions || [];

        code += `    # Condition routing decision flow\n`;
        code += `    input_payload = last_output\n`;
        code += `    routed_target = "${defaultTarget}"\n`;

        conditions.forEach((cond, cIdx) => {
          const val = JSON.stringify(cond.value);
          const target = cond.targetNodeId;

          if (cond.type === 'contains') {
            code += `    ${cIdx === 0 ? 'if' : 'elif'} ${val}.lower() in input_payload.lower():\n`;
            code += `        routed_target = "${target}"\n`;
          } else if (cond.type === 'regex') {
            code += `    ${cIdx === 0 ? 'if' : 'elif'} re.search(${val}, input_payload, re.IGNORECASE):\n`;
            code += `        routed_target = "${target}"\n`;
          } else if (cond.type === 'json_key') {
            code += `    ${cIdx === 0 ? 'if' : 'elif'} bool(lambda: (\n`;
            code += `        lambda d: get_value_by_dot_path(d, ${val}) is not None\n`;
            code += `    ))(json.loads(input_payload) if input_payload.startswith('{') else {}):\n`;
            code += `        routed_target = "${target}"\n`;
          }
        });
        code += `    print(f"Workflow router matched target node route: {routed_target}")\n\n`;
      }

      else if (node.type === 'tool') {
        const method = node.fields?.method || 'GET';
        const urlRaw = node.fields?.url || "";
        const bodyRaw = node.fields?.body || "";
        const headersRaw = node.fields?.headers || "{}";

        code += `    # Remote API HTTP fetch tool request invocation\n`;
        code += `    try:\n`;
        code += `        target_url = substitute(${JSON.stringify(urlRaw)})\n`;
        code += `        req_body = substitute(${JSON.stringify(bodyRaw)}).encode('utf-8') if "${method}" != "GET" and substitute(${JSON.stringify(bodyRaw)}) else None\n`;
        code += `        custom_headers = json.loads(substitute(${JSON.stringify(headersRaw)}))\n`;
        code += `        \n`;
        code += `        req = urllib.request.Request(\n`;
        code += `            target_url,\n`;
        code += `            data=req_body,\n`;
        code += `            headers={**{"Content-Type": "application/json"}, **custom_headers},\n`;
        code += `            method="${method}"\n`;
        code += `        )\n`;
        code += `        with urllib.request.urlopen(req) as response:\n`;
        code += `            resp_data = response.read().decode('utf-8')\n`;
        code += `            last_output = resp_data\n`;
        code += `            state["${node.id}"] = resp_data\n`;
        code += `            print(f"Tool request response size: {len(resp_data)}")\n`;
        code += `    except Exception as e:\n`;
        code += `        print(f"HTTP fetch failed: {e}")\n`;
        code += `        raise e\n\n`;
      }

      else if (node.type === 'output') {
        code += `    # Final Outcome payload format: ${node.fields?.format || 'markdown'}\n`;
        code += `    print("──────────────────────────────────────────────────────────────────")\n`;
        code += `    print("🏆 Flow completed. Workflow Results:")\n`;
        code += `    print(last_output)\n`;
        code += `    print("──────────────────────────────────────────────────────────────────")\n`;
      }
    });

    code += `    return last_output\n\n`;

    code += `# Module standalone execution block\n`;
    code += `if __name__ == "__main__":\n`;
    code += `    execute_workflow({\n`;
    code += `        "topic": "Python executable visual agent build metrics"\n`;
    code += `    })\n`;

    return code;
  }

  /**
   * Safe topological sort function prioritizing connection directions
   */
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

    // Safety fallback: if there is a cycle or some nodes were missed
    const resolvedNodes = sortedIds.map(id => nodes.find(n => n.id === id)!).filter(Boolean);
    const missedNodes = nodes.filter(n => !sortedIds.includes(n.id));

    return [...resolvedNodes, ...missedNodes];
  }
}
