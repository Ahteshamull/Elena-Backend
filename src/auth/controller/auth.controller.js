import EmailValidateCheck from "../../helper/helpers/emailValidate.js";
import userModel from "../schema/auth.modal.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import otpService from "../../helper/helpers/otpService.js";
import PasswordReset from "../schema/passwordReset.modal.js";
import sendOtp from "../../helper/helpers/sendOtp.js";
import { notifyAdminOnUserCreated } from "../../notification/service/notification.service.js";
import fs from "fs";
import path from "path";
import Payment from "../../payment/schema/payment.modal.js";
import Notification from "../../notification/schema/notification.modal.js";
import Profile from "../../profileSetup/schema/profile.modal.js";

export const createUser = async (req, res) => {
  let bodyData = req.body || {};

  // Support sending data as a JSON string in a 'data' field (common for form-data)
  if (req.body && req.body.data) {
    try {
      bodyData = JSON.parse(req.body.data);
    } catch (error) {
      return res.status(400).send({
        error: true,
        message: "Invalid JSON format in 'data' field",
      });
    }
  }

  const { userName, email, password, confirmPassword, phone, gender, role } =
    bodyData;

  // Basic required fields
  if (!userName || !email || !password || !confirmPassword) {
    return res.status(400).send({
      error: true,
      message: "Required fields are missing",
    });
  }

  // Email validation
  if (!EmailValidateCheck(email)) {
    return res.status(400).send({
      error: true,
      message: "Invalid Email",
    });
  }

  // Password match check
  if (password !== confirmPassword) {
    return res.status(400).send({
      error: true,
      message: "Passwords Do Not Match",
    });
  }

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already exists
  const existingUser = await userModel.findOne({ email: normalizedEmail });
  if (existingUser) {
    // If user exists but is not verified, delete and re-register
    if (!existingUser.isVerify) {
      await userModel.findByIdAndDelete(existingUser._id);
    } else {
      return res.status(409).send({
        error: true,
        message: "Email Already In Use",
      });
    }
  }

  const normalizedUserName = userName.trim().toLowerCase();

  // Check if userName already exists
  const existingUserName = await userModel.findOne({
    userName: normalizedUserName,
    isVerify: true,
  });
  if (existingUserName) {
    return res.status(409).send({
      error: true,
      message: "This UserName is already taken. Please choose another one.",
    });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Only chef needs admin approval. User is approved by default.
    const isApprovedByAdmin = role === "chef" ? false : true;

    const user = new userModel({
      userName: normalizedUserName,
      email: normalizedEmail,
      password: hash,
      confirmPassword: hash,
      phone,
      gender,
      role: role || "user",
      isApprovedByAdmin,
      isVerify: false,
      registrationOtp: hashedOtp,
      otpExpiry,
    });

    await user.save();

    // Send OTP to user's email
    await sendOtp.sendRegistrationOTP(normalizedEmail, otp, normalizedUserName);

    // Notify admin immediately on user creation
    await notifyAdminOnUserCreated(user._id, user.userName, user.email);

    return res.status(200).send({
      success: true,
      message:
        "A 6-digit verification code has been sent to your email. Please verify to activate your account.",
      data: { email: normalizedEmail },
    });
  } catch (error) {
    return res.status(500).send({
      error: true,
      message: error?.message || "Internal server error",
    });
  }
};

export const verifyRegistration = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      error: true,
      message: "Email and OTP are required",
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await userModel.findOne({ email: normalizedEmail });

  if (!user) {
    return res.status(404).json({
      error: true,
      message: "User not found. Please register first.",
    });
  }

  if (user.isVerify) {
    return res.status(400).json({
      error: true,
      message: "This account is already verified. Please login.",
    });
  }

  // Check OTP expiry
  if (!user.otpExpiry || new Date() > user.otpExpiry) {
    return res.status(400).json({
      error: true,
      message: "OTP has expired. Please register again.",
    });
  }

  // Verify OTP
  const isOtpValid = await bcrypt.compare(otp.toString(), user.registrationOtp);

  if (!isOtpValid) {
    return res.status(400).json({
      error: true,
      message: "Invalid OTP. Please try again.",
    });
  }

  // Activate account
  user.isVerify = true;
  user.registrationOtp = undefined;
  user.otpExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  // Avoid a redundant DB query by converting the document to a plain object and cleaning up sensitive fields
  const userData = user.toObject();
  delete userData.password;
  delete userData.confirmPassword;
  delete userData.registrationOtp;
  delete userData.otpExpiry;

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  const message =
    user.role === "chef"
      ? "Account verified and created successfully! You need to setup your profile. Once the admin approves your account, you will be able to log in."
      : "Account verified and created successfully! You can now log in.";

  return res
    .status(201)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json({
      success: true,
      message,
      data: userData,
      accessToken,
      refreshToken,
    });
};

export const getMyProfile = async (req, res) => {
  // User ID should be available in req.user from auth middleware
  const userId = req.user?.id || req.user?._id;

  if (!userId) {
    return res.status(401).json({
      error: true,
      message: "User not authenticated",
    });
  }

  try {
    const user = await userModel
      .findById(userId)
      .select("-password -confirmPassword -refreshToken");
    if (!user) {
      return res.status(404).json({
        error: true,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal server error",
    });
  }
};

export const login = async (req, res) => {
  try {
    let { email, userName, password } = req.body || {};

    // Basic validation
    if ((!email && !userName) || !password) {
      return res.status(400).json({
        error: true,
        message: "Email or Username and password are required",
      });
    }

    // Normalize inputs
    if (email) email = email.trim().toLowerCase();
    if (userName) userName = userName.trim().toLowerCase();

    // 🔑 Find user by email OR username (SAFE QUERY)
    const existingUser = await userModel.findOne({
      $or: [email ? { email } : null, userName ? { userName } : null].filter(
        Boolean,
      ),
    });

    if (!existingUser) {
      return res.status(404).json({
        error: true,
        message: "You don't have any account with these credentials",
      });
    }

    // Block unverified accounts
    if (!existingUser.isVerify) {
      return res.status(403).json({
        error: true,
        message:
          "Please verify your email before logging in. Check your inbox for the verification code.",
      });
    }

    // Block unapproved accounts
    if (existingUser.role === "chef" && !existingUser.isApprovedByAdmin) {
      const profile = await Profile.findOne({ userId: existingUser._id });
      if (profile && profile.isProfileCompleted) {
        return res.status(403).json({
          error: true,
          message:
            "Your account is pending admin approval. You cannot log in yet.",
        });
      }
    }

    // Password check
    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password,
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        error: true,
        message: "Invalid credentials email or password",
      });
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken } =
      await generateAccessAndRefreshToken(existingUser);

    // Prepare complete user info (excluding sensitive data)
    const loginUserInfo = {
      id: existingUser._id,
      email: existingUser.email,
      userName: existingUser.userName,
      role: existingUser.role || "user",
      isVerify: existingUser.isVerify,
      image: existingUser.image,
      phone: existingUser.phone,
    };

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json({
        success: true,
        message: `${existingUser.userName} logged in successfully`,
        data: loginUserInfo,
        accessToken,
        refreshToken,
      });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: true,
      message: error?.message || "Internal server error during login",
    });
  }
};

export const logout = async (req, res) => {
  // Clear all cookies
  res.clearCookie("token");
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  // Optional: Clear refresh token from database
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (refreshToken) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET || process.env.PRV_TOKEN,
      );
      await userModel.findByIdAndUpdate(decoded._id, {
        $unset: { refreshToken: 1 },
      });
    } catch (error) {
      // Token might be invalid, but still logout
    }
  }

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  const user = await userModel.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  await PasswordReset.cleanExpiredOTPs();

  let reset = await PasswordReset.findOne({ email });

  if (reset) {
    const resendCheck = otpService.canResend(reset);
    if (!resendCheck.allowed)
      return res.status(429).json({ message: resendCheck.message });

    reset.resendCount++;
    reset.lastResendAt = new Date();
  } else {
    reset = new PasswordReset({ email });
  }

  const otp = otpService.generateOTP();

  reset.hashedOTP = otpService.hashOTP(otp);
  reset.otpCreatedAt = new Date();
  reset.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  reset.attempts = 0;
  reset.verified = false;

  await reset.save();

  await sendOtp.sendOTPEmail(email, otp, user.name);

  res.json({ success: true, message: "OTP sent to email" });
};

export const verifyOtp = async (req, res) => {
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ message: "OTP is required" });

  const resets = await PasswordReset.find({
    otpExpiresAt: { $gt: new Date() },
    verified: false,
  });

  let matchedReset = null;

  for (const reset of resets) {
    const attemptCheck = otpService.canAttempt(reset);
    if (!attemptCheck.allowed) continue;

    const valid = await otpService.verifyOTP(otp, reset.hashedOTP);
    if (valid) {
      matchedReset = reset;
      break;
    }
  }

  if (!matchedReset) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  matchedReset.verified = true;
  matchedReset.lastAttemptAt = new Date();
  await matchedReset.save();

  // ✅ Generate reset token
  const resetToken = jwt.sign(
    {
      userId: matchedReset.email,
      purpose: "password-reset",
    },
    process.env.RESET_TOKEN_SECRET || "secret123",
    { expiresIn: "10m" },
  );

  return res.json({
    success: true,
    message: "OTP verified",
    resetToken,
  });
};

export const resetPassword = async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  const authHeader = req.headers.authorization;

  // 1️⃣ Token check
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: true, message: "Reset token required" });
  }

  const resetToken = authHeader.split(" ")[1];

  // 2️⃣ Password validation
  if (!newPassword || !confirmPassword) {
    return res
      .status(400)
      .json({ error: true, message: "Password fields are required" });
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .json({ error: true, message: "Passwords do not match" });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: true, message: "Password must be at least 6 characters" });
  }

  // 3️⃣ Verify reset token
  let decoded;
  try {
    decoded = jwt.verify(
      resetToken,
      process.env.RESET_TOKEN_SECRET || "secret123",
    );
  } catch (err) {
    return res
      .status(401)
      .json({ error: true, message: "Invalid or expired token" });
  }

  if (decoded.purpose !== "password-reset") {
    return res
      .status(401)
      .json({ error: true, message: "Invalid token purpose" });
  }

  // 4️⃣ ✅ IMPORTANT FIX: find user by EMAIL (not _id)
  const user = await userModel.findOne({ email: decoded.userId });
  if (!user) {
    return res.status(404).json({ error: true, message: "User not found" });
  }

  // 5️⃣ Update password
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  // 6️⃣ Confirmation email (non-blocking)
  try {
    await sendOtp.sendPasswordResetConfirmation(
      user.email,
      user.name || "User",
    );
  } catch (emailError) {
    console.error("Password reset email failed:", emailError);
  }

  return res.status(200).json({
    success: true,
    message: "Password reset successful. Please login with your new password.",
  });
};

export const ResendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: true, message: "Email is required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await userModel.findOne({ email: normalizedEmail });
  if (!existingUser) {
    return res.status(404).json({ error: true, message: "User not found" });
  }

  // If already verified, no need to resend
  if (existingUser.isVerify) {
    return res.status(400).json({
      error: true,
      message: "This account is already verified. Please login.",
    });
  }

  try {
    // Generate a fresh 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update registration OTP directly on the user document
    existingUser.registrationOtp = hashedOtp;
    existingUser.otpExpiry = otpExpiry;
    await existingUser.save({ validateBeforeSave: false });

    // Send registration verification email
    await sendOtp.sendRegistrationOTP(
      normalizedEmail,
      otp,
      existingUser.userName || "User",
    );

    return res.status(200).json({
      success: true,
      message: "A new verification code has been sent to your email.",
    });
  } catch (error) {
    console.error("Failed to resend OTP:", error);
    return res.status(500).json({
      error: true,
      message: "Failed to send OTP. Please try again.",
    });
  }
};

