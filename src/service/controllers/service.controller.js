import serviceModel from "../schema/service.modal.js";
import userModel from "../../auth/schema/auth.modal.js";
import businessModel from "../../buisness/schema/buisness.modal.js";
import fs from "fs";
import path from "path";

/**
 * Create a new service
 * Only for serviceProvider role
 */
export const createService = async (req, res) => {
  try {
    const {
      selectBusiness,
      serviceName,
      serviceType,
      servicePrice,
      serviceDuration,
      serviceStatus,
      availableSeats,
      availability,
      isBooking,
    } = req.body;

    const serviceProviderId = req.user?.id || req.user?._id;

    if (!serviceProviderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User ID not found",
      });
    }

    // --- Subscription Limit Check ---
    const user = await userModel.findById(serviceProviderId).populate("subscriptionId");
    
    if (user && user.role === "serviceProvider") {
      const subscription = user.subscriptionId;
      
      // If user has a subscription with a maxServices limit
      if (subscription && subscription.maxServices !== -1) {
        const currentServiceCount = await serviceModel.countDocuments({ serviceProviderId });
        if (currentServiceCount >= subscription.maxServices) {
          return res.status(403).json({
            success: false,
            message: `You have reached the limit of ${subscription.maxServices} services for your ${subscription.planName} plan. Please upgrade to add more services.`,
            upgradeRequired: true,
            currentTier: subscription.planName
          });
        }
      }
      
      // Fallback: If no subscription found but they are trying to create a service, 
      // they should probably be on a trial or forced to pick a plan.
      // For now, if no subscription, we might allow it or redirect.
    }
    // --------------------------------

    // Handle availability parsing if sent as a string (common in multipart form-data)
    let parsedAvailability = availability;
    if (typeof availability === "string") {
      try {
        parsedAvailability = JSON.parse(availability);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `Invalid format for availability: ${error.message}. Please ensure it is a valid JSON array.`,
        });
      }
    }

    // Handle service images from multer
    let serviceImages = [];
    if (req.files && req.files.length > 0) {
      serviceImages = req.files.map((file) => `/uploads/${file.filename}`);
    }

    // Create the service
    const newService = await serviceModel.create({
      selectBusiness,
      serviceName,
      serviceType,
      servicePrice,
      serviceDuration,
      serviceStatus,
      availableSeats,
      availability: parsedAvailability,
      isBooking: isBooking === "true" || isBooking === true,
      serviceImages,
      serviceProviderId,
    });

    return res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: newService,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create service",
      error: error.message,
    });
  }
};

/**
 * Get all services with pagination and provider details
 */
export const getAllServices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalServices = await serviceModel.countDocuments();

    const services = await serviceModel
      .find()
      .populate("serviceProviderId", "userName email image category")
      .populate("selectBusiness")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalPages = Math.ceil(totalServices / limit);

    return res.status(200).json({
      success: true,
      message: "All services retrieved successfully",
      meta: {
        currentPage: page,
        totalPages,
        totalServices,
        limit,
      },
      data: services,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve services",
      error: error.message,
    });
  }
};

/**
 * Get single service details
 */
export const getsingleservice = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await serviceModel
      .findById(id)
      .populate("serviceProviderId", "userName email image category")
      .populate("selectBusiness");

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service retrieved successfully",
      data: service,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve service",
      error: error.message,
    });
  }
};

/**
 * Update service details
 */
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const existingService = await serviceModel.findById(id);
    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Handle availability parsing if sent as a string
    if (
      updateData.availability &&
      typeof updateData.availability === "string"
    ) {
      try {
        updateData.availability = JSON.parse(updateData.availability);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `Invalid format for availability: ${error.message}. Please ensure it is a valid JSON array.`,
        });
      }
    }

    // Handle service images if updated
    if (req.files && req.files.length > 0) {
      // Delete old images from filesystem
      if (
        existingService.serviceImages &&
        existingService.serviceImages.length > 0
      ) {
        existingService.serviceImages.forEach((imagePath) => {
          const relativePath = imagePath.startsWith("/")
            ? imagePath.substring(1)
            : imagePath;
          const fullPath = path.join(process.cwd(), relativePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        });
      }
      updateData.serviceImages = req.files.map(
        (file) => `/uploads/${file.filename}`,
      );
    }

    const updatedService = await serviceModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updatedService) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: updatedService,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update service",
      error: error.message,
    });
  }
};

/**
 * Delete a service
 */
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const existingService = await serviceModel.findById(id);
    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // Delete images from filesystem
    if (
      existingService.serviceImages &&
      existingService.serviceImages.length > 0
    ) {
      existingService.serviceImages.forEach((imagePath) => {
        const relativePath = imagePath.startsWith("/")
          ? imagePath.substring(1)
          : imagePath;
        const fullPath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }

    await serviceModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete service",
      error: error.message,
    });
  }
};

export const getMyServices = async (req, res) => {
  try {
    const serviceProviderId = req.user?.id || req.user?._id;

    if (!serviceProviderId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User ID not found",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalServices = await serviceModel.countDocuments({
      serviceProviderId,
    });

    const services = await serviceModel
      .find({ serviceProviderId })
      .populate("serviceProviderId", "userName email image category")
      .populate("selectBusiness")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalPages = Math.ceil(totalServices / limit);

    return res.status(200).json({
      success: true,
      message: "My services retrieved successfully",
      meta: {
        currentPage: page,
        totalPages,
        totalServices,
        limit,
      },
      data: services,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve my services",
      error: error.message,
    });
  }
};
