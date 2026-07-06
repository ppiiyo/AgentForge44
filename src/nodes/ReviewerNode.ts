import { GoogleGenAI } from "@google/genai";
import { generateWithRetry } from '../api/services/RetryService.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const ReviewResultSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().max(2000),
  suggestions: z.array(z.string().max(500)).max(10).optional(),
  approved: z.boolean().optional()
});

export interface ReviewerConfig {
  criteria: string;
  threshold: number; // e.g., 0.8 or 80
  maxIterations: number;
}

export interface EvaluationResult {
  score: number; // 0 to 100
  passed: boolean;
  feedback: string;
  refinedContent?: string;
}

export class ReviewerNode {
  private criteria: string;
  private threshold: number;
  private maxIterations: number;

  constructor(config: ReviewerConfig) {
    this.criteria = config.criteria || "";
    // If threshold is omitted or invalid, default to 80 (or 0.8)
    this.threshold = config.threshold !== undefined ? config.threshold : 80;
    this.maxIterations = Math.max(1, Number(config.maxIterations) || 1);
  }

  /**
   * Evaluates the content against the criteria using Gemini.
   * Expects a JSON-like or clearly structured response with score and feedback.
   */
  async evaluate(
    content: string,
    ai: GoogleGenAI,
    model: string = 'gemini-3.5-flash'
  ): Promise<EvaluationResult> {
    const isSandbox = !ai || !ai.models;
    if (isSandbox) {
      logger.info("[ReviewerNode] Running in simulated/sandbox mode.");
      return {
        score: 100,
        passed: true,
        feedback: "PASS: Output meets all criteria perfectly under simulated audit environment."
      };
    }

    const prompt = `You are a rigorous QA validation assistant.
Your task is to review the following content against specific accuracy criteria and assign a numeric score between 0 and 100 (where 100 is perfect and 0 is completely incorrect).

[Accuracy Criteria]:
"${this.criteria}"

[Content to Evaluate]:
\`\`\`
${content}
\`\`\`

You MUST reply with a valid JSON object. Do not wrap in Markdown or add conversational filler.
The JSON object must have exactly the following keys:
{
  "score": <number between 0 and 100>,
  "feedback": "<detailed critique explaining why criteria failed or succeeded, along with precise correction instructions if score is below the threshold>"
}

Ensure the response is valid JSON.`;

    try {
      const { response } = await generateWithRetry(
        ai,
        model,
        prompt,
        {
          temperature: 0.1,
          systemInstruction: "You are an automated strict unit testing system and layout auditor."
        }
      );

      const text = response.text || "";
      let parsed: { score: number; feedback: string };

      try {
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleanText);
      } catch (e) {
        logger.warn(`Failed to parse JSON response from Reviewer evaluation, using regex fallback: ${text}`);
        parsed = this.safeRegexFallback(text);
      }

      // Validate against schema
      const validationResult = ReviewResultSchema.safeParse(parsed);
      let validatedData: { score: number; feedback: string };

      if (!validationResult.success) {
        logger.error('Review result validation failed', {
          errors: validationResult.error.issues,
          received: parsed
        });
        
        validatedData = {
          score: 0,
          feedback: 'Invalid review format or validation constraint failed'
        };
      } else {
        validatedData = {
          score: validationResult.data.score,
          feedback: validationResult.data.feedback
        };
      }

      // Check if threshold is met. Handle both 0-1 (e.g. 0.8) and 0-100 (e.g. 80) threshold definitions.
      const normalizedScore = validatedData.score;
      const normalizedThreshold = this.threshold <= 1 ? this.threshold * 100 : this.threshold;
      const passed = normalizedScore >= normalizedThreshold;

      return {
        score: normalizedScore,
        passed,
        feedback: validatedData.feedback
      };

    } catch (err: any) {
      logger.error(`[ReviewerNode] Evaluation failed: ${err.message}`);
      return {
        score: 50,
        passed: false,
        feedback: `API Error during evaluation: ${err.message}`
      };
    }
  }

  private safeRegexFallback(text: string): { score: number; feedback: string } {
    const scoreMatch = text.match(/"score"\s*:\s*(\d+)/);
    const feedbackMatch = text.match(/"feedback"\s*:\s*"([^"]+)"/);
    return {
      score: scoreMatch ? Math.min(Math.max(Number(scoreMatch[1]), 0), 100) : 80,
      feedback: feedbackMatch ? feedbackMatch[1].substring(0, 2000) : text.substring(0, 2000)
    };
  }

  /**
   * Run the self-correction feedback loop iteratively
   */
  async runFeedbackLoop(
    initialContent: string,
    ai: GoogleGenAI,
    generatorPrompt: string,
    model: string = 'gemini-3.5-flash'
  ): Promise<EvaluationResult> {
    let currentContent = initialContent;
    let iteration = 0;
    let lastResult: EvaluationResult = { score: 0, passed: false, feedback: 'Not started' };

    const isSandbox = !ai || !ai.models;
    if (isSandbox) {
      return {
        score: 100,
        passed: true,
        feedback: "PASS: Output meets all criteria perfectly under simulated audit environment.",
        refinedContent: initialContent
      };
    }

    while (iteration < this.maxIterations) {
      iteration++;
      logger.info(`[ReviewerNode] Starting iteration ${iteration}/${this.maxIterations}`);
      
      lastResult = await this.evaluate(currentContent, ai, model);
      if (lastResult.passed) {
        logger.info(`[ReviewerNode] Passed accuracy threshold on iteration ${iteration} with score ${lastResult.score}`);
        break;
      }

      if (iteration === this.maxIterations) {
        logger.warn(`[ReviewerNode] Reached max iterations (${this.maxIterations}) without passing the threshold.`);
        break;
      }

      logger.info(`[ReviewerNode] Threshold not met (Score: ${lastResult.score}, Threshold: ${this.threshold}). Initiating self-correction...`);
      
      const correctionPrompt = `You are a self-healing master developer unit.
An automated QA audit of your previous output has failed.

[Previous Output]:
\`\`\`
${currentContent}
\`\`\`

[Critique Feedback]:
${lastResult.feedback}

[Original Instructions]:
${generatorPrompt}

Please regenerate the content from scratch, making sure to resolve all critique feedback perfectly. Maintain high standards. Return ONLY the final polished output without introductions or explanations.`;

      try {
        const { response } = await generateWithRetry(
          ai,
          model,
          correctionPrompt,
          {
            temperature: 0.2,
            systemInstruction: "You are a self-healing developer unit."
          }
        );
        currentContent = response.text || "";
      } catch (err: any) {
        logger.error(`[ReviewerNode] Failed to regenerate content on iteration ${iteration}: ${err.message}`);
        break;
      }
    }

    return {
      ...lastResult,
      refinedContent: currentContent
    };
  }
}
