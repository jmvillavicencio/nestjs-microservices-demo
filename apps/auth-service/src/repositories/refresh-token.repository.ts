import { Injectable } from '@nestjs/common';

export interface RefreshToken {
  token: string;
  userId: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

export interface CreateRefreshTokenData {
  token: string;
  userId: string;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokenRepository {
  private tokens: Map<string, RefreshToken> = new Map();
  private userTokensIndex: Map<string, Set<string>> = new Map();

  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    const refreshToken: RefreshToken = {
      token: data.token,
      userId: data.userId,
      expiresAt: data.expiresAt,
      revoked: false,
      createdAt: new Date(),
    };

    this.tokens.set(data.token, refreshToken);

    // Update user tokens index
    if (!this.userTokensIndex.has(data.userId)) {
      this.userTokensIndex.set(data.userId, new Set());
    }
    this.userTokensIndex.get(data.userId)!.add(data.token);

    return refreshToken;
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.tokens.get(token) || null;
  }

  async delete(token: string): Promise<void> {
    const refreshToken = this.tokens.get(token);
    if (refreshToken) {
      this.userTokensIndex.get(refreshToken.userId)?.delete(token);
      this.tokens.delete(token);
    }
  }

  async revoke(token: string): Promise<void> {
    const refreshToken = this.tokens.get(token);
    if (refreshToken) {
      refreshToken.revoked = true;
      this.tokens.set(token, refreshToken);
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const userTokens = this.userTokensIndex.get(userId);
    if (userTokens) {
      for (const token of userTokens) {
        const refreshToken = this.tokens.get(token);
        if (refreshToken) {
          refreshToken.revoked = true;
          this.tokens.set(token, refreshToken);
        }
      }
    }
  }

  async cleanupExpired(): Promise<void> {
    const now = new Date();
    for (const [token, refreshToken] of this.tokens) {
      if (refreshToken.expiresAt < now) {
        this.userTokensIndex.get(refreshToken.userId)?.delete(token);
        this.tokens.delete(token);
      }
    }
  }
}
