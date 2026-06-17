import crypto from 'crypto';
import { db, tables } from '../db/index.js';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'agentforge_secret_jwt_key_2026';

export function signToken(payload: any, expiresIn: number = 86400): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresIn;
  const fullPayload = { ...payload, exp };
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');
    
  return `${base64Header}.${base64Payload}.${signature}`;
}

export function verifyToken(token: string): any {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
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

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// User-DB Management using central database adapter (Postgres / SQLite)
export const UserManager = {
  async register(email: string, passwordPlain: string, role: string = 'viewer') {
    const id = `usr_${Math.random().toString(36).substring(2, 11)}`;
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
