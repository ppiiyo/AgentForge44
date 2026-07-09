export interface MaskingSession {
  maskedText: string;
  mapping: Record<string, string>;
}

export class ZeroTrustShield {
  // Regex patterns for various sensitive data types (PII, credentials, etc.)
  private static PATTERNS = {
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    PHONE: /(?:\+?([1-9]\d{1,3})[ -]?)?(\d{3})[ -]?(\d{3})[ -]?(\d{4})\b/g,
    CREDIT_CARD: /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g,
    API_KEY_OR_SECRET: /(?:api_key|password|secret|token|credentials|passwd|passphrase|private_key|auth_token)["'\s]*[:=]["'\s]*([a-zA-Z0-9\-_\.~!\*'\(\);:@&=\+\$,\/?#\[\]]{8,120})/gi,
  };

  /**
   * Scans input text and replaces sensitive data with dynamic opaque tokens,
   * returning the masked text and the token-to-value decryption mappings.
   */
  static mask(text: string): MaskingSession {
    if (!text || typeof text !== 'string') {
      return { maskedText: text, mapping: {} };
    }

    const mapping: Record<string, string> = {};
    let maskedText = text;
    let tokenIndex = 1;

    // 1. Mask Credit Cards
    maskedText = maskedText.replace(this.PATTERNS.CREDIT_CARD, (match) => {
      const token = `[CONFIDENTIAL_CARD_${tokenIndex++}]`;
      mapping[token] = match;
      return token;
    });

    // 2. Mask Emails
    maskedText = maskedText.replace(this.PATTERNS.EMAIL, (match) => {
      const token = `[CONFIDENTIAL_EMAIL_${tokenIndex++}]`;
      mapping[token] = match;
      return token;
    });

    // 3. Mask Phone Numbers
    maskedText = maskedText.replace(this.PATTERNS.PHONE, (match) => {
      // Avoid matching standard short numeric indices
      if (match.length < 7) return match;
      const token = `[CONFIDENTIAL_PHONE_${tokenIndex++}]`;
      mapping[token] = match;
      return token;
    });

    // 4. Mask API Keys / Secrets / Passwords
    // For key-value patterns, we want to replace only the value group to preserve structure
    let keyValMatch;
    const keyValRegex = new RegExp(this.PATTERNS.API_KEY_OR_SECRET);
    while ((keyValMatch = keyValRegex.exec(maskedText)) !== null) {
      const fullMatch = keyValMatch[0];
      const sensitiveValue = keyValMatch[1];
      
      if (sensitiveValue && !sensitiveValue.startsWith('[CONFIDENTIAL_')) {
        const token = `[CONFIDENTIAL_SECRET_${tokenIndex++}]`;
        mapping[token] = sensitiveValue;
        
        // Replace only the value portion in the text
        const replacedMatch = fullMatch.replace(sensitiveValue, token);
        maskedText = maskedText.replace(fullMatch, replacedMatch);
      }
    }

    return { maskedText, mapping };
  }

  /**
   * Reconstitutes original sensitive values back into the output text
   * using the decryption mapping keys.
   */
  static demask(text: string, mapping: Record<string, string>): string {
    if (!text || typeof text !== 'string' || !mapping || Object.keys(mapping).length === 0) {
      return text;
    }

    let restoredText = text;
    // Iterate through mapping tokens and replace them back
    Object.entries(mapping).forEach(([token, originalValue]) => {
      // Escape token for safety in replace regex
      const escapedToken = token.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      restoredText = restoredText.replace(new RegExp(escapedToken, 'g'), originalValue);
    });

    return restoredText;
  }
}
