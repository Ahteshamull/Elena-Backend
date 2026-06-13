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
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <title>Password Reset – tableli</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f0f4ff;font-family:Arial,Helvetica,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td align="center" style="padding:40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"
                  style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">

                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#e53e3e 0%,#c53030 100%);padding:36px 40px;text-align:center;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center">
                            <div style="background:rgba(255,255,255,0.15);display:inline-block;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;margin-bottom:12px;">
                              🔑
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td align="center">
                            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                              Password Reset
                            </h1>
                            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                              tableli Security
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:40px 40px 20px;">
                      <h2 style="margin:0 0 10px;color:#1a202c;font-size:18px;">
                        Hello, ${userName}!
                      </h2>
                      <p style="margin:0 0 24px;color:#4a5568;font-size:15px;line-height:1.7;">
                        We received a request to reset the password for your tableli account.
                        Use the code below to continue. This code is valid for <strong>10 minutes</strong>.
                      </p>

                      <!-- OTP Box -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center" style="padding:24px 0;">
                            <div style="display:inline-block;background:#fff5f5;border:2px solid #fc8181;
                              color:#c53030;font-size:38px;font-weight:900;letter-spacing:18px;
                              padding:20px 36px;border-radius:12px;text-align:center;
                              font-family:'Courier New',monospace;">
                              ${otp}
                            </div>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 8px;color:#718096;font-size:13px;text-align:center;">
                        ⏱ Expires in <strong style="color:#e53e3e;">10 minutes</strong>
                      </p>
                    </td>
                  </tr>

                  <!-- Warning Notice -->
                  <tr>
                    <td style="padding:0 40px 30px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="background:#fff8f8;border-left:4px solid #fc8181;border-radius:4px;padding:14px 18px;">
                            <p style="margin:0;color:#4a5568;font-size:13px;line-height:1.6;">
                              ⚠️ <strong>Didn't request this?</strong> You can safely ignore this email.
                              Your password will <strong>not</strong> be changed unless you use this code.
                              Never share this code with anyone.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Divider -->
                  <tr>
                    <td style="padding:0 40px;">
                      <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" />
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#f7fafc;padding:20px 40px;text-align:center;border-radius:0 0 12px 12px;">
                      <p style="margin:0;color:#a0aec0;font-size:12px;line-height:1.7;">
                        © ${new Date().getFullYear()} tableli. All rights reserved.<br />
                        This is an automated message — please do not reply to this email.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
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

© ${new Date().getFullYear()} tableli. All rights reserved.
      `.trim(),
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <title>Verify Your tableli Account</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td align="center" style="padding:40px 20px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"
                  style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:36px 40px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                        tableli
                      </h1>
                      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                        Email Verification
                      </p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:40px 40px 20px;">
                      <h2 style="margin:0 0 12px;color:#1a1a2e;font-size:20px;">
                        👋 Welcome, ${userName}!
                      </h2>
                      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
                        Thank you for signing up. Use the verification code below to activate your account.
                      </p>
                      <!-- OTP Box -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center" style="padding:28px 0;">
                            <div style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:36px;
                              font-weight:800;letter-spacing:16px;padding:18px 32px;border-radius:10px;
                              text-align:center;font-family:'Courier New',monospace;">
                              ${otp}
                            </div>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0 0 8px;color:#555;font-size:14px;text-align:center;">
                        ⏱ This code expires in <strong>10 minutes</strong>.
                      </p>
                    </td>
                  </tr>
                  <!-- Notice -->
                  <tr>
                    <td style="padding:0 40px 30px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="background:#f8f7ff;border-left:4px solid #4f46e5;border-radius:4px;padding:14px 18px;">
                            <p style="margin:0;color:#555;font-size:13px;line-height:1.5;">
                              🔒 If you did not create a tableli account, you can safely ignore this email.
                              Do not share this code with anyone.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background:#f4f6f8;padding:20px 40px;text-align:center;">
                      <p style="margin:0;color:#999;font-size:12px;line-height:1.6;">
                        © ${new Date().getFullYear()} tableli. All rights reserved.<br />
                        This is an automated message — please do not reply directly to this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
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
    const mailOptions = {
      from:
        process.env.EMAIL_FROM ||
        process.env.OTP_EMAIL ||
        process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Successful - tableli",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Successful</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: white;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #00b894 0%, #00a085 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 300;
            }
            .content {
              padding: 40px 30px;
            }
            .success-box {
              background: #d4edda;
              border: 1px solid #c3e6cb;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
              color: #155724;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px 30px;
              text-align: center;
              color: #6c757d;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Password Reset Successful</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>Your password has been successfully reset for your account.</p>
 
              <div class="success-box">
                <h3>🎉 All Done!</h3>
                <p>You can now log in with your new password.</p>
              </div>
 
              <p>If you didn't make this change, please contact our support team immediately.</p>
 
              <p>For your security, we recommend:</p>
              <ul>
                <li>Using a strong, unique password</li>
                <li>Enabling two-factor authentication if available</li>
                <li>Logging out of all devices and logging back in</li>
              </ul>
            </div>
            <div class="footer">
              <p>This is an automated email from Dalil Arehan</p>
              <p>© ${new Date().getFullYear()} Dalil Arehan. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
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

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.OTP_EMAIL || process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #00b894 0%, #00a085 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .success-box { background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; color: #155724; font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isClient ? "✅ Payment Confirmed" : "🎉 New Booking Paid"}</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName}!</h2>
              <p>${message}</p>
              <div class="success-box">
                Amount: $${amount.toFixed(2)}
              </div>
              <p>For your security, funds are held in escrow and released according to our platform policies.</p>
            </div>
          </div>
        </body>
        </html>
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
}

export default new SendOtp();
