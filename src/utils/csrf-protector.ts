import crypto from 'crypto';

export class CSRFProtector {
  private secret: string;

  constructor(secret?: string) {
    this.secret = secret || process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
  }

  generateToken(sessionId: string): string {
    const salt = crypto.randomBytes(8).toString('hex');
    const hash = crypto
      .createHmac('sha256', this.secret)
      .update(`${sessionId}:${salt}`)
      .digest('hex');
    return `${salt}.${hash}`;
  }

  verifyToken(sessionId: string, token: string): boolean {
    if (!token || !token.includes('.')) return false;
    const [salt, hash] = token.split('.');
    
    const expectedHash = crypto
      .createHmac('sha256', this.secret)
      .update(`${sessionId}:${salt}`)
      .digest('hex');
    
    // Constant-time comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
    } catch {
      return false;
    }
  }
}
