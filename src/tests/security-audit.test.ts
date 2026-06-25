import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import { hashPassword, verifyPassword, UserManager, db } from '../api/userAuth.js';
import { SecretsShield } from '../api/auth.js';
import { tables } from '../db/index.js';
import { eq } from 'drizzle-orm';

describe('=== Phase 1 Security Audit: Robust Cryptographic and Password Hashing Tests ===', () => {

  describe('1. Dynamic Password Hashing & Transparent Migration', () => {
    
    it('should generate a secure, self-describing PBKDF2-SHA512 hash with 600,000 iterations', () => {
      const password = 'enterprise-secret-password-2026';
      const hash = hashPassword(password);
      
      expect(hash).toContain('$pbkdf2-sha512$i=600000$l=64$');
      
      const parts = hash.split('$');
      expect(parts.length).toBe(6); // parts: "", "pbkdf2-sha512", "i=600000", "l=64", salt, hash
      expect(verifyPassword(password, hash)).toBe(true);
      expect(verifyPassword('wrong-password', hash)).toBe(false);
    });

    it('should correctly verify legacy PBKDF2-1000 hashes and use timingSafeEqual', () => {
      // Generate legacy hash manually
      const password = 'my-legacy-password';
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
      const legacyStoredHash = `${salt}:${hash}`;
      
      // Spy on crypto.timingSafeEqual
      const timingSafeEqualSpy = vi.spyOn(crypto, 'timingSafeEqual');
      
      const verified = verifyPassword(password, legacyStoredHash);
      expect(verified).toBe(true);
      expect(timingSafeEqualSpy).toHaveBeenCalled();
      
      timingSafeEqualSpy.mockRestore();
    });

    it('should transparently upgrade legacy password hashes to modern pbkdf2-sha512 on successful login', async () => {
      const email = `test-migration-${Date.now()}@agentforge.ai`;
      const password = 'migration-test-password-2026';
      
      // Create a user directly with a legacy PBKDF2-1000 hash
      const salt = crypto.randomBytes(16).toString('hex');
      const legacyHashVal = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
      const legacyStoredHash = `${salt}:${legacyHashVal}`;
      
      const userId = `usr_migration_test_${Date.now()}`;
      
      // Seed user row directly to database bypassing UserManager
      await db.insert(tables.users).values({
        id: userId,
        email,
        passwordHash: legacyStoredHash,
        role: 'viewer',
        createdAt: new Date().toISOString()
      });
      
      // Verify they are stored with legacy hash first
      const rawRowsBefore = await db.select().from(tables.users).where(eq(tables.users.id, userId)).limit(1);
      expect(rawRowsBefore[0].passwordHash).not.toContain('$pbkdf2-sha512$');
      
      // Log in using UserManager - should trigger transparent auto-upgrade
      const loggedInUser = await UserManager.login(email, password);
      expect(loggedInUser.email).toBe(email);
      
      // Query the user from DB again to check if the hash has been updated
      const rawRowsAfter = await db.select().from(tables.users).where(eq(tables.users.id, userId)).limit(1);
      const upgradedHash = rawRowsAfter[0].passwordHash;
      
      expect(upgradedHash).toContain('$pbkdf2-sha512$i=600000$l=64$');
      expect(verifyPassword(password, upgradedHash)).toBe(true);
    });
  });

  describe('2. Cryptographic Secrets Protection (SecretsShield)', () => {
    
    it('should generate completely different ciphertexts for the same plaintext across multiple encryptions (dynamic salt)', () => {
      const shield = new SecretsShield();
      const plainText = 'sk-or-proj-highly-sensitive-api-token-value-2026';
      
      const encrypted1 = shield.encrypt(plainText);
      const encrypted2 = shield.encrypt(plainText);
      
      expect(encrypted1).not.toBe(encrypted2);
      expect(encrypted1.split(':').length).toBe(4); // salt:iv:tag:ciphertext
      
      expect(shield.decrypt(encrypted1)).toBe(plainText);
      expect(shield.decrypt(encrypted2)).toBe(plainText);
    });

    it('should transparently decrypt legacy ciphertexts that were encrypted without dynamic salts', () => {
      // Simulate legacy SecretsShield key derivation:
      // In the legacy version, constructor did: crypto.scryptSync(keySource, 'agentforge-salt', 32)
      // Then encrypt did: IV, cipher with key, final, join with colon.
      const legacyKeySource = process.env.ENCRYPTION_MASTER_KEY || 'test_encryption_master_key_with_32_chars_or_more_agentforge_2026';
      const legacyKey = crypto.scryptSync(legacyKeySource, 'agentforge-salt', 32);
      
      const plainText = 'legacy-third-party-api-secret';
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', legacyKey, iv) as any;
      
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag();
      
      // format is legacy iv:tag:content
      const legacyContainer = [
        iv.toString('hex'),
        tag.toString('hex'),
        encrypted
      ].join(':');
      
      const shield = new SecretsShield();
      const decrypted = shield.decrypt(legacyContainer);
      expect(decrypted).toBe(plainText);
    });

    it('should throw an error on malformed secrets containers', () => {
      const shield = new SecretsShield();
      expect(() => shield.decrypt('malformed-container-without-colons')).toThrow();
    });
  });
});