async function generateAccessAndRefreshToken(user) {
  const accessToken = jwt.sign(
    {
      _id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET || process.env.PRV_TOKEN,
    { expiresIn: "1d" },
  );

  const refreshToken = jwt.sign(
    {
      _id: user._id,
      role: user.role,
    },
    process.env.REFRESH_TOKEN_SECRET || process.env.PRV_TOKEN,
    { expiresIn: "7d" },
  );

  // Save refresh token to user
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
}

export const refreshAccessToken = async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    return res
      .status(401)
      .json({ error: true, message: "Unauthorized request" });
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET || process.env.PRV_TOKEN,
    );

    const user = await userModel.findById(decodedToken?._id);

    if (!user) {
      return res
        .status(401)
        .json({ error: true, message: "Invalid refresh token" });
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      return res
        .status(401)
        .json({ error: true, message: "Refresh token is expired or used" });
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json({
        success: true,
        message: "Access token refreshed",
        data: { accessToken, refreshToken: newRefreshToken },
      });
  } catch (error) {
    return res.status(401).json({
      error: true,
      message: error?.message || "Invalid refresh token",
    });
  }
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: true, message: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || process.env.PRV_TOKEN,
    );
  } catch (err) {
    return res.status(401).json({ error: true, message: "Invalid token" });
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(400)
      .json({ error: true, message: "Passwords do not match" });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: true, message: "Password must be at least 6 characters" });
  }

  const user = await userModel.findById(decoded._id);
  if (!user) {
    return res.status(404).json({ error: true, message: "User not found" });
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(
    currentPassword,
    user.password,
  );
  if (!isCurrentPasswordValid) {
    return res
      .status(400)
      .json({ error: true, message: "Current password is incorrect" });
  }

  // Clean up invalid redeemStars entries before saving
  if (user.redeemStars && Array.isArray(user.redeemStars)) {
    user.redeemStars = user.redeemStars.filter(
      (item) => item && item.collaborationId && typeof item.stars === "number",
    );
  }

  // Update password
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
};

export const currentUserLogin = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: true, message: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || process.env.PRV_TOKEN,
    );

    const user = await userModel
      .findById(decoded._id)
      .select(
        "-password -confirmPassword -refreshToken -registrationOtp -otpExpiry",
      );

    if (!user) {
      return res.status(404).json({ error: true, message: "User not found" });
    }

    // Convert to object and ensure 'id' is included in a convenient format
    const userData = user.toObject();
    userData.id = user._id;
    userData.role = user.role || "user";

    return res.status(200).json({
      success: true,
      data: userData,
    });
  } catch (error) {
    return res.status(401).json({ error: true, message: "Invalid token" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    // Get user ID from token
    const userId = req.user?._id || req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    // Find the user
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete user's profile image if exists
    if (user.image && user.image !== "") {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const imagePath = path.join(process.cwd(), "uploads", user.image);

        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (imageError) {
        console.log("Error deleting profile image:", imageError);
        // Continue with user deletion even if image deletion fails
      }
    }

    const Notification = (
      await import("../../notification/schema/notification.modal.js")
    ).default;
    await Notification.deleteMany({
      $or: [{ receiverId: userId }, { senderId: userId }],
    });

    try {
      const Message = (await import("../../message/schema/message.modal.js"))
        .default;
      await Message.deleteMany({
        $or: [{ senderId: userId }, { receiverId: userId }],
      });
    } catch (messageError) {
      console.log("Error deleting messages:", messageError);
    }

    try {
      const Review = (await import("../../review/schema/review.modal.js"))
        .default;
      if (Review) {
        await Review.deleteMany({ userId: userId });
      }
    } catch (reviewError) {
      console.log(
        "Review module not found or error deleting reviews:",
        reviewError.message,
      );
      // Continue even if review deletion fails
    }

    // Remove user from other users' connections/followers if applicable
    await userModel.updateMany(
      {
        $or: [
          { connections: userId },
          { followers: userId },
          { following: userId },
        ],
      },
      {
        $pull: {
          connections: userId,
          followers: userId,
          following: userId,
        },
      },
    );

    // Delete the user
    await userModel.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "Account and all associated data deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error deleting account",
    });
  }
};

export const deleteMyAccount = async (req, res) => {
  try {
    // Get user ID from token
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if user exists
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete user's related data
    await Promise.all([
      // Delete user's listings
      Listing.deleteMany({ userId }),

      // Delete user's deals
      Deal.deleteMany({ userId }),

      // Delete user's payments
      Payment.deleteMany({
        $or: [{ userId }, { selectInfluencerOrHost: userId }],
      }),

      // Delete user's notifications
      Notification.deleteMany({
        $or: [{ receiverId: userId }, { senderId: userId }],
      }),

      // Delete user's messages
      Message.deleteMany({
        $or: [{ senderId: userId }, { receiverId: userId }],
      }),
    ]);

    // Delete the user account
    await userModel.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "Account and all related data deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting account",
      error: error.message,
    });
  }
};
