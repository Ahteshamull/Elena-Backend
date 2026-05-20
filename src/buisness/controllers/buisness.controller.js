import businessModel from "../schema/buisness.modal.js";
import userModel from "../../auth/schema/auth.modal.js";
import fs from "fs";
import path from "path";

export const createBusiness = async (req, res) => {
  try {
    const { shopOrBusinessName, description, category, location, latitude, longitude, avgRating, totalReviews } = req.body;
    const userId = req.user?.id || req.user?._id;

    // Parse numeric fields from multipart/form-data
    const parsedAvgRating = parseFloat(avgRating) || 0;
    const parsedTotalReviews = parseInt(totalReviews) || 0;

    let image = "";
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    }

    if (!userId) {
      return res
        .status(401)
        .json({ error: true, message: "Authentication required" });
    }
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: true, message: "User not found" });
    }

    // Check if user already has a business
    const existingBusiness = await businessModel.findOne({ userId });
    if (existingBusiness) {
      return res.status(400).json({
        success: false,
        message: "You have already created a business. Only one business is allowed per provider.",
      });
    }

    const business = await businessModel.create({
      shopOrBusinessName,
      description,
      category,
      location,
      latitude,
      longitude,
      avgRating: parsedAvgRating,
      totalReviews: parsedTotalReviews,
      image,
      userId,
    });

    // Update user's isBusinessCreated status
    await userModel.findByIdAndUpdate(userId, { isBusinessCreated: true });

    return res
      .status(201)
      .json({
        success: true,
        message: "Business created successfully",
        data: business,
      });
  } catch (error) {
    return res
      .status(500)
      .json({
        error: true,
        message: error?.message || "Internal server error",
      });
  }
};
export const getAllBusinesses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalBusinesses = await businessModel.countDocuments();
    const businesses = await businessModel
      .find()
      .populate("userId", "userName email image")
      .populate("services")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalPages = Math.ceil(totalBusinesses / limit);

    return res.status(200).json({
      success: true,
      message: "Businesses fetched successfully",
      meta: {
        currentPage: page,
        totalPages,
        totalBusinesses,
        limit,
      },
      data: businesses,
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error?.message || "Internal server error",
    });
  }
};
export const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;
    const business = await businessModel
      .findById(id)
      .populate("userId", "userName email image")
      .populate("services");
    if (!business) {
      return res.status(404).json({ error: true, message: "Business not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Business fetched successfully",
      data: business,
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error?.message || "Internal server error",
    });
  }
};
export const updateBusinessById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    const business = await businessModel.findById(id);
    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    // Ownership check: Only the provider who created the business can update it
    if (business.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only update your own business",
      });
    }

    const updateData = { ...req.body };

    // Parse numeric fields if they are present in the update
    if (updateData.avgRating !== undefined) {
      updateData.avgRating = parseFloat(updateData.avgRating) || 0;
    }
    if (updateData.totalReviews !== undefined) {
      updateData.totalReviews = parseInt(updateData.totalReviews) || 0;
    }

    // Handle image update and cleanup of the old file
    if (req.file) {
      if (business.image) {
        const oldImagePath = business.image.startsWith("/")
          ? business.image.substring(1)
          : business.image;
        const fullPath = path.join(process.cwd(), oldImagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const updatedBusiness = await businessModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      success: true,
      message: "Business updated successfully",
      data: updatedBusiness,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update business",
      error: error.message,
    });
  }
};
export const getMyBusiness = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const business = await businessModel
      .findOne({ userId })
      .populate("userId", "userName email image")
      .populate("services");
    if (!business) {
      return res.status(404).json({ error: true, message: "Business not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Business fetched successfully",
      data: business,
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error?.message || "Internal server error",
    });
  }
};
export const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    const business = await businessModel.findById(id);
    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    // Ownership check
    if (business.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only delete your own business",
      });
    }

    // Delete image from filesystem
    if (business.image) {
      const imagePath = business.image.startsWith("/") ? business.image.substring(1) : business.image;
      const fullPath = path.join(process.cwd(), imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await businessModel.findByIdAndDelete(id);

    // Reset user's isBusinessCreated status
    await userModel.findByIdAndUpdate(userId, { isBusinessCreated: false });

    return res.status(200).json({
      success: true,
      message: "Business deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete business",
      error: error.message,
    });
  }
};
