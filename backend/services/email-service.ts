/**
 * 📧 Email Service - Sala Oscura
 * 
 * Servicio para envío de correos electrónicos
 * Soporta: AWS SES, SMTP (Gmail, Outlook), SendGrid, Mailgun
 */

import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import * as nodemailer from 'nodemailer';

// Configuración
const REGION = process.env.AWS_REGION || 'sa-east-1';
const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@salaoscura.cl';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@salaoscura.cl';

const sesClient = new SESClient({ region: REGION });

// ==========================================
// 📂 TIPOS
// ==========================================

export interface EmailData {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  html?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64
  contentType: string;
}

export interface ContactMessage {
  id: number | string;
  fecha: string;
  nombre: string;
  email: string;
  telefono: string;
  mensaje: string;
  archivos?: {
    nombre: string;
    tipo: string;
    data: string;
  }[];
  leido?: boolean;
}

export interface EmailConfig {
  provider: 'ses' | 'smtp' | 'sendgrid' | 'mailgun';
  from?: string;
  to: string;
  cc?: string;
  subject?: string;
  template?: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
  api?: {
    key: string;
    domain?: string;
  };
}

// ==========================================
// 📧 ENVÍO CON AWS SES
// ==========================================

export async function sendEmailSES(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const toAddresses = Array.isArray(data.to) ? data.to : [data.to];
    const ccAddresses = data.cc ? (Array.isArray(data.cc) ? data.cc : [data.cc]) : undefined;
    
    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: toAddresses,
        CcAddresses: ccAddresses,
      },
      Message: {
        Subject: {
          Data: data.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: data.body,
            Charset: 'UTF-8',
          },
          Html: data.html ? {
            Data: data.html,
            Charset: 'UTF-8',
          } : undefined,
        },
      },
      ReplyToAddresses: data.replyTo ? [data.replyTo] : undefined,
    });

    const response = await sesClient.send(command);
    
    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error: any) {
    console.error('Error enviando email con SES:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido',
    };
  }
}

// ==========================================
// 📧 ENVÍO CON SMTP (Gmail, Outlook, etc)
// ==========================================

export async function sendEmailSMTP(data: EmailData, config: EmailConfig['smtp']): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!config) {
    return { success: false, error: 'Configuración SMTP no proporcionada' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: config.user,
      to: Array.isArray(data.to) ? data.to.join(', ') : data.to,
      cc: data.cc ? (Array.isArray(data.cc) ? data.cc.join(', ') : data.cc) : undefined,
      subject: data.subject,
      text: data.body,
      html: data.html,
      replyTo: data.replyTo,
      attachments: data.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        encoding: 'base64',
        contentType: att.contentType,
      })),
    };

    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('Error enviando email con SMTP:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido',
    };
  }
}

// ==========================================
// 📧 PLANTILLAS DE EMAIL
// ==========================================

