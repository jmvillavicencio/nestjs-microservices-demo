import { Injectable, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

export interface AppleUserInfo {
  id: string;
  email: string;
  emailVerified: boolean;
}

interface AppleTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  email_verified?: string;
  is_private_email?: string;
  auth_time: number;
  nonce_supported: boolean;
}

@Injectable()
export class AppleAuthService {
  private readonly logger = new Logger(AppleAuthService.name);
  private readonly jwksClient: jwksClient.JwksClient;

  constructor() {
    this.jwksClient = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
    });
  }

  async verifyIdentityToken(
    identityToken: string,
  ): Promise<AppleUserInfo | null> {
    try {
      // Decode the token header to get the key ID
      const decodedToken = jwt.decode(identityToken, { complete: true });

      if (!decodedToken || typeof decodedToken === 'string') {
        this.logger.warn('Failed to decode Apple identity token');
        return null;
      }

      const kid = decodedToken.header.kid;

      if (!kid) {
        this.logger.warn('Apple identity token missing key ID');
        return null;
      }

      // Get the signing key from Apple's JWKS
      const signingKey = await this.getSigningKey(kid);

      if (!signingKey) {
        this.logger.warn('Failed to get Apple signing key');
        return null;
      }

      // Verify the token
      const payload = jwt.verify(identityToken, signingKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: process.env.APPLE_CLIENT_ID || 'your-apple-client-id',
      }) as AppleTokenPayload;

      return {
        id: payload.sub,
        email: payload.email || '',
        emailVerified: payload.email_verified === 'true',
      };
    } catch (error) {
      this.logger.error('Failed to verify Apple identity token', error);
      return null;
    }
  }

  private async getSigningKey(kid: string): Promise<string | null> {
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      return key.getPublicKey();
    } catch (error) {
      this.logger.error('Failed to get Apple signing key', error);
      return null;
    }
  }
}
