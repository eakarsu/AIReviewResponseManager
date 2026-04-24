const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return null;
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log('=== EMAIL (No SMTP configured - logging to console) ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html}`);
    console.log('=== END EMAIL ===');
    return { success: true, method: 'console' };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@reviewmanager.com',
      to,
      subject,
      html
    });
    return { success: true, method: 'smtp' };
  } catch (error) {
    console.error('Email send error:', error);
    console.log(`Fallback - Email to ${to}: ${subject}`);
    console.log(html);
    return { success: true, method: 'console-fallback' };
  }
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  return sendEmail({
    to: email,
    subject: 'Password Reset - AI Review Manager',
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  });
};

const sendVerificationEmail = async (email, verificationToken) => {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
  return sendEmail({
    to: email,
    subject: 'Verify Your Email - AI Review Manager',
    html: `
      <h2>Email Verification</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>If you didn't create an account, please ignore this email.</p>
    `
  });
};

module.exports = { sendEmail, sendPasswordResetEmail, sendVerificationEmail };
