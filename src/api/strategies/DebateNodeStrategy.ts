/* eslint-disable @typescript-eslint/no-explicit-any -- Ticket #104: Dynamic workflow node execution and field mapping */
import { NodeExecutionStrategy, ExecutionContext } from './NodeStrategy.js';
import { generateWithRetry } from '../services/RetryService.js';

export class DebateNodeStrategy implements NodeExecutionStrategy {
  async execute(node: any, context: ExecutionContext): Promise<void> {
    const topic = node.fields.topic || (typeof context.localValue === 'string' ? context.localValue : "Should AI replace human UI developers?");
    const personaPro = node.fields.personaPro || "Technological Optimist (argues PRO)";
    const personaContra = node.fields.personaContra || "Critical Humanist & Skeptic (argues CON)";
    const rounds = Number(node.fields.rounds) || 2;
    const arbiterInstruction = node.fields.consensusArbiterInstruction || "Provide a multi-disciplinary consensus report summarizing both perspectives and presenting a unified hybrid recommendation.";

    let transcript = `=== MULTI-AGENT DEBATE ON: "${topic}" ===\n\n`;
    let lastTurnText = "";

    try {
      // ROUND 1
      transcript += `--- ROUND 1 ---\n`;
      
      // Pro First Statement
      const pro1Response = await generateWithRetry(
        context.ai,
        "gemini-3.5-flash",
        `Present your primary constructive arguments supporting: "${topic}".`,
        { systemInstruction: `You are a professional debater. Your persona: "${personaPro}". Keep your response to 2 paragraphs.` }
      );
      const pro1Text = pro1Response.response.text || "";
      transcript += `[Pro: ${personaPro}]:\n${pro1Text}\n\n`;
      lastTurnText = pro1Text;

      // Contra Counter-Statement
      const contra1Response = await generateWithRetry(
        context.ai,
        "gemini-3.5-flash",
        `Here are the supporting arguments presented by the opponent:\n"""\n${pro1Text}\n"""\n\nAnalyze and criticize these arguments, then present your constructive counter-perspective against: "${topic}".`,
        { systemInstruction: `You are a professional debater. Your persona: "${personaContra}". Keep your response to 2 paragraphs.` }
      );
      const contra1Text = contra1Response.response.text || "";
      transcript += `[Contra: ${personaContra}]:\n${contra1Text}\n\n`;
      lastTurnText = contra1Text;

      // ROUND 2 (if requested)
      if (rounds >= 2) {
        transcript += `--- ROUND 2 ---\n`;

        // Pro Rebuttal
        const pro2Response = await generateWithRetry(
          context.ai,
          "gemini-3.5-flash",
          `The opponent countered with:\n"""\n${contra1Text}\n"""\n\nRebut their criticisms, defend your original points, and provide a closing argument.`,
          { systemInstruction: `You are a professional debater. Your persona: "${personaPro}". Keep your response to 2 paragraphs.` }
        );
        const pro2Text = pro2Response.response.text || "";
        transcript += `[Pro: ${personaPro} - Rebuttal]:\n${pro2Text}\n\n`;
        lastTurnText = pro2Text;

        // Contra Rebuttal
        const contra2Response = await generateWithRetry(
          context.ai,
          "gemini-3.5-flash",
          `The opponent rebutted with:\n"""\n${pro2Text}\n"""\n\nGive your final counter-rebuttal and summary criticism of their defense.`,
          { systemInstruction: `You are a professional debater. Your persona: "${personaContra}". Keep your response to 2 paragraphs.` }
        );
        const contra2Text = contra2Response.response.text || "";
        transcript += `[Contra: ${personaContra} - Final Rebuttal]:\n${contra2Text}\n\n`;
        lastTurnText = contra2Text;
      }

      // Arbiter Consensus Synthesis
      transcript += `--- CONSENSUS RESOLUTION ---\n`;
      const arbiterResponse = await generateWithRetry(
        context.ai,
        "gemini-3.5-flash",
        `Here is the complete debate transcript between Pro and Contra agents:\n\n${transcript}\n\nSynthesize both sides based on this instruction:\n"${arbiterInstruction}"`,
        { systemInstruction: "You are the Consensus Arbiter Node. Your goal is to synthesize multi-agent debates into highly professional, structured, balanced, and actionable consensus plans." }
      );
      const consensusText = arbiterResponse.response.text || "";
      transcript += `[Consensus Arbiter Synthesis]:\n${consensusText}\n`;

    } catch (err: any) {
      // Heuristic fallback if LLM is unavailable or crashes
      transcript += `\n[Local Sandbox Fallback due to error: ${err.message || String(err)}]\n`;
      transcript += `[Pro: ${personaPro}]: Under sandbox simulation, we support "${topic}" due to rapid development velocity, unified visual representations, and zero-trust security profiles.\n\n`;
      transcript += `[Contra: ${personaContra}]: Under sandbox simulation, we raise concerns about potential automated layout homogenization, loss of creative control, and high training costs.\n\n`;
      transcript += `--- CONSENSUS RESOLUTION ---\n`;
      transcript += `[Consensus Arbiter Synthesis]: Both sides present strong claims. The optimal path is a Hybrid Human-In-The-Loop paradigm, leveraging low-code speed while retaining human creative curation.`;
    }

    context.nodeOutputs[node.id] = transcript;
    context.activeValueReference.value = transcript;

    context.logs.push({
      nodeId: node.id,
      nodeTitle: node.title,
      status: 'completed',
      input: topic,
      output: transcript,
      duration: Date.now() - context.stepStart
    });
  }
}
