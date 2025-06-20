import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import type { User } from '../db/schema/auth';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat: number;
  exp: number;
}

export class JWTAuth {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'your-super-secret-access-key';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
    this.accessTokenExpiry = (process.env.JWT_ACCESS_EXPIRY || '15m') as string;
    this.refreshTokenExpiry = (process.env.JWT_REFRESH_EXPIRY || '7d') as string;
  }

  // Generate access token
  generateAccessToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'class-monitoring-system',
      audience: 'class-monitoring-app',
    } as jwt.SignOptions) as string;
  }

  // Generate refresh token
  generateRefreshToken(userId: string): { token: string; tokenId: string } {
    const tokenId = randomBytes(32).toString('hex');
    const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      userId,
      tokenId,
    };

    const token = jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'class-monitoring-system',
      audience: 'class-monitoring-app',
    } as jwt.SignOptions) as string;

    return { token, tokenId };
  }

  // Verify access token
  verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'class-monitoring-system',
        audience: 'class-monitoring-app',
      }) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  // Verify refresh token
  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'class-monitoring-system',
        audience: 'class-monitoring-app',
      }) as RefreshTokenPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  // Hash password
  hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = createHash('sha256')
      .update(password + salt)
      .digest('hex');
    return `${salt}:${hash}`;
  }

  // Verify password
  verifyPassword(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(':');
    const computedHash = createHash('sha256')
      .update(password + salt)
      .digest('hex');
    return hash === computedHash;
  }

  // Generate random password
  generateRandomPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  // Extract token from Authorization header
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

export const jwtAuth = new JWTAuth();