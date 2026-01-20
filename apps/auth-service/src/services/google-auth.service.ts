import { Injectable, Logger } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

/**
 * User information extracted from a verified Google ID token.
 */
export interface GoogleUserInfo {
  /** Google's unique identifier for the user */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string;
  /** URL to user's profile picture */
  picture?: string;
  /** Whether the email has been verified by Google */
  emailVerified: boolean;
}

/**
 * Service responsible for Google OAuth authentication.
 *
 * This service handles the verification of Google ID tokens obtained from
 * the frontend using Google's Sign-In SDK. The flow is:
 *
 * 1. Frontend uses Google Identity Services SDK to authenticate user
 * 2. Google returns an ID token (JWT) to the frontend
 * 3. Frontend sends the ID token to your backend
 * 4. This service verifies the token with Google and extracts user info
 *
 * @see https://developers.google.com/identity/gsi/web/guides/overview
 *
 * Required environment variables:
 * - GOOGLE_CLIENT_ID: Your Google OAuth 2.0 Client ID from Google Cloud Console
 */
@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly client: OAuth2Client;
  private readonly clientId: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.client = new OAuth2Client(this.clientId);

    if (!this.clientId || this.clientId === 'your-google-client-id') {
      this.logger.warn(
        'GOOGLE_CLIENT_ID not configured. Google authentication will not work.',
      );
    }
  }

  /**
   * Verifies a Google ID token and extracts user information.
   *
   * The ID token is a JWT signed by Google that contains user claims.
   * This method verifies the token signature and checks that:
   * - The token was issued by Google
   * - The token has not expired
   * - The token audience matches your client ID
   *
   * @param idToken - The Google ID token (JWT) from the frontend
   * @returns User information if token is valid, null otherwise
   *
   * @example
   * ```typescript
   * const userInfo = await googleAuthService.verifyIdToken(idToken);
   * if (userInfo) {
   *   console.log(`Welcome ${userInfo.name}!`);
   * }
   * ```
   */
  async verifyIdToken(idToken: string): Promise<GoogleUserInfo | null> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
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
