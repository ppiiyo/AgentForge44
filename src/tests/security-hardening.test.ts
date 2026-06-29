import { describe, it, expect, vi } from 'vitest';
import { isPrivateIP, validateURLForSSRF, validateUrl } from '../utils/ssrf-validator.js';
import { safeJsonParse, hasProtoPollution, safeDeepMerge } from '../utils/safe-json.js';
import { validateRegex, testRegexWithTimeout, deepSanitizeAndFreeze } from '../utils/safe-regex.js';
import { maskSecrets } from '../utils/logger.js';
import { checkSlidingWindow } from '../services/usage-tracker.js';
import { SecretsShield } from '../api/auth.js';
import { escapeHTML, sanitizeXSSPayload } from '../utils/xss-sanitizer.js';
import { CSRFProtector } from '../utils/csrf-protector.js';

describe('=== Phase 1: Security Hardening Suite ===', () => {

  describe('1. SSRF Prevention Sub-suite (10+ Tests)', () => {
    it('1. should block custom IPv4 loopback (127.0.0.1)', () => {
      expect(isPrivateIP('127.0.0.1')).toBe(true);
    });

    it('2. should block IPv4 subnet loopback (127.25.1.99)', () => {
      expect(isPrivateIP('127.25.1.99')).toBe(true);
    });

    it('3. should block standard IPv6 loopback (::1)', () => {
      expect(isPrivateIP('::1')).toBe(true);
    });

    it('4. should block extended IPv6 loopback notation', () => {
      expect(isPrivateIP('0:0:0:0:0:0:0:1')).toBe(true);
    });

    it('5. should block Class A RFC 1918 private network (10.0.0.5)', () => {
      expect(isPrivateIP('10.0.0.5')).toBe(true);
    });

    it('6. should block Class B RFC 1918 private network (172.16.20.10)', () => {
      expect(isPrivateIP('172.16.20.10')).toBe(true);
    });

    it('7. should block Class C RFC 1918 private network (192.168.1.13)', () => {
      expect(isPrivateIP('192.168.1.13')).toBe(true);
    });

    it('8. should block standard Link-Local APIPA address (169.254.169.254)', () => {
      expect(isPrivateIP('169.254.169.254')).toBe(true);
    });

    it('9. should block IPv6 link-local addresses (fe80::1)', () => {
      expect(isPrivateIP('fe80::1')).toBe(true);
    });

    it('10. should block IPv6 local multicast range', () => {
      expect(isPrivateIP('ff02::1')).toBe(true);
    });

    it('11. should allow standard public internet addresses', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('1.1.1.1')).toBe(false);
    });

    it('12. should block unsafe hostnames with validateUrl', async () => {
      await expect(validateUrl('http://localhost:8080')).rejects.toThrow('SSRF attempt blocked');
      await expect(validateUrl('http://127.0.0.1')).rejects.toThrow('SSRF attempt blocked');
      await expect(validateUrl('http://169.254.169.254')).rejects.toThrow('SSRF attempt blocked');
    });
  });

  describe('2. ReDoS Protection Sub-suite (5+ Tests)', () => {
    it('1. should block catastrophic backtrack pattern with exponential growth', () => {
      expect(validateRegex('(a+)+')).toBe(false);
    });

    it('2. should block dangerous nested repetition group matching', () => {
      expect(validateRegex('([a-zA-Z]+)*')).toBe(false);
    });

    it('3. should block vulnerable nested group word backtrack pattern', () => {
      expect(validateRegex('(\\w+)*')).toBe(false);
    });

    it('4. should identify and allow completely safe regex pattern', () => {
      expect(validateRegex('^[a-zA-Z0-9_-]+$')).toBe(true);
    });

    it('5. should handle execution timeout correctly on normal matching', async () => {
      const isOK = await testRegexWithTimeout('^[0-9]+$', '123456');
      expect(isOK).toBe(true);
    });

    it('6. should reject backtrack execution statically to avoid timeout loops', async () => {
      const isDangerous = await testRegexWithTimeout('(a+)+', 'aaaaaaaaaaaaaaaaaaa!');
      expect(isDangerous).toBe(false);
    });
  });

  describe('3. Secret Masking Sub-suite (5+ Tests)', () => {
    it('1. should mask api_key values dynamically', () => {
      const data = { api_key: 'sb_secret_key_123', normal: 'public' };
      const masked = maskSecrets(data);
      expect(masked.api_key).toBe('***MASKED***');
      expect(masked.normal).toBe('public');
    });

    it('2. should mask password parameters recursively regardless of case', () => {
      const data = { PASSWORD: 'PlaintextPassword1', user: 'admin' };
      const masked = maskSecrets(data);
      expect(masked.PASSWORD).toBe('***MASKED***');
      expect(masked.user).toBe('admin');
    });

    it('3. should mask tokens in nested structures', () => {
      const data = { level1: { level2: { bearer_token: 'xyz-999' } } };
      const masked = maskSecrets(data);
      expect(masked.level1.level2.bearer_token).toBe('***MASKED***');
    });

    it('4. should mask sensitive elements inside array streams', () => {
      const arr = [
        { clientSecret: 'sensitive-0' },
        { normalField: 'ordinary-1' }
      ];
      const masked = maskSecrets(arr);
      expect(masked[0].clientSecret).toBe('***MASKED***');
      expect(masked[1].normalField).toBe('ordinary-1');
    });

    it('5. should sanitize stringified JSON properties that contain sensitive fields', () => {
      const innerJson = JSON.stringify({ api_key: 'foo', user: 'john' });
      const mainObj = { payload: innerJson };
      const masked = maskSecrets(mainObj);
      const parsedPayload = JSON.parse(masked.payload);
      expect(parsedPayload.api_key).toBe('***MASKED***');
      expect(parsedPayload.user).toBe('john');
    });
  });

  describe('4. Rate Limiting slidingWindow Sub-suite (5+ Tests)', () => {
    it('1. should allow multiple requests within default threshold bounds', async () => {
      const key = `user-id-${Date.now()}`;
      expect(await checkSlidingWindow(key, 5, 1000)).toBe(true);
      expect(await checkSlidingWindow(key, 5, 1000)).toBe(true);
    });

    it('2. should reject when sliding limit threshold is explicitly reached', async () => {
      const key = `client-ip-${Date.now()}`;
      expect(await checkSlidingWindow(key, 2, 1000)).toBe(true);
      expect(await checkSlidingWindow(key, 2, 1000)).toBe(true);
      expect(await checkSlidingWindow(key, 2, 1000)).toBe(false); // 3rd must fail
    });

    it('3. should maintain isolated count contexts for distinct resource keys', async () => {
      const keyA = `resource-a-${Date.now()}`;
      const keyB = `resource-b-${Date.now()}`;
      expect(await checkSlidingWindow(keyA, 1, 1000)).toBe(true);
      expect(await checkSlidingWindow(keyB, 1, 1000)).toBe(true);
    });

    it('4. should reset sliding counter index logically after time window has elapsed', async () => {
      vi.useFakeTimers();
      const key = `temp-ip-${Date.now()}`;
      expect(await checkSlidingWindow(key, 1, 1000)).toBe(true); // first request
      expect(await checkSlidingWindow(key, 1, 1000)).toBe(false); // rejected (limit 1)
      
      vi.advanceTimersByTime(1001); // advance beyond 1s
      expect(await checkSlidingWindow(key, 1, 1000)).toBe(true); // allowed again!
      vi.useRealTimers();
    });

    it('5. should support customizable sliding duration windows dynamically in parameters', async () => {
      const key = `dynamic-dur-${Date.now()}`;
      expect(await checkSlidingWindow(key, 1, 5000)).toBe(true);
      expect(await checkSlidingWindow(key, 1, 5000)).toBe(false);
    });
  });

  describe('5. XSS Protection Sub-suite (10+ Tests)', () => {
    it('1. should escape left angle bracket characters safely', () => {
      expect(escapeHTML('<script>')).toBe('&lt;script&gt;');
    });

    it('2. should escape double quote symbols', () => {
      expect(escapeHTML('"hello"')).toBe('&quot;hello&quot;');
    });

    it('3. should escape single quote strings', () => {
      expect(escapeHTML("'test'")).toBe('&#39;test&#39;');
    });

    it('4. should escape ampersand characters safely', () => {
      expect(escapeHTML('a & b')).toBe('a &amp; b');
    });

    it('5. should erase plain HTML script tag constructs entirely', () => {
      expect(sanitizeXSSPayload('<script>alert(1)</script>')).toBe('');
    });

    it('6. should filter case-insensitive tag injections', () => {
      expect(sanitizeXSSPayload('<ScRiPt>console.log("leak")</sCrIpT>')).toBe('');
    });

    it('7. should sterilize javascript protocol loops inside href values', () => {
      expect(sanitizeXSSPayload('javascript:alert(document.cookie)')).toContain('[removed]');
    });

    it('8. should defuse onload event hooks to prevent prompt fire', () => {
      expect(sanitizeXSSPayload('<img src="none" onload="hack()">')).toContain('blocked-event');
    });

    it('9. should defuse onerror event handlers', () => {
      expect(sanitizeXSSPayload('<img src="x" onerror="steal()">')).toContain('blocked-event');
    });

    it('10. should block standard input onfocus callback manipulation', () => {
      expect(sanitizeXSSPayload('<input type="text" onfocus="calc()">')).toContain('blocked-event');
    });

    it('11. should safely pass benign text without modification', () => {
      const safe = 'Hello corporate business partner';
      expect(sanitizeXSSPayload(safe)).toBe(safe);
    });
  });

  describe('6. CSRF Protection Sub-suite (3+ Tests)', () => {
    const protector = new CSRFProtector('enterprise_secrets_key_999');

    it('1. should generate a signed token and verify it successfully for the correct session', () => {
      const sessionId = 'session_token_xyz_123';
      const token = protector.generateToken(sessionId);
      expect(token).toBeDefined();
      expect(protector.verifyToken(sessionId, token)).toBe(true);
    });

    it('2. should fail verification when a matched token is presented to another session id', () => {
      const sessionIdA = 'id-alpha';
      const sessionIdB = 'id-beta';
      const tokenA = protector.generateToken(sessionIdA);
      expect(protector.verifyToken(sessionIdB, tokenA)).toBe(false);
    });

    it('3. should fail verification on modified signature hash bytes', () => {
      const sessionId = 'legitimate';
      const original = protector.generateToken(sessionId);
      const poisoned = original.slice(0, -4) + 'abcd'; // change last signature digits
      expect(protector.verifyToken(sessionId, poisoned)).toBe(false);
    });

    it('4. should handle empty inputs and invalid string representations robustly without crash', () => {
      expect(protector.verifyToken('session', '')).toBe(false);
      expect(protector.verifyToken('session', 'no-dot-format')).toBe(false);
    });
  });

  describe('7. Secrets Encryption & Key Rotation Sub-suite (5+ Tests)', () => {
    it('1. should encrypt string successfully to colon-delimited structure and decrypt', () => {
      const shield = new SecretsShield('key_0');
      const plain = 'openai-secret-key-101';
      const cipher = shield.encrypt(plain);
      expect(cipher).toContain(':');
      expect(shield.decrypt(cipher)).toBe(plain);
    });

    it('2. should guarantee cipher uniqueness via random Initialization Vectors', () => {
      const shield = new SecretsShield('key_1');
      const text = 'reusable-text';
      const cipher1 = shield.encrypt(text);
      const cipher2 = shield.encrypt(text);
      expect(cipher1).not.toBe(cipher2); // IV forces differences
    });

    it('3. should throw error when attempting decrypt with foreign master key source', () => {
      const shieldA = new SecretsShield('key_alpha');
      const shieldB = new SecretsShield('key_beta');
      const plain = 'super-private-vault';
      const cipherA = shieldA.encrypt(plain);
      expect(() => shieldB.decrypt(cipherA)).toThrow();
    });

    it('4. should gracefully error on incorrect container formats', () => {
      const shield = new SecretsShield('key_format');
      expect(() => shield.decrypt('invalid-raw-encryption-no-colons')).toThrow();
    });

    it('5. should support smooth enterprise security cryptographic key rotation scenarios', () => {
      const oldShield = new SecretsShield('legacy_secret_key');
      const newShield = new SecretsShield('rotated_secret_key');
      const originalSecrets = 'database-super-password';

      // 1. Data encrypted under legacy configuration
      const oldCipher = oldShield.encrypt(originalSecrets);

      // 2. Rotate secrets values: decrypt using legacy keys, and re-encrypt with current rotated standard keys
      const decrypted = oldShield.decrypt(oldCipher);
      const rotatedCipher = newShield.encrypt(decrypted);

      // 3. New shield successfully reads the credential while old shield fails to read newly rotated bytes
      expect(newShield.decrypt(rotatedCipher)).toBe(originalSecrets);
      expect(() => oldShield.decrypt(rotatedCipher)).toThrow();
    });
  });

  describe('8. Prototype Pollution & Sandboxing checks', () => {
    it('should clean and strip prototype-polluting properties during JSON parse', () => {
      const payloadString = '{"normal_field": "hello", "__proto__": {"polluted": "yes"}, "nested": {"constructor": {"prototype": {"admin": true}}}}';
      const parsed = safeJsonParse(payloadString);
      expect(parsed.normal_field).toBe('hello');
      expect(Object.prototype.hasOwnProperty.call(parsed, '__proto__')).toBe(false);
      expect((parsed as any).polluted).toBeUndefined();
      expect(parsed.nested.constructor).toBe(Object);
      expect(Object.prototype.hasOwnProperty.call(parsed.nested, 'constructor')).toBe(false);
    });
  });

});
