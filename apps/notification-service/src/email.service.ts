import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import * as nodemailer from 'nodemailer';
import { TemplateService, TemplateName } from './template.service';

/**
 * Options for sending an email.
 */
interface EmailOptions {
  to: string;
  subject: string;
  template: TemplateName;
  data: Record<string, unknown>;
}

/**
 * Service responsible for sending email notifications.
 * Supports both SendGrid (production) and nodemailer (development) transports.
 * Uses Handlebars templates for email content.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly useSendGrid: boolean;
  private nodemailerTransport?: nodemailer.Transporter;

  constructor(private readonly templateService: TemplateService) {
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    this.useSendGrid = !!sendGridApiKey && process.env.NODE_ENV === 'production';

    if (this.useSendGrid && sendGridApiKey) {
      sgMail.setApiKey(sendGridApiKey);
      this.logger.log('Using SendGrid for email delivery');
    } else {
      this.nodemailerTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'demo@example.com',
          pass: process.env.SMTP_PASS || 'demo-password',
        },
      });
      this.logger.log('Using nodemailer for email delivery');
    }
  }

  /**
   * Sends an email using the configured transport.
   * @param options - The email options including recipient, subject, template, and data
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    const html = this.templateService.render(options.template, options.data, options.subject);
    const from = process.env.EMAIL_FROM || '"Microservices Demo" <noreply@demo.com>';

    try {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`[DEMO] Email would be sent to: ${options.to}`);
        this.logger.log(`[DEMO] Subject: ${options.subject}`);
        this.logger.debug(`[DEMO] Template: ${options.template}`);
        return;
      }

      if (this.useSendGrid) {
        await sgMail.send({
          to: options.to,
          from,
          subject: options.subject,
          html,
        });
        this.logger.log(`Email sent via SendGrid to: ${options.to}`);
      } else if (this.nodemailerTransport) {
        const info = await this.nodemailerTransport.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          html,
        });
        this.logger.log(`Email sent via nodemailer: ${info.messageId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      throw error;
    }
  }

  /**
   * Sends a welcome email to a new user.
   * @param email - The recipient's email address
   * @param name - The user's name
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Welcome to Our Platform!',
      template: 'welcome',
      data: { name },
    });
  }

  /**
   * Sends a payment confirmation email.
   * @param email - The recipient's email address
   * @param amount - The payment amount
   * @param currency - The payment currency
   * @param paymentId - The payment identifier
   */
  async sendPaymentConfirmation(
    email: string,
    amount: number,
    currency: string,
    paymentId: string,
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Payment Confirmation',
      template: 'payment-confirmation',
      data: {
        amount: amount.toFixed(2),
        currency,
        paymentId,
      },
    });
  }

  /**
   * Sends a payment failure notification email.
   * @param email - The recipient's email address
   * @param amount - The attempted payment amount
   * @param currency - The payment currency
   * @param reason - The reason for failure
   */
  async sendPaymentFailedNotification(
    email: string,
    amount: number,
    currency: string,
    reason: string,
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Payment Failed',
      template: 'payment-failed',
      data: {
        amount: amount.toFixed(2),
        currency,
        reason,
      },
    });
  }

  /**
   * Sends a refund notification email.
   * @param email - The recipient's email address
   * @param amount - The refund amount
   * @param currency - The refund currency
   * @param paymentId - The original payment identifier
   */
  async sendRefundNotification(
    email: string,
    amount: number,
    currency: string,
    paymentId: string,
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Refund Processed',
      template: 'refund-notification',
      data: {
        amount: amount.toFixed(2),
        currency,
        paymentId,
      },
    });
  }

  /**
   * Sends an account update notification email.
   * @param email - The recipient's email address
   * @param name - The user's name
   */
  async sendAccountUpdateNotification(email: string, name: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Account Updated',
      template: 'account-updated',
      data: { name },
    });
  }

  /**
   * Sends an account deletion notification email.
   * @param email - The recipient's email address
   */
  async sendAccountDeletedNotification(email: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Account Deleted',
      template: 'account-deleted',
      data: {},
    });
  }

  /**
   * Sends a welcome email for users registering via OAuth.
   * @param email - The recipient's email address
   * @param name - The user's name
   * @param provider - The OAuth provider (email, google, apple)
   */
  async sendAuthWelcomeEmail(email: string, name: string, provider: string): Promise<void> {
    const providerText = provider === 'email'
      ? 'your email and password'
      : provider === 'google'
        ? 'your Google account'
        : 'your Apple account';

    await this.sendEmail({
      to: email,
      subject: 'Welcome to Our Platform!',
      template: 'auth-welcome',
      data: {
        name,
        provider,
        providerText,
      },
    });
  }

  /**
   * Sends a password reset email with a reset link.
   * @param email - The recipient's email address
   * @param token - The password reset token
   * @param expiresAt - The token expiration timestamp
   */
  async sendPasswordResetEmail(email: string, token: string, expiresAt: string): Promise<void> {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    await this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      data: {
        resetLink,
        expiresAt: new Date(expiresAt).toLocaleString(),
      },
    });
  }

  /**
   * Sends a password reset confirmation email.
   * @param email - The recipient's email address
   */
  async sendPasswordResetConfirmation(email: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Password Reset Successful',
      template: 'password-reset-confirmation',
      data: {},
    });
  }

  /**
   * Sends a password changed notification email.
   * @param email - The recipient's email address
   */
  async sendPasswordChangedNotification(email: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Password Changed',
      template: 'password-changed',
      data: {},
    });
  }
}