export function getContactNotificationHTML(message: ContactMessage): string {
  const fecha = new Date(message.fecha).toLocaleString('es-CL', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const archivosHTML = message.archivos && message.archivos.length > 0
    ? `<div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
        <strong>📎 Archivos adjuntos:</strong> ${message.archivos.length} archivo(s)
        <p style="color: #666; font-size: 12px;">Los archivos están disponibles en el panel de administración.</p>
       </div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 16px 16px 0 0;">
      <h1 style="color: #D4AF37; margin: 0; font-size: 24px;">📩 Nuevo Mensaje de Contacto</h1>
      <p style="color: #888; margin: 10px 0 0 0; font-size: 14px;">Sala Oscura - Panel de Administración</p>
    </div>
    
    <!-- Content -->
    <div style="background: #1a1a2e; padding: 30px; border-left: 1px solid #333; border-right: 1px solid #333;">
      <!-- Info del remitente -->
      <div style="background: rgba(212, 175, 55, 0.1); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #D4AF37; margin: 0 0 15px 0; font-size: 18px;">👤 Información del Remitente</h2>
        <table style="width: 100%; color: #fff;">
          <tr>
            <td style="padding: 8px 0; color: #888; width: 100px;">Nombre:</td>
            <td style="padding: 8px 0; font-weight: 600;">${message.nombre}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888;">Email:</td>
            <td style="padding: 8px 0;"><a href="mailto:${message.email}" style="color: #D4AF37;">${message.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888;">Teléfono:</td>
            <td style="padding: 8px 0;">${message.telefono}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888;">Fecha:</td>
            <td style="padding: 8px 0; font-size: 13px;">${fecha}</td>
          </tr>
        </table>
      </div>
      
      <!-- Mensaje -->
      <div style="background: #0f0f1a; border-radius: 12px; padding: 20px;">
        <h2 style="color: #fff; margin: 0 0 15px 0; font-size: 18px;">💬 Mensaje</h2>
        <p style="color: #ddd; line-height: 1.6; white-space: pre-wrap; margin: 0;">${message.mensaje}</p>
      </div>
      
      ${archivosHTML}
    </div>
    
    <!-- Footer -->
    <div style="background: #0f0f1a; padding: 20px; text-align: center; border-radius: 0 0 16px 16px; border: 1px solid #333; border-top: none;">
      <a href="${process.env.ADMIN_URL || 'https://salaoscura.cl/admin.html'}?tab=mensajes" 
         style="display: inline-block; background: linear-gradient(135deg, #D4AF37, #F4D03F); color: #000; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: 600;">
        Ver en el Panel Admin
      </a>
      <p style="color: #666; font-size: 12px; margin: 15px 0 0 0;">
        © ${new Date().getFullYear()} Sala Oscura. Todos los derechos reservados.
      </p>
    </div>
  </div>
</body>
</html>
`;
}

export function getReplyEmailHTML(originalMessage: ContactMessage, replyText: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; border-radius: 16px 16px 0 0;">
      <h1 style="color: #D4AF37; margin: 0; font-size: 24px;">Sala Oscura</h1>
      <p style="color: #888; margin: 10px 0 0 0; font-size: 14px;">Respuesta a tu mensaje</p>
    </div>
    
    <!-- Content -->
    <div style="background: #fff; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
      <p style="color: #333; margin: 0 0 20px 0;">Hola <strong>${originalMessage.nombre}</strong>,</p>
      
      <div style="color: #333; line-height: 1.8; white-space: pre-wrap;">${replyText}</div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <!-- Mensaje original -->
      <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #D4AF37;">
        <p style="color: #888; margin: 0 0 10px 0; font-size: 12px;">Tu mensaje original:</p>
        <p style="color: #666; margin: 0; font-size: 14px; font-style: italic;">"${originalMessage.mensaje.substring(0, 200)}${originalMessage.mensaje.length > 200 ? '...' : ''}"</p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 20px;">
      <p style="color: #888; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Sala Oscura. Todos los derechos reservados.
      </p>
    </div>
  </div>
</body>
</html>
`;
}

// ==========================================
// 📧 FUNCIONES PRINCIPALES
// ==========================================

/**
 * Enviar notificación de nuevo mensaje de contacto al admin
 */
export async function sendContactNotification(message: ContactMessage, config: EmailConfig): Promise<{ success: boolean; error?: string }> {
  const subject = (config.subject || 'Nuevo mensaje de contacto - {nombre}')
    .replace('{nombre}', message.nombre)
    .replace('{email}', message.email)
    .replace('{fecha}', new Date(message.fecha).toLocaleDateString('es-CL'));

  const htmlContent = getContactNotificationHTML(message);
  const textContent = `
Nuevo mensaje de contacto en Sala Oscura

De: ${message.nombre}
Email: ${message.email}
Teléfono: ${message.telefono}
Fecha: ${new Date(message.fecha).toLocaleString('es-CL')}

Mensaje:
${message.mensaje}

${message.archivos && message.archivos.length > 0 ? `Archivos adjuntos: ${message.archivos.length} archivo(s)` : ''}

---
Ver en el panel de administración
`;

  const emailData: EmailData = {
    to: config.to,
    cc: config.cc,
    subject,
    body: textContent,
    html: htmlContent,
    replyTo: message.email,
  };

  // Seleccionar proveedor
  switch (config.provider) {
    case 'ses':
      return sendEmailSES(emailData);
    case 'smtp':
      return sendEmailSMTP(emailData, config.smtp);
    default:
      return sendEmailSES(emailData); // Default a SES
  }
}

/**
 * Enviar respuesta a un mensaje de contacto
 */
export async function sendContactReply(
  originalMessage: ContactMessage, 
  replyText: string, 
  config: EmailConfig
): Promise<{ success: boolean; error?: string }> {
  const subject = `Re: Tu mensaje en Sala Oscura`;
  const htmlContent = getReplyEmailHTML(originalMessage, replyText);
  
  const emailData: EmailData = {
    to: originalMessage.email,
    subject,
    body: replyText,
    html: htmlContent,
  };

  switch (config.provider) {
    case 'ses':
      return sendEmailSES(emailData);
    case 'smtp':
      return sendEmailSMTP(emailData, config.smtp);
    default:
      return sendEmailSES(emailData);
  }
}

// ==========================================
// 📧 HANDLER PARA LAMBDA
// ==========================================

export interface EmailLambdaEvent {
  action: 'sendContactNotification' | 'sendReply';
  message?: ContactMessage;
  replyText?: string;
  config: EmailConfig;
}

export async function handler(event: EmailLambdaEvent) {
  console.log('📧 Email Lambda invocada:', event.action);

  try {
    switch (event.action) {
      case 'sendContactNotification':
        if (!event.message) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Mensaje requerido' }) };
        }
        const notifResult = await sendContactNotification(event.message, event.config);
        return {
          statusCode: notifResult.success ? 200 : 500,
          body: JSON.stringify(notifResult),
        };

      case 'sendReply':
        if (!event.message || !event.replyText) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Mensaje y texto de respuesta requeridos' }) };
        }
        const replyResult = await sendContactReply(event.message, event.replyText, event.config);
        return {
          statusCode: replyResult.success ? 200 : 500,
          body: JSON.stringify(replyResult),
        };

      default:
        return { statusCode: 400, body: JSON.stringify({ error: 'Acción no válida' }) };
    }
  } catch (error: any) {
    console.error('Error en Email Lambda:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Error interno' }),
    };
  }
}
