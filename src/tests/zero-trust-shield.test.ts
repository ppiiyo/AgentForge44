import { describe, it, expect } from 'vitest';
import { ZeroTrustShield } from '../services/security/ZeroTrustShield.js';

describe('ZeroTrustShield Tests', () => {
  it('should mask credit cards, email addresses, and phone numbers', () => {
    const rawText = 'My email is john.doe@example.com and card number is 1234-5678-1234-5678. You can call me at 123-456-7890.';
    const { maskedText, mapping } = ZeroTrustShield.mask(rawText);

    expect(maskedText).not.toContain('john.doe@example.com');
    expect(maskedText).not.toContain('1234-5678-1234-5678');
    expect(maskedText).not.toContain('123-456-7890');
    expect(maskedText).toContain('[CONFIDENTIAL_EMAIL_');
    expect(maskedText).toContain('[CONFIDENTIAL_CARD_');
    expect(maskedText).toContain('[CONFIDENTIAL_PHONE_');

    const restored = ZeroTrustShield.demask(maskedText, mapping);
    expect(restored).toBe(rawText);
  });

  it('should mask API keys, tokens, and secrets in text-based patterns', () => {
    const rawText = 'Using api_key: "sb_secret_key_123" and token: xyz-999-token.';
    const { maskedText, mapping } = ZeroTrustShield.mask(rawText);

    expect(maskedText).not.toContain('sb_secret_key_123');
    expect(maskedText).toContain('[CONFIDENTIAL_SECRET_');

    const restored = ZeroTrustShield.demask(maskedText, mapping);
    expect(restored).toBe(rawText);
  });

  it('should handle undefined or null text gracefully', () => {
    const { maskedText, mapping } = ZeroTrustShield.mask(null as any);
    expect(maskedText).toBeNull();
    expect(mapping).toEqual({});
  });
});
