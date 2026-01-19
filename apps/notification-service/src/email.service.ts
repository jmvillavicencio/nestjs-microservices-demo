import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create a test account for demo purposes
    // In production, use real SMTP credentials from environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'demo@example.com',
        pass: process.env.SMTP_PASS || 'demo-password',
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      // In demo mode, just log the email instead of sending
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`[DEMO] Email would be sent to: ${options.to}`);
        this.logger.log(`[DEMO] Subject: ${options.subject}`);
        this.logger.log(`[DEMO] Content: ${options.text || options.html}`);
        return;
      }

      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Microservices Demo" <noreply@demo.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`Email sent: ${info.messageId}`);
    } catch (error) {
      this.logger.error('Failed to send email', error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Welcome to Our Platform!',
      html: `
        <h1>Welcome, ${name}!</h1>
        <p>Thank you for joining our platform. We're excited to have you!</p>
        <p>Get started by exploring our features and setting up your profile.</p>
        <br>
        <p>Best regards,</p>
        <p>The Team</p>
      `,
    });
  }

  async sendPaymentConfirmation(
    email: string,
    amount: number,
    currency: string,
    paymentId: string,
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Payment Confirmation',
      html: `
        <h1>Payment Successful!</h1>
        <p>Your payment has been processed successfully.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
          <p><strong>Payment ID:</strong> ${paymentId}</p>
          <p><strong>Amount:</strong> ${currency} ${amount.toFixed(2)}</p>
        </div>
        <br>
        <p>Thank you for your purchase!</p>
      `,
    });
  }

  async sendPaymentFailedNotification(
    email: string,
    amount: number,
    currency: string,
    reason: string,
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Payment Failed',
      html: `
        <h1>Payment Failed</h1>
        <p>Unfortunately, your payment could not be processed.</p>
        <div style="background: #fff3f3; padding: 15px; border-radius: 5px;">
          <p><strong>Amount:</strong> ${currency} ${amount.toFixed(2)}</p>
          <p><strong>Reason:</strong> ${reason}</p>
        </div>
        <br>
        <p>Please try again or contact support if the issue persists.</p>
      `,
    });
  }

  async sendRefundNotification(
    email: string,
    amount: number,
    currency: string,
    paymentId: string,
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Refund Processed',
      html: `
        <h1>Refund Confirmed</h1>
        <p>Your refund has been processed successfully.</p>
        <div style="background: #f0fff0; padding: 15px; border-radius: 5px;">
          <p><strong>Original Payment ID:</strong> ${paymentId}</p>
          <p><strong>Refund Amount:</strong> ${currency} ${amount.toFixed(2)}</p>
        </div>
        <br>
        <p>The funds should appear in your account within 5-10 business days.</p>
      `,
    });
  }

  async sendAccountUpdateNotification(email: string, name: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Account Updated',
      html: `
        <h1>Account Updated</h1>
        <p>Hi ${name},</p>
        <p>Your account information has been updated successfully.</p>
        <p>If you did not make this change, please contact support immediately.</p>
        <br>
        <p>Best regards,</p>
        <p>The Team</p>
      `,
    });
  }

  async sendAccountDeletedNotification(email: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Account Deleted',
      html: `
        <h1>Account Deleted</h1>
        <p>Your account has been successfully deleted.</p>
        <p>We're sorry to see you go. If you ever want to come back, you're always welcome!</p>
        <br>
        <p>Best regards,</p>
        <p>The Team</p>
      `,
    });
  }
}
