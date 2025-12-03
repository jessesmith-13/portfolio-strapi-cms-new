import { factories } from '@strapi/strapi';
import nodemailer from "nodemailer";

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

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: process.env.CONTACT_TO_EMAIL,
        subject: `New Message from ${name}`,
        text: `
          Name: ${name}
          Email: ${email}
          Message: ${message}
        `,
      });

      // v5 email service
      console.log("✅ Email sent:", info.messageId);
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.log("Preview URL:", preview);

      ctx.body = { success: true, message: "Quote request sent successfully." };
    } catch (err) {
      console.error('SEND EMAIL ERROR', err);
      return ctx.internalServerError('Email failed to send.');
    }
  },
}));