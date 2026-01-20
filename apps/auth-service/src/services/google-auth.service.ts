import { Injectable, Logger } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
    );
  }

  async verifyIdToken(idToken: string): Promise<GoogleUserInfo | null> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
      });

      const payload = ticket.getPayload();

      if (!payload) {
        this.logger.warn('Google token verification returned no payload');
        return null;
      }

      return {
        id: payload.sub,
        email: payload.email || '',
        name: payload.name || '',
        picture: payload.picture,
        emailVerified: payload.email_verified || false,
      };
    } catch (error) {
      this.logger.error('Failed to verify Google ID token', error);
      return null;
    }
  }
}
