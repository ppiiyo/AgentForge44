import { GraphExecutor } from "../graph/executor.js";
import { LLMProvider } from "../providers/types.js";

export interface EvalTestCase {
  id: string;
  input: string;
  expectedOutput: string;
}

export interface EvalReportItem {
  testId: string;
  input: string;
  expected: string;
  actual: string;
  latencyMs: number;
  grade: number; // Score 0 to 10
  rationale: string;
}

export interface ConsolidatedReport {
  timestamp: number;
  avgLatencyMs: number;
  averageScorePercentage: number;
  items: EvalReportItem[];
}

export class FlowEvaluatorEngine {
  private executor: GraphExecutor;
  private judgeProvider: LLMProvider;

  constructor(executor: GraphExecutor, judgeProvider: LLMProvider) {
    this.executor = executor;
    this.judgeProvider = judgeProvider;
  }

  /**
   * Run benchmark suites comparing exact outcomes against target human labels
   */
  async runEvaluation(dataset: EvalTestCase[]): Promise<ConsolidatedReport> {
    const reports: EvalReportItem[] = [];
    let totalLatency = 0;

    for (const test of dataset) {
      const startTime = Date.now();
      const runResult = await this.executor.execute({ lastOutput: test.input });
      const latencyMs = Date.now() - startTime;
      totalLatency += latencyMs;

      const actualAns = runResult.values.lastOutput || "";
      const scoreResult = await this.evaluateWithLLMJudge(test.input, test.expectedOutput, actualAns);

      reports.push({
        testId: test.id,
        input: test.input,
        expected: test.expectedOutput,
        actual: actualAns,
        latencyMs,
        grade: scoreResult.grade,
        rationale: scoreResult.rationale
      });
    }

    const avgLatencyMs = totalLatency / dataset.length;
    const totalScore = reports.reduce((acc, current) => acc + current.grade, 0);
    const averageScorePercentage = (totalScore / (dataset.length * 10)) * 100;

    return {
      timestamp: Date.now(),
      avgLatencyMs,
      averageScorePercentage,
      items: reports
    };
  }

  /**
   * LLM-as-a-Judge technique
   */
  private async evaluateWithLLMJudge(
    query: string,
    expected: string,
    actual: string
  ): Promise<{ grade: number; rationale: string }> {
    const prompt = `You are a rigorous QA evaluator. Grade the actual output matching relevance against expected standard values.
Provide feedback in a clean parseable JSON format containing keys 'grade' (integer index between 0 and 10) and 'rationale' (description reasoning).

User Query: "${query}"
Expected Answer: "${expected}"
Actual Model Translation: "${actual}"`;

    try {
      const response = await this.judgeProvider.generate(prompt, {
        temperature: 0.1,
        systemInstruction: "You are an automated evaluator. Return raw JSON objects only."
      });

      const cleanText = (response.text || "").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanText);
      return {
        grade: typeof parsed.grade === 'number' ? parsed.grade : 5,
        rationale: parsed.rationale || "Evaluated correctly but summary formatting skipped."
      };
    } catch {
      return {
        grade: 5,
        rationale: "Automated parsing error occurred evaluating output."
      };
    }
  }
}
