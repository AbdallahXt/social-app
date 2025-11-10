import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

const transporter =
  env.nodeEnv === 'test'
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined
      });

export async function sendEmail(options: {
  to: string;
  subject: string;
  template: string;
  context?: Record<string, any>;
  tags?: string[];
}) {
  try {
    // Template path: from dist/services/email.js -> src/templates/emails
    // In development: __dirname = src/services, so ../../src/templates/emails = src/templates/emails
    // In production: __dirname = dist/services, so ../../src/templates/emails = src/templates/emails
    let templatePath = path.join(__dirname, '../templates/emails', `${options.template}.hbs`);
    
    // Check if file exists, if not try alternative path
    try {
      await fs.promises.access(templatePath);
    } catch {
      // Fallback: try from root templates folder
      templatePath = path.join(__dirname, '../../templates/emails', `${options.template}.hbs`);
    }
    
    const source = await fs.promises.readFile(templatePath, 'utf-8');
    const compile = Handlebars.compile(source);
    const html = compile(options.context || {});
    const headers: Record<string, string> = {};
    if (options.tags?.length) headers['X-Tags'] = options.tags.join(',');
    await transporter.sendMail({
      from: env.smtp.from,
      to: options.to,
      subject: options.subject,
      html,
      headers
    });
  } catch (error) {
    console.error('Email sending error:', error);
    throw error; // Re-throw to be caught by caller
  }
}
