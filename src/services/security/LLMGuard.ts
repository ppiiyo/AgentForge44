import { logger } from '../../utils/logger.js';
import { validateRegex } from '../../utils/safe-regex.js';

export interface GuardAnalysisResult {
  isSafe: boolean;
  score: number; // 0 to 1 risk score (1 is highest threat)
  flags: string[];
}

export class LLMGuard {
  // A collection of safe regular expressions for detecting classic prompt injection attacks
  private static injectionPatterns = [
    /ignore\s+(?:the\s+)?(?:above|previous|system|instruction)s?/i,
    /bypass\s+(?:the\s+)?(?:system|security|guardrail|filter)s?/i,
    /you\s+are\s+now\s+(?:unconstrained|unfiltered|unrestricted)/i,
    /acting\s+as\s+a\s+(?:dan|developer\s+mode|jailbroken)/i,
    /override\s+(?:the\s+)?(?:system|original|initial\s+prompt)/i,
    /system\s+override/i,
    /forget\s+all\s+(?:previous|your\s+)?instructions/i,
    /do\s+anything\s+now/i
  ];

  // RegEx for scanning output secrets/PII leak
  private static secretPatterns = {
    apiKey: /sb_secret_[a-zA-Z0-9]{24,64}/gi,
    jwt: /eyJ[a-zA-Z0-9-_=]+\.eyJ[a-zA-Z0-9-_=]+\.[a-zA-Z0-9-_=]+/gi,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    creditCard: /\b(?:\d[ -]*?){13,16}\b/g
  };

  /**
   * Scans an incoming prompt string for signs of prompt injection or system instruction override attempts.
   */
  public static scanPrompt(prompt: string): GuardAnalysisResult {
    if (!prompt) {
      return { isSafe: true, score: 0, flags: [] };
    }

    const flags: string[] = [];
    let riskScore = 0;

    for (const pattern of this.injectionPatterns) {
      if (pattern.test(prompt)) {
        flags.push(`Matched injection pattern: ${pattern.source}`);
        riskScore = Math.min(1.0, riskScore + 0.6);
      }
    }

    // Capture generic prompt override cues
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes('system prompt') && lowerPrompt.includes('ignore')) {
      flags.push('Prompt instructions contain keywords targeting the system configuration.');
      riskScore = Math.min(1.0, riskScore + 0.3);
    }

    return {
      isSafe: riskScore < 0.6,
      score: riskScore,
      flags
    };
  }

  /**
   * Sanitizes the outgoing LLM response to ensure no sensitive credentials or keys are accidentally leaked.
   */
  public static sanitizeOutput(text: string): string {
    if (!text) return text;

    let sanitized = text;

    // Mask standard API keys and secrets
    sanitized = sanitized.replace(this.secretPatterns.apiKey, '[CONFIDENTIAL_SECRET_MASKED]');
    
    // Mask standard JSON Web Tokens (JWT)
    sanitized = sanitized.replace(this.secretPatterns.jwt, '[CONFIDENTIAL_TOKEN_MASKED]');

    // Mask Credit Card Numbers
    sanitized = sanitized.replace(this.secretPatterns.creditCard, '[CONFIDENTIAL_CARD_MASKED]');

    if (sanitized !== text) {
      logger.warn('[SECURITY] LLMGuard output sanitization activated: sensitive secrets masked in generated output.');
    }

    return sanitized;
  }
}
