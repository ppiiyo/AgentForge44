import { describe, it, expect } from 'vitest';
import { AgentSwarmTeam, IngestionRAGEngine, LLMJudgeEvaluator, BreakpointsManager, AgentSpec } from '../../api/agentCorePlus.js';
import { LLMProvider, LLMResponse, LLMCallConfig } from '../../api/providers.js';

// Mock LLM Provider for multi-agent delegation and evaluation tests
class MockLLMProvider extends LLMProvider {
  private customMockAnswers: Record<string, string> = {};

  getName() {
    return 'Mocked LLM Provider';
  }

  setMockAnswer(promptSubstring: string, answer: string) {
    this.customMockAnswers[promptSubstring] = answer;
  }

  async generate(prompt: string, _config?: LLMCallConfig): Promise<LLMResponse> {
    for (const [sub, ans] of Object.entries(this.customMockAnswers)) {
      if (prompt.includes(sub)) {
        return { text: ans };
      }
    }
    // Default safe fallback answer
    return {
      text: JSON.stringify({
        score: 0.9,
        justification: "Calculates mock compliance metric results perfectly.",
        recommendations: ["Maintain current structure"]
      })
    };
  }
}

describe('Agent Core Plus - Multimodal and Swarm Suites', () => {

  describe('AgentSwarmTeam delegation systems', () => {
    it('should coordinate, delegate tasks to specialists, and synthesize answers using Lead Coordinator', async () => {
      const provider = new MockLLMProvider();
      
      const supervisor: AgentSpec = {
        name: 'SupervisorPrimary',
        role: 'Orchestrator',
        systemInstruction: 'Direct and merge answers.'
      };

      const specialists: AgentSpec[] = [
        {
          name: 'RustSpecialist',
          role: 'Coder',
          systemInstruction: 'Output correct rust code.'
        },
        {
          name: 'MarketingSpecialist',
          role: 'Copywriter',
          systemInstruction: 'Produce promotional slogans.'
        }
      ];

      // Setup LLM prompts and corresponding expected outcomes
      provider.setMockAnswer(
        'Lead Coordinator: SupervisorPrimary',
        'DELEGATE: RustSpecialist\nINSTRUCTIONS: Implement optimized binary search in safe Rust'
      );
      provider.setMockAnswer(
        'Implement optimized binary search in safe Rust',
        'fn binary_search(arr: &[i32], target: i32) -> Option<usize> { Some(0) }'
      );
      provider.setMockAnswer(
        'Specialist (RustSpecialist) output',
        'SYNTHESIS: Here is the robust Rust binary search code block.'
      );

      const swarm = new AgentSwarmTeam(provider, supervisor, specialists);
      const result = await swarm.delegateAndExecute('Write a safe binary search in rust.');

      expect(result).toContain('SYNTHESIS: Here is the robust Rust binary search code block.');
    });
  });

  describe('IngestionRAGEngine document chunkers and searchers', () => {
    it('should split arbitrary files into overlapping token-bounded chunks and append them to memory store', () => {
      const engine = new IngestionRAGEngine();
      const rawText = "This is a comprehensive, multi-module visual development orchestrator built with vite and socket-io. It supports offline sandboxes, prompt playground workflows, and live collaboration workspaces.";
      
      const chunks = engine.chunkDocument(rawText, 'guide.md', 10, 3);
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].sourceFile).toBe('guide.md');
      expect(chunks[0].text.split(/\s+/).length).toBeLessThanOrEqual(10);
    });

    it('should search workspace RAG index by evaluating term overlap frequencies', async () => {
      const engine = new IngestionRAGEngine();
      engine.chunkDocument("The Rust compiler is fast and supports zero-cost abstractions with excellent memory layout guarantees.", "rust-info.txt", 10, 2);
      engine.chunkDocument("Drizzle ORM is a lightweight Sqlite, MySQL, and PostgreSQL client engine for node processes.", "db-info.txt", 10, 2);

      const results = await engine.searchWorkspaceRAG("Rust compiler and zero-cost abstractions", 1);
      expect(results.length).toBe(1);
      expect(results[0].sourceFile).toBe("rust-info.txt");
      expect(results[0].text).toContain("compiler");
    });
  });

  describe('LLMJudgeEvaluator auto grader', () => {
    it('should grade generated answers correctly against ground truth and parse metrics JSON from LLM response', async () => {
      const provider = new MockLLMProvider();
      
      const mockReport = {
        score: 0.95,
        justification: "Correct facts, answers all sub-queries and complies with instructions.",
        recommendations: ["Trim unnecessary helper comments"]
      };

      provider.setMockAnswer('audit and grade an agent system output response', JSON.stringify(mockReport));

      const judge = new LLMJudgeEvaluator(provider);
      const report = await judge.evaluateOutput(
        "Is Paris the capital of France?",
        "Yes, Paris is the capital city of France.",
        "Paris is the Capital of France."
      );

      expect(report.score).toBe(0.95);
      expect(report.justification).toContain("Correct facts");
      expect(report.recommendations).toContain("Trim unnecessary helper comments");
    });

    it('should gracefully handle and recover with a fallback report if LLM yields malformed JSON response', async () => {
      const provider = new MockLLMProvider();
      // Setup mock answer with bad unparsable JSON response
      provider.setMockAnswer('audit and grade an agent system output response', 'This is unparsable raw text judge commentary.');

      const judge = new LLMJudgeEvaluator(provider);
      const report = await judge.evaluateOutput("test query", "actual text", "truth");

      expect(report.score).toBe(0.5);
      expect(report.justification).toContain("Failed to parse");
    });
  });

  describe('BreakpointsManager human-in-the-loop control logic', () => {
    it('should handle registration, approval with values, rejection, and query state status of interrupts', () => {
      const manager = new BreakpointsManager();
      
      manager.registerBreakpoint('node-eval-5', 'Approve system cost before pipeline finalizes?');
      expect(manager.getStatus('node-eval-5')).toBe('paused');

      manager.approveBreakpoint('node-eval-5', 'Approved value output data');
      expect(manager.getStatus('node-eval-5')).toBe('approved');

      manager.registerBreakpoint('node-eval-6', 'Another breakpoint');
      manager.rejectBreakpoint('node-eval-6');
      expect(manager.getStatus('node-eval-6')).toBe('rejected');

      expect(manager.getStatus('missing-node-id')).toBe('none');
    });
  });
});
