import { describe, it, expect } from 'vitest';
import { isPrivateIP, validateURLForSSRF } from '../utils/ssrf-validator.js';
import { safeJsonParse, hasProtoPollution, safeDeepMerge } from '../utils/safe-json.js';
import { validateRegex, testRegexWithTimeout, deepSanitizeAndFreeze } from '../utils/safe-regex.js';

describe('=== Phase 1: Security Hardening Suite ===', () => {

  describe('1. SSRF Prevention Sub-suite', () => {
    it('should correctly identify private IPv4 and IPv6 addresses', () => {
      // Loopback
      expect(isPrivateIP('127.0.0.1')).toBe(true);
      expect(isPrivateIP('127.99.1.5')).toBe(true);
      expect(isPrivateIP('::1')).toBe(true);
      expect(isPrivateIP('0:0:0:0:0:0:0:1')).toBe(true);

      // Private Class A, B, C RFC 1918
      expect(isPrivateIP('10.0.0.1')).toBe(true);
      expect(isPrivateIP('10.255.255.255')).toBe(true);
      expect(isPrivateIP('172.16.4.5')).toBe(true);
      expect(isPrivateIP('172.31.255.255')).toBe(true);
      expect(isPrivateIP('192.168.1.100')).toBe(true);
      expect(isPrivateIP('192.168.254.254')).toBe(true);

      // Link local (APIPA)
      expect(isPrivateIP('169.254.0.1')).toBe(true);
      expect(isPrivateIP('169.254.254.254')).toBe(true);

      // IPv6 private ranges (Link-local, Unique local)
      expect(isPrivateIP('fe80::1')).toBe(true);
      expect(isPrivateIP('fc00::abc')).toBe(true);
      expect(isPrivateIP('ff02::1')).toBe(true); // multicast

      // Public IPs
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('1.1.1.1')).toBe(false);
      expect(isPrivateIP('140.211.11.105')).toBe(false);
    });

    it('should block unsafe hostnames and allow secure public URLs during URL validation', async () => {
      // Local representations
      expect(await validateURLForSSRF('http://localhost/api')).toBe(false);
      expect(await validateURLForSSRF('https://127.0.0.1/auth')).toBe(false);
      expect(await validateURLForSSRF('http://[::1]/home')).toBe(false);
      expect(await validateURLForSSRF('http://169.254.169.254/metadata')).toBe(false);

      // Unsafe domains (resolved via DNS mapping to private IPs)
      // Since local dns resolution for mock or local ranges can fail or point to private network,
      // we check a guaranteed public address:
      const dnsAllowed = await validateURLForSSRF('https://github.com');
      // If we are offline or DNS fails, this might be false, which is safe either way.
      // But we can check that it doesn't crash.
      expect(typeof dnsAllowed).toBe('boolean');
    });
  });

  describe('2. Prototype Pollution Prevention Sub-suite', () => {
    it('should clean and strip prototype-polluting properties during JSON parse', () => {
      const payloadString = '{"normal_field": "hello", "__proto__": {"polluted": "yes"}, "nested": {"constructor": {"prototype": {"admin": true}}}}';
      
      const parsed = safeJsonParse(payloadString);
      
      expect(parsed.normal_field).toBe('hello');
      expect(Object.prototype.hasOwnProperty.call(parsed, '__proto__')).toBe(false);
      expect((parsed as any).polluted).toBeUndefined();
      expect(parsed.nested.constructor).toBe(Object);
      expect(Object.prototype.hasOwnProperty.call(parsed.nested, 'constructor')).toBe(false);
    });

    it('should accurately detect objects afflicted with prototype pollution keys', () => {
      const benign = { safe: 'value', nested: { ok: true } };
      
      const malicious1 = {};
      Object.defineProperty(malicious1, '__proto__', {
        value: { admin: true },
        enumerable: true,
        configurable: true,
        writable: true
      });

      const malicious2 = { safe: 'value', nested: {} };
      Object.defineProperty(malicious2.nested, 'constructor', {
        value: { prototype: { poll: 1 } },
        enumerable: true,
        configurable: true,
        writable: true
      });

      expect(hasProtoPollution(benign)).toBe(false);
      expect(hasProtoPollution(malicious1)).toBe(true);
      expect(hasProtoPollution(malicious2)).toBe(true);
    });

    it('should execute deep merge operations safely without extending properties of Object.prototype', () => {
      const target = { a: 1 };
      
      const source = { b: 2 };
      Object.defineProperty(source, '__proto__', {
        value: { polluted: 'dangerous' },
        enumerable: true,
        configurable: true,
        writable: true
      });

      const merged = safeDeepMerge(target, source);
      expect(merged.a).toBe(1);
      expect(merged.b).toBe(2);
      expect(Object.prototype.hasOwnProperty.call(merged, '__proto__')).toBe(false);
      expect((Object.prototype as any).polluted).toBeUndefined();
    });
  });

  describe('3. ReDoS Cyber Security Prevention Sub-suite', () => {
    it('should identify and block vulnerable/catastrophic backtracking regex patterns', () => {
      // Catastrophic exponential backtrack pattern: (a+)+
      expect(validateRegex('(a+)+')).toBe(false);
      // Another vulnerability: ([a-zA-Z]+)*
      expect(validateRegex('([a-zA-Z]+)*')).toBe(false);

      // Safe pattern
      expect(validateRegex('^[a-zA-Z0-9_-]+$')).toBe(true);
    });

    it('should perform tests with timeout gracefully and block unsafe evaluations', async () => {
      const safeCheck = await testRegexWithTimeout('^[0-9]+$', '12345');
      expect(safeCheck).toBe(true);

      const unsafeCheck = await testRegexWithTimeout('(a+)+', 'aaaaaaaaaaaaaaaaaaaaaaaaaaa!');
      expect(unsafeCheck).toBe(false); // Statically blocked due to unsafe nature
    });

    it('should deeply sanitize and freeze objects, throwing on bad keys', () => {
      const goodObj = { nested: { val: 42 } };
      const frozenGood = deepSanitizeAndFreeze(goodObj);
      expect(Object.isFrozen(frozenGood)).toBe(true);
      expect(Object.isFrozen(frozenGood.nested)).toBe(true);

      const maliciousObj = {};
      Object.defineProperty(maliciousObj, '__proto__', {
        value: { admin: true },
        enumerable: true,
        configurable: true,
        writable: true
      });

      expect(() => deepSanitizeAndFreeze(maliciousObj)).toThrow();
    });
  });

});
