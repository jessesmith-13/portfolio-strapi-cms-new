import { factories } from '@strapi/strapi';
import { Resend } from 'resend';

export default factories.createCoreController('api::contact.contact', ({ strapi }) => ({

  async submit(ctx) {
    console.log("HIT SUBMIT CONTROLLER");
    try {
      const { name, email, message } = ctx.request.body;
      console.log('NAME', name);
      console.log('EMAIL', email);
      console.log('MESSAGE', message);

      if (!name || !email || !message) {
        return ctx.badRequest('Missing required fields.');
      }

      // Initialize Resend
      const resend = new Resend(process.env.RESEND_API_KEY);

      // Send email via Resend
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_DEFAULT_FROM || 'noreply@yourdomain.com',
        to: process.env.EMAIL_TO?.split(',') || ['default@example.com'],
        replyTo: email, // User's email for easy replies
        subject: `New Contact Message from ${name}`,
        text: `
Name: ${name}
Email: ${email}

Message:
${message}
        `,
      });

      if (error) {
        console.error('❌ Resend error:', error);
        return ctx.internalServerError('Email failed to send.');
      }

      console.log("✅ Email sent via Resend:", data?.id);
      
      ctx.body = { success: true, message: "Contact message sent successfully." };
    } catch (err) {
      console.error('SEND EMAIL ERROR', err);
      return ctx.internalServerError('Email failed to send.');
    }
  },
}));