import crypto from 'crypto';

export class EncryptionService {
  private static getKey(): Buffer {
    const rawKey = process.env.ENCRYPTION_KEY || 'default-super-secret-secure-encryption-key-32b';
    // Always hash the raw key with SHA-256 to ensure a safe, robust, exactly 32-byte (256-bit) key
    return crypto.createHash('sha256').update(rawKey).digest();
  }

  static encrypt(plaintext: string): string {
    if (!plaintext) return '';
    const key = this.getKey();
    return this.encryptWithKey(plaintext, key);
  }

  static decrypt(ciphertext: string): string {
    if (!ciphertext) return '';
    
    // Check if the ciphertext is in our expected 3-part hex format: "iv:auth:ciphertext"
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      // If it doesn't match the format, it might be an unencrypted plaintext key.
      // We return it as-is so we degrade gracefully without breaking.
      return ciphertext;
    }
    
    try {
      const key = this.getKey();
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedText = parts[2];
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      console.error('[EncryptionService] Decryption failed:', err);
      // Fallback: if decryption fails (e.g. wrong key, unencrypted), return ciphertext itself
      return ciphertext;
    }
  }

  /**
   * Rotates a ciphertext encrypted with oldKeyRaw to a new ciphertext encrypted with newKeyRaw.
   */
  static rotate(ciphertext: string, oldKeyRaw: string, newKeyRaw: string): string {
    if (!ciphertext) return '';
    
    const oldKey = crypto.createHash('sha256').update(oldKeyRaw).digest();
    const newKey = crypto.createHash('sha256').update(newKeyRaw).digest();
    
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      // If it was plaintext, let's just encrypt it with the new key!
      return this.encryptWithKey(ciphertext, newKey);
    }
    
    try {
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedText = parts[2];
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', oldKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return this.encryptWithKey(decrypted, newKey);
    } catch (err) {
      console.error('[EncryptionService] Key rotation failed on value:', err);
      return ciphertext;
    }
  }

  private static encryptWithKey(plaintext: string, key: Buffer): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }
}
