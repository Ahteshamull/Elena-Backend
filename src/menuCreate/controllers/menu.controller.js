import mongoose from "mongoose";
import Profile from "../schema/menu.modal.js";
import userModel from "../../auth/schema/auth.modal.js";
import { createNotification } from "../../notification/service/notification.service.js";

// Helper to safely parse array fields sent as JSON or comma-separated strings
const parseArray = (field) => {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  try {
    const parsed = JSON.parse(field);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    // Fallback if sent as comma-separated or plain string
    return field
      .toString()
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
};

// Helper to safely parse array of dates
const parseDates = (field) => {
  const arr = parseArray(field);
  return arr.map((d) => new Date(d)).filter((d) => !isNaN(d.getTime()));
};

export const upsertProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Authentication required",
      });
    }

    let bodyData = req.body || {};

    // Support sending data as a JSON string in a 'data' field (common for form-data)
    if (req.body && req.body.data) {
      try {
        bodyData = JSON.parse(req.body.data);
      } catch (error) {
        return res.status(400).json({
          error: true,
          message: "Invalid JSON format in 'data' field",
        });
      }
    }

    let menuBuilder = [];
    if (bodyData.menuBuilder) {
      try {
        menuBuilder =
          typeof bodyData.menuBuilder === "string"
            ? JSON.parse(bodyData.menuBuilder)
            : bodyData.menuBuilder;
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: true,
          message:
            "Invalid format for menuBuilder. Must be a valid JSON array.",
        });
      }
    }

    const updateData = {
      userId: userId,
      status: "pending",
      rejectionReason: undefined,
      fullName: bodyData.fullName,
      displayName: bodyData.displayName,
      email: bodyData.email,
      phone: bodyData.phone,
      city: bodyData.city,
      country: bodyData.country,
      languages: parseArray(bodyData.languages),
      yearsOfExperience: bodyData.yearsOfExperience,
      currentPosition: bodyData.currentPosition,
      cuisineSpecialties: parseArray(bodyData.cuisineSpecialties),
      chefCategory: parseArray(bodyData.chefCategory),
      aboutMe: bodyData.aboutMe,
      startingPricePerPerson: bodyData.startingPricePerPerson
        ? Number(bodyData.startingPricePerPerson)
        : undefined,
      sampleMenuTitle: bodyData.sampleMenuTitle,
      minimumBookingAmount: bodyData.minimumBookingAmount
        ? Number(bodyData.minimumBookingAmount)
        : undefined,
      menuDescription: bodyData.menuDescription,
      menuBuilder,
      instagramProfile: bodyData.instagramProfile,
      portfolioWebsite: bodyData.portfolioWebsite,
      isProfileCompleted:
        bodyData.isProfileCompleted === "true" ||
        bodyData.isProfileCompleted === true,

      // Service Availability
      instantBooking:
        bodyData.instantBooking === "true" || bodyData.instantBooking === true,
      availableDates: parseDates(bodyData.availableDates),
      serviceWindows: parseArray(bodyData.serviceWindows),
      travelRadius: bodyData.travelRadius
        ? Number(bodyData.travelRadius)
        : undefined,
      travelRadiusLocation: bodyData.travelRadiusLocation,

      // Platform Terms & Escrow
      agreedToTerms:
        bodyData.agreedToTerms === "true" || bodyData.agreedToTerms === true,
      fullLegalName: bodyData.fullLegalName,
      digitalSignature: bodyData.digitalSignature,
    };

    // Handle file uploads if present
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        updateData.image = `/uploads/${req.files.image[0].filename}`;
      }
      if (req.files.cv && req.files.cv[0]) {
        updateData.cv = `/uploads/${req.files.cv[0].filename}`;
      }
      if (req.files.governmentId && req.files.governmentId[0]) {
        updateData.governmentId = `/uploads/${req.files.governmentId[0].filename}`;
      }
      if (
        req.files.foodSafetyCertificate &&
        req.files.foodSafetyCertificate[0]
      ) {
        updateData.foodSafetyCertificate = `/uploads/${req.files.foodSafetyCertificate[0].filename}`;
      }

      // Handle visual portfolio photo arrays
      if (req.files.dishPhotography) {
        const newPhotos = req.files.dishPhotography.map(
          (f) => `/uploads/${f.filename}`,
        );
        const existing = parseArray(
          bodyData.existingDishPhotography ||
            bodyData.dishPhotography ||
            req.body.existingDishPhotography ||
            req.body.dishPhotography,
        );
        updateData.dishPhotography = [...existing, ...newPhotos];
      } else if (bodyData.dishPhotography !== undefined) {
        updateData.dishPhotography = parseArray(bodyData.dishPhotography);
      } else if (req.body.dishPhotography !== undefined) {
        updateData.dishPhotography = parseArray(req.body.dishPhotography);
      }

      if (req.files.eventHighlights) {
        const newHighlights = req.files.eventHighlights.map(
          (f) => `/uploads/${f.filename}`,
        );
        const existing = parseArray(
          bodyData.existingEventHighlights ||
            bodyData.eventHighlights ||
            req.body.existingEventHighlights ||
            req.body.eventHighlights,
        );
        updateData.eventHighlights = [...existing, ...newHighlights];
      } else if (bodyData.eventHighlights !== undefined) {
        updateData.eventHighlights = parseArray(bodyData.eventHighlights);
      } else if (req.body.eventHighlights !== undefined) {
        updateData.eventHighlights = parseArray(req.body.eventHighlights);
      }
    } else {
      // If no files are uploaded, check for text-only updates to the arrays
      if (bodyData.dishPhotography !== undefined) {
        updateData.dishPhotography = parseArray(bodyData.dishPhotography);
      } else if (req.body.dishPhotography !== undefined) {
        updateData.dishPhotography = parseArray(req.body.dishPhotography);
      }
      if (bodyData.eventHighlights !== undefined) {
        updateData.eventHighlights = parseArray(bodyData.eventHighlights);
      } else if (req.body.eventHighlights !== undefined) {
        updateData.eventHighlights = parseArray(req.body.eventHighlights);
      }
    }

    const profile = await Profile.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true },
    );

    // Sync with User's isApprovedByAdmin status (needs re-approval on save/update)
    const user = await userModel.findById(userId);
    if (user) {
      user.isApprovedByAdmin = false;
      await user.save();
    }

    // Send notification to admin
    try {
      await createNotification(
        "profile_created",
        "New Chef Profile Submitted",
        `Chef "${profile.fullName || profile.displayName || "A Chef"}" has submitted their profile for approval.`,
        null,
        userId,
        "admin"
      );
    } catch (notifError) {
      console.error("Failed to create admin notification:", notifError);
    }

    return res.status(200).json({
      success: true,
      message:
        "Profile saved successfully,when admin will approve your profile you can see your informations",
      data: profile,
    });
  } catch (error) {
    console.error("Error saving profile:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || "Failed to save profile",
    });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Authentication required",
      });
    }

    const profile = await Profile.findOne({ userId }).populate(
      "userId",
      "userName email phone role image",
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Profile not found. Please set up your profile.",
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Error getting profile:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to retrieve profile",
    });
  }
};

export const getProfileByUserId = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "User ID parameter is required",
      });
    }

    const profile = await Profile.findOne({ userId: id }).populate(
      "userId",
      "userName email phone role image",
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Error getting profile by user ID:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to retrieve profile",
    });
  }
};

export const updateProfileStatus = async (req, res) => {
  try {
    const { id } = req.params; // userId or profileId
    const { status, rejectionReason } = req.body;

    if (!status || !["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: true,
        message:
          "Invalid status. Must be 'pending', 'approved', or 'rejected'.",
      });
    }

    // Build the query options dynamically
    const queryConditions = [];
    if (mongoose.isValidObjectId(id)) {
      queryConditions.push({ _id: id });
      queryConditions.push({ userId: id });
    }

    if (queryConditions.length === 0) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid ID format.",
      });
    }

    const profile = await Profile.findOne({ $or: queryConditions });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Profile not found",
      });
    }

    profile.status = status;
    if (status === "rejected") {
      profile.rejectionReason =
        rejectionReason || "Profile did not meet criteria";
    } else {
      profile.rejectionReason = undefined;
    }

    await profile.save();

    // Sync with User's isApprovedByAdmin status
    const user = await userModel.findById(profile.userId);
    if (user) {
      user.isApprovedByAdmin = status === "approved";
      await user.save();
    }

    // Send notification to the chef
    try {
      const adminId = req.user?.id || req.user?._id;
      const title = status === "approved" ? "Profile Approved" : "Profile Rejected";
      const message = status === "approved"
        ? "Congratulations! Your chef profile has been approved by the administrator."
        : `Your chef profile was rejected. Reason: ${profile.rejectionReason}`;

      await createNotification(
        `profile_${status}`,
        title,
        message,
        null, // listingId
        adminId, // createdBy (the admin)
        "chef", // receiverRole
        profile.userId // receiverId (the chef)
      );
    } catch (notifError) {
      console.error("Failed to create chef notification:", notifError);
    }

    return res.status(200).json({
      success: true,
      message: `Profile status updated to ${status} successfully`,
      data: profile,
    });
  } catch (error) {
    console.error("Error updating profile status:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to update profile status",
    });
  }
};
