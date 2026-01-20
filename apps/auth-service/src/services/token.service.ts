import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  provider: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class TokenService {
  private readonly accessTokenExpiresIn = 15 * 60; // 15 minutes in seconds
  private readonly refreshTokenExpiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor(
    private readonly jwtService: JwtService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload.sub);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiresIn,
    };
  }

  private generateAccessToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiresIn,
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    });
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiresIn * 1000);

    await this.refreshTokenRepository.create({
      token,
      userId,
      expiresAt,
    });

    return token;
  }

  async validateAccessToken(token: string): Promise<TokenPayload | null> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
      });
      return payload;
    } catch {
      return null;
    }
  }

  async validateRefreshToken(token: string): Promise<string | null> {
    const storedToken = await this.refreshTokenRepository.findByToken(token);

    if (!storedToken) {
      return null;
    }

    if (storedToken.expiresAt < new Date()) {
      await this.refreshTokenRepository.delete(token);
      return null;
    }

    if (storedToken.revoked) {
      return null;
    }

    return storedToken.userId;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshTokenRepository.revoke(token);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.revokeAllForUser(userId);
  }

  generatePasswordResetToken(): string {
    return uuidv4();
  }
}
