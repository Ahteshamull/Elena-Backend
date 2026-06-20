import nodemailer from "nodemailer";
import emailTemplate_verify from "./emailTemplate.js";

class SendOtp {
  constructor() {
    this.transporter = null;
  }

  getTransporter() {
    // Lazy load transporter to ensure env variables are loaded
    if (!this.transporter) {
      const emailConfig = this.getEmailConfig();
      this.transporter = nodemailer.createTransport(emailConfig);
    }
    return this.transporter;
  }

  getEmailConfig() {
    const service = process.env.EMAIL_SERVICE || "gmail";

    // Clean up password (remove spaces if any)
    const emailPassword = (
      process.env.OTP_PASSWORD ||
      process.env.EMAIL_PASSWORD ||
      ""
    ).replace(/\s+/g, "");
    const emailUser = process.env.OTP_EMAIL || process.env.EMAIL_USER;

    if (!emailUser || !emailPassword) {
      console.error("❌ ERROR: Email credentials are missing!");
      console.error("Please set OTP_EMAIL and OTP_PASSWORD in your .env file");
    }

    if (service && service !== "custom") {
      // Use predefined service (gmail, outlook, yahoo, etc.)
      return {
        service: service,
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      };
    } else {
      // Use custom SMTP configuration
      return {
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === "true" || false, // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      };
    }
  }

  // Test email configuration
  async testConnection() {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();

      return { success: true, message: "Email service connected successfully" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send test email
  async sendTestEmail(toEmail) {
    try {
      const transporter = this.getTransporter();
      const result = await transporter.sendMail({
        from:
          process.env.EMAIL_FROM ||
          process.env.OTP_EMAIL ||
          process.env.EMAIL_USER,
        to: toEmail,
        subject: "Test Email - Dalil Arehan",
        html: `
          <h2>🎉 Email Configuration Test</h2>
          <p>If you receive this email, your Nodemailer configuration is working correctly!</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <hr>
          <p><small>This is a test email from Dalil Arehan backend service.</small></p>
        `,
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendOTPEmail(email, otp, userName = "User") {
    const senderEmail =
      process.env.EMAIL_FROM || process.env.OTP_EMAIL || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"tableli" <${senderEmail}>`,
      replyTo: senderEmail,
      to: email,
      subject: "Your Password Reset Code – tableli",
      headers: {
        "X-Mailer": "tableli Mailer",
        "X-Priority": "3",
      },
      // Plain-text fallback — required by anti-spam filters
      text: `
Password Reset Request – tableli

Hello ${userName},

We received a request to reset the password for your tableli account.

Your reset code: ${otp}

This code will expire in 10 minutes.

If you did not request a password reset, please ignore this email. Your account is safe.

© ${new Date().getFullYear()} tableli. All rights reserved.
      `.trim(),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Password Reset - tableli</h2>
          <p>Hello ${userName},</p>
          <p>We received a request to reset the password for your tableli account. Your reset code is:</p>
          <h1 style="font-size: 36px; letter-spacing: 8px; color: #e53e3e; margin: 20px 0;">${otp}</h1>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p style="font-size: 13px; color: #666; margin-top: 30px;">If you didn't request this, you can safely ignore this email. Your account is safe.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} tableli. All rights reserved. This is an automated message.</p>
        </div>
      `,
    };

    try {
      const transporter = this.getTransporter();
      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("❌ Failed to send OTP email:", error);
      console.error("Error details:", error.message);
      console.error("Error code:", error.code);
      return { success: false, error: error.message };
    }
  }

  async sendRegistrationOTP(email, otp, userName = "User") {
    const senderEmail =
      process.env.EMAIL_FROM || process.env.OTP_EMAIL || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"tableli" <${senderEmail}>`,
      replyTo: senderEmail,
      to: email,
      subject: "Your tableli Verification Code",
      headers: {
        "X-Mailer": "tableli Mailer",
        "X-Priority": "3",
      },
      // Plain-text fallback — critical for avoiding spam filters
      text: `
Welcome to tableli, ${userName}!

Thank you for registering. Please verify your email to activate your account.

Your verification code: ${otp}

This code will expire in 10 minutes.

If you did not create an account, please ignore this email.

*Important: Sometimes our emails may be routed to your Spam/Junk folder. Please mark us as 'Not Spam' to ensure you receive future notifications.*

© ${new Date().getFullYear()} tableli. All rights reserved.
      `.trim(),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Welcome to tableli!</h2>
          <p>Hello ${userName},</p>
          <p>Thank you for signing up. Please use the verification code below to activate your account:</p>
          <h1 style="font-size: 36px; letter-spacing: 8px; color: #4f46e5; margin: 20px 0;">${otp}</h1>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p style="font-size: 13px; color: #666; margin-top: 30px;">If you did not create a tableli account, you can safely ignore this email.</p>
          <p style="font-size: 13px; color: #666;"><strong>Important:</strong> Please mark us as 'Not Spam' to ensure you receive future booking notifications.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} tableli. All rights reserved. This is an automated message.</p>
        </div>
      `,
    };

    try {
      const transporter = this.getTransporter();
      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("❌ Failed to send registration OTP email:", error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetConfirmation(email, userName = "User") {
    const senderEmail = process.env.EMAIL_FROM || process.env.OTP_EMAIL || process.env.EMAIL_USER;
    const mailOptions = {
      from: `"tableli" <${senderEmail}>`,
      to: email,
      subject: "Password Reset Successful - tableli",
      headers: { "X-Mailer": "tableli Mailer" },
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">✅ Password Reset Successful</h2>
          <p>Hello ${userName},</p>
          <p>Your password has been successfully reset for your tableli account. You can now log in with your new password.</p>
          <p style="font-size: 13px; color: #666; margin-top: 20px;">If you didn't make this change, please contact our support team immediately.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} tableli. All rights reserved. This is an automated message.</p>
        </div>
      `,
      text: `
Password Reset Successful - Dalil Arehan
 
Hello ${userName}!
 
Your password has been successfully reset for your account.
 
You can now log in with your new password.
 
If you didn't make this change, please contact our support team immediately.
 
For your security, we recommend:
- Using a strong, unique password
- Enabling two-factor authentication if available
- Logging out of all devices and logging back in
 
© ${new Date().getFullYear()} Dalil Arehan. All rights reserved.
      `,
    };

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail(mailOptions);

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Failed to send confirmation email:", error);
      throw new Error("Failed to send confirmation email");
    }
  }
  async sendPaymentConfirmationEmail(email, userName, role, amount) {
    const isClient = role === "client";
    const subject = isClient 
      ? "Payment Successful - Your Chef is Booked!" 
      : "New Booking! Payment Escrowed Successfully";
      
    const message = isClient
      ? `Great news! Your payment of $${amount} has been successfully processed and held securely in escrow. Your booking is confirmed.`
      : `Great news! A client has successfully booked you and their payment of $${amount} is securely held in escrow.`;

    const senderEmail = process.env.EMAIL_FROM || process.env.OTP_EMAIL || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"tableli" <${senderEmail}>`,
      to: email,
      subject: subject,
      headers: { "X-Mailer": "tableli Mailer" },
      text: `Hello ${userName}!\n\n${message}\n\nAmount: $${amount.toFixed(2)}\n\nFor your security, funds are held in escrow and released according to our platform policies.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">${isClient ? "✅ Payment Confirmed" : "🎉 New Booking Paid"}</h2>
          <p>Hello ${userName},</p>
          <p>${message}</p>
          <p style="font-size: 18px; font-weight: bold; padding: 15px; background: #f9f9f9; border-radius: 5px; margin: 20px 0;">
            Amount: $${amount.toFixed(2)}
          </p>
          <p style="font-size: 13px; color: #666;">For your security, funds are held in escrow and released according to our platform policies.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} tableli. All rights reserved.</p>
        </div>
      `,
    };

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Failed to send payment confirmation email:", error);
      throw new Error("Failed to send payment confirmation email");
    }
  }
  async sendBookingStatusUpdateEmail(email, userName, status, actionByRole) {
    const subject = `Booking Status Update - ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    const message = `Your booking has been ${status} by the ${actionByRole}.`;
    let statusClass = "status-box";
    if (status === "cancelled" || status === "rejected") {
      statusClass += " status-cancelled";
    } else if (status === "confirmed" || status === "completed" || status === "accepted") {
      statusClass += " status-confirmed";
    }

    const senderEmail = process.env.EMAIL_FROM || process.env.OTP_EMAIL || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"tableli" <${senderEmail}>`,
      to: email,
      subject: subject,
      headers: { "X-Mailer": "tableli Mailer" },
      text: `Hello ${userName}!\n\n${message}\n\nStatus: ${status}\n\nPlease log in to your account to view more details.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">📋 Booking Update</h2>
          <p>Hello ${userName},</p>
          <p>${message}</p>
          <p style="font-size: 18px; font-weight: bold; padding: 15px; background: #f9f9f9; border-radius: 5px; margin: 20px 0; text-transform: capitalize;">
            Status: ${status}
          </p>
          <p style="font-size: 13px; color: #666;">Please log in to your account to view more details.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} tableli. All rights reserved.</p>
        </div>
      `,
    };

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Failed to send booking status update email:", error);
      throw new Error("Failed to send booking status update email");
    }
  }

  async sendNewBookingRequestEmail(chefEmail, chefName, clientName, eventDate, guests, eventLocation) {
    const subject = "🎉 New Booking Request!";
    
    const senderEmail = process.env.EMAIL_FROM || process.env.OTP_EMAIL || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"tableli" <${senderEmail}>`,
      to: chefEmail,
      subject: subject,
      headers: { "X-Mailer": "tableli Mailer" },
      text: `Hello ${chefName}!\n\nGreat news! You have received a new booking request from ${clientName}.\n\nDate: ${new Date(eventDate).toDateString()}\nGuests: ${guests}\nLocation: ${eventLocation}\n\nPlease log in to your dashboard to review and accept or reject this request.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">🎉 New Booking Request</h2>
          <p>Hello ${chefName},</p>
          <p>Great news! You have received a new booking request from <strong>${clientName}</strong>.</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Date:</strong> ${new Date(eventDate).toDateString()}</p>
            <p><strong>Guests:</strong> ${guests}</p>
            <p><strong>Location:</strong> ${eventLocation}</p>
          </div>
          <p style="font-size: 13px; color: #666;">Please log in to your dashboard to review and accept or reject this request.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} tableli. All rights reserved.</p>
        </div>
      `,
    };

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Failed to send new booking request email:", error);
      throw new Error("Failed to send new booking request email");
    }
  }

  async sendProfileStatusEmail(chefEmail, chefName, status, rejectionReason = "") {
    const isApproved = status === "approved";
    const subject = isApproved ? "🎉 Profile Approved!" : "⚠️ Profile Rejected";
    const message = isApproved
      ? "Congratulations! Your chef profile has been approved by the administrator. You can now start receiving bookings."
      : `Your chef profile was rejected by the administrator. Reason: ${rejectionReason}. Please update your profile and try again.`;

    const senderEmail = process.env.EMAIL_FROM || process.env.OTP_EMAIL || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"tableli" <${senderEmail}>`,
      to: chefEmail,
      subject: subject,
      headers: { "X-Mailer": "tableli Mailer" },
      text: `Hello ${chefName}!\n\n${message}\n\nPlease log in to your dashboard to view more details.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">${isApproved ? '✅ Profile Approved' : '❌ Profile Rejected'}</h2>
          <p>Hello ${chefName},</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;">${message}</p>
          </div>
          <p style="font-size: 13px; color: #666;">Please log in to your dashboard to view more details.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} tableli. All rights reserved.</p>
        </div>
      `,
    };

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Failed to send profile status email:", error);
      throw new Error("Failed to send profile status email");
    }
  }

  async sendNewChefProfileNotificationEmail(adminEmail, chefName) {
    const subject = "👨‍🍳 New Chef Profile Submitted for Approval";
    const senderEmail = process.env.EMAIL_FROM || process.env.OTP_EMAIL || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"tableli" <${senderEmail}>`,
      to: adminEmail,
      subject: subject,
      headers: { "X-Mailer": "tableli Mailer" },
      text: `Hello Admin!\n\nChef ${chefName} has submitted their profile for account verification.\n\nPlease log in to the admin dashboard to review and approve or reject the profile.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">👨‍🍳 New Chef Profile</h2>
          <p>Hello Admin,</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;">Chef <strong>${chefName}</strong> has submitted their profile for account verification.</p>
          </div>
          <p style="font-size: 13px; color: #666;">Please log in to the admin dashboard to review and approve or reject the profile.</p>
          <div style="margin-top: 20px;">
            <a href="https://tableli.com/admin" style="background-color: #007aff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">&copy; ${new Date().getFullYear()} tableli. All rights reserved.</p>
        </div>
      `,
    };

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Failed to send new chef profile notification email:", error);
      throw new Error("Failed to send new chef profile notification email");
    }
  }
}

export default new SendOtp();
