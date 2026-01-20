import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Available email template names.
 */
export type TemplateName =
  | 'welcome'
  | 'auth-welcome'
  | 'payment-confirmation'
  | 'payment-failed'
  | 'refund-notification'
  | 'account-updated'
  | 'account-deleted'
  | 'password-reset'
  | 'password-reset-confirmation'
  | 'password-changed';

/**
 * Service responsible for compiling and rendering Handlebars email templates.
 * Loads templates from the templates directory on initialization.
 */
@Injectable()
export class TemplateService implements OnModuleInit {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templates: Map<string, Handlebars.TemplateDelegate> = new Map();
  private baseTemplate!: Handlebars.TemplateDelegate;
  private readonly templatesDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, 'templates');
  }

  /**
   * Initializes the service by loading and compiling all templates.
   * Called automatically when the module is initialized.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Loading email templates...');
    await this.loadTemplates();
    this.logger.log(`Loaded ${this.templates.size} email templates`);
  }

  /**
   * Loads all Handlebars templates from the templates directory.
   */
  private async loadTemplates(): Promise<void> {
    try {
      // Load base template
      const baseTemplatePath = path.join(this.templatesDir, 'base.hbs');
      const baseTemplateContent = fs.readFileSync(baseTemplatePath, 'utf-8');
      this.baseTemplate = Handlebars.compile(baseTemplateContent);

      // Load all other templates
      const templateFiles = fs.readdirSync(this.templatesDir);

      for (const file of templateFiles) {
        if (file.endsWith('.hbs') && file !== 'base.hbs') {
          const templateName = file.replace('.hbs', '');
          const templatePath = path.join(this.templatesDir, file);
          const templateContent = fs.readFileSync(templatePath, 'utf-8');
          this.templates.set(templateName, Handlebars.compile(templateContent));
          this.logger.debug(`Loaded template: ${templateName}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to load templates', error);
      throw error;
    }
  }

  /**
   * Renders an email template with the provided data.
   * @param templateName - The name of the template to render
   * @param data - The data to pass to the template
   * @param subject - The email subject for the base template
   * @returns The rendered HTML string
   * @throws Error if the template is not found
   */
  render(templateName: TemplateName, data: Record<string, unknown>, subject: string): string {
    const template = this.templates.get(templateName);

    if (!template) {
      this.logger.error(`Template not found: ${templateName}`);
      throw new Error(`Template not found: ${templateName}`);
    }

    // Render the content template
    const bodyContent = template(data);

    // Render the base template with the content
    return this.baseTemplate({
      subject,
      body: bodyContent,
      companyName: process.env.COMPANY_NAME || 'Microservices Demo',
      year: new Date().getFullYear(),
      ...data,
    });
  }

  /**
   * Checks if a template exists.
   * @param templateName - The name of the template to check
   * @returns True if the template exists, false otherwise
   */
  hasTemplate(templateName: string): boolean {
    return this.templates.has(templateName);
  }
}
