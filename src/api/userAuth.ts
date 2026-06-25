import crypto from 'crypto';
import { db, tables } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { generateSecureId } from '../utils/idGenerator.js';
import { SECRETS } from '../config/secrets.js';

export function signToken(payload: any, expiresIn: number = 86400): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresIn;
  const fullPayload = { ...payload, exp };
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', SECRETS.JWT_SECRET)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');
    
  return `${base64Header}.${base64Payload}.${signature}`;
}

export function verifyToken(token: string): any {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    
    const expectedSignature = crypto
      .createHmac('sha256', SECRETS.JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) return null;
    
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return decodedPayload;
  } catch {
    return null;
  }
}

/**
 * Robust, highly secure password hashing using PBKDF2 with SHA-512 and 600,000 iterations.
 * This is native-dependency free and satisfies the modern enterprise standard.
 * Self-describing hash format: $pbkdf2-sha512$i=600000$l=64$<salt>$<hash>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 600000, 64, 'sha512').toString('hex');
  return `$pbkdf2-sha512$i=600000$l=64$${salt}$${hash}`;
}

/**
 * Validates the password against the stored self-describing hash.
 * Includes backwards compatibility with legacy PBKDF2-1000 hashes.
 * Ensures resistance to timing-attacks by utilizing timingSafeEqual for hash comparisons.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;

  try {
    if (storedHash.startsWith('$pbkdf2-sha512$')) {
      const parts = storedHash.split('$');
      // parts[0] is "", parts[1] is "pbkdf2-sha512", parts[2] is "i=600000", parts[3] is "l=64", parts[4] is salt, parts[5] is hash
      if (parts.length < 6) return false;
      const iterationsPart = parts[2].split('=')[1];
      const lengthPart = parts[3].split('=')[1];
      const iterations = parseInt(iterationsPart, 10);
      const keylen = parseInt(lengthPart, 10);
      const salt = parts[4];
      const hash = parts[5];

      const verifyHash = crypto.pbkdf2Sync(password, salt, iterations, keylen, 'sha512').toString('hex');
      const h1 = Buffer.from(hash, 'hex');
      const h2 = Buffer.from(verifyHash, 'hex');
      if (h1.length !== h2.length) return false;
      return crypto.timingSafeEqual(h1, h2);
    }

    // Fallback support for legacy non-prefixed format (pbkdf2-1000 under sha512)
    if (storedHash.includes(':')) {
      const [salt, hash] = storedHash.split(':');
      if (!salt || !hash) return false;
      const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
      const h1 = Buffer.from(hash, 'hex');
      const h2 = Buffer.from(verifyHash, 'hex');
      if (h1.length !== h2.length) return false;
      return crypto.timingSafeEqual(h1, h2);
    }

    // fallback for plain text if any
    return password === storedHash;
  } catch {
    return false;
  }
}

// User-DB Management using central database adapter (Postgres / SQLite)
export const UserManager = {
  async register(email: string, passwordPlain: string, role: string = 'viewer') {
    const id = generateSecureId('usr');
    const passwordHash = hashPassword(passwordPlain);
    try {
      await db.insert(tables.users).values({
        id,
        email,
        passwordHash,
        role,
        createdAt: new Date().toISOString()
      });
      return { id, email, role };
    } catch (err: any) {
      if (err.message && (err.message.includes('UNIQUE') || err.message.includes('unique'))) {
        throw new Error('User with this email already registered.');
      }
      throw err;
    }
  },

  async login(email: string, passwordPlain: string) {
    const rows = await db.select()
      .from(tables.users)
      .where(eq(tables.users.email, email))
      .limit(1);
    
    const user = rows[0];
    if (!user) {
      throw new Error('Invalid email or password.');
    }
    if (!verifyPassword(passwordPlain, user.passwordHash)) {
      throw new Error('Invalid email or password.');
    }

    // Transparent password auto-upgrade to pbkdf2-sha512 with 600,000 iterations
    if (!user.passwordHash.startsWith('$pbkdf2-sha512$')) {
      const upgradedHash = hashPassword(passwordPlain);
      await db.update(tables.users)
        .set({ passwordHash: upgradedHash })
        .where(eq(tables.users.id, user.id));
      user.passwordHash = upgradedHash;
    }

    return { id: user.id, email: user.email, role: user.role };
  },

  async getById(id: string) {
    const rows = await db.select({
      id: tables.users.id,
      email: tables.users.email,
      role: tables.users.role,
      createdAt: tables.users.createdAt
    })
    .from(tables.users)
    .where(eq(tables.users.id, id))
    .limit(1);

    return rows[0] || null;
  }
};

export { db };
