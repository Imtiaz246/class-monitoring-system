import nodemailer from 'nodemailer';
import { createError } from './errors';

// Email transporter configuration
const createTransporter = () => {
  const user = process.env.NODEMAILER_USER;
  const pass = process.env.NODEMAILER_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('Email configuration missing: NODEMAILER_USER and NODEMAILER_APP_PASSWORD are required');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });
};

// Send email verification
export const sendVerificationEmail = async (email: string, token: string, name: string) => {
  try {
    const transporter = createTransporter();
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

    const mailOptions = {
      from: process.env.NODEMAILER_USER,
      to: email,
      subject: 'Verify Your Email - Class Monitoring System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Welcome to Class Monitoring System!</h2>
          <p>Hello ${name},</p>
          <p>Thank you for registering with our Class Monitoring System. To complete your registration, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${verificationUrl}</p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This verification link will expire in 24 hours. If you didn't create an account, please ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Class Monitoring System<br>
            This is an automated email, please do not reply.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw createError.internalServer('Failed to send verification email');
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email: string, token: string, name: string) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    const mailOptions = {
      from: process.env.NODEMAILER_USER,
      to: email,
      subject: 'Password Reset - Class Monitoring System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
          <p>Hello ${name},</p>
          <p>We received a request to reset your password for your Class Monitoring System account. Click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #dc3545;">${resetUrl}</p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Class Monitoring System<br>
            This is an automated email, please do not reply.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw createError.internalServer('Failed to send password reset email');
  }
};