import crypto from 'crypto';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'agentforge.db');

// Ensure db directory or DB_PATH can be created
const db = new Database(DB_PATH);

// Initialize standard sqlite schemas for users, projects, graphs, etc.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer', -- 'admin' | 'editor' | 'viewer' | 'api_user'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    user_id TEXT DEFAULT 'anonymous',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS graphs (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    nodes TEXT NOT NULL,
    connections TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

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

// User-DB Management
export const UserManager = {
  register(email: string, passwordPlain: string, role: string = 'viewer') {
    const id = `usr_${Math.random().toString(36).substr(2, 9)}`;
    const passwordHash = hashPassword(passwordPlain);
    try {
      const stmt = db.prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)');
      stmt.run(id, email, passwordHash, role);
      return { id, email, role };
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE')) {
        throw new Error('User with this email already registered.');
      }
      throw err;
    }
  },

  login(email: string, passwordPlain: string) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email) as any;
    if (!user) {
      throw new Error('Invalid email or password.');
    }
    if (!verifyPassword(passwordPlain, user.password_hash)) {
      throw new Error('Invalid email or password.');
    }
    return { id: user.id, email: user.email, role: user.role };
  },

  getById(id: string) {
    const stmt = db.prepare('SELECT id, email, role, created_at FROM users WHERE id = ?');
    return stmt.get(id);
  }
};

export { db };
