import userModel from "../../auth/schema/auth.modal.js";
import mongoose from "mongoose";

const serviceModel = mongoose.models.Service || mongoose.model("Service", new mongoose.Schema({
  serviceProviderId: mongoose.Schema.Types.ObjectId,
}));

export const checkSubscription = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Authentication required",
      });
    }

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "User not found",
      });
    }

    // Consumers don't need subscriptions for now based on your flow
    if (user.role === "consumer") {
      return next();
    }

    // Service Providers
    if (user.role === "serviceProvider") {
      // 1. Founding members get full access
      if (user.isFoundedMember) {
        return next();
      }

      // 2. Check for active subscription
      if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date()) {
        return next();
      }

      // 3. No active subscription
      return res.status(403).json({
        success: false,
        error: true,
        message: "Active subscription required to access this feature. Please choose a plan.",
        isSubscriptionRequired: true,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Error checking subscription status",
      error: error.message,
    });
  }
};

/**
 * Middleware to check if the service provider has reached their plan's service limit
 * (e.g., "only 2 service", "only 5 service", "only 10 service")
 */
export const checkServiceLimit = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;

    // 1. Get user with populated subscription
    const user = await userModel.findById(userId).populate("subscriptionId");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2. Founding Members have no limits (Unlimited)
    if (user.isFoundedMember) {
      return next();
    }

    const subscription = user.subscriptionId;
    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: "No active subscription found. Please choose a plan.",
      });
    }

    // 3. Find the limit from features (e.g., "only 5 service")
    let limit = 0;
    const limitFeature = subscription.features.find((f) =>
      f.toLowerCase().includes("only"),
    );

    if (limitFeature) {
      const match = limitFeature.match(/\d+/);
      if (match) {
        limit = parseInt(match[0]);
      }
    }

    // Count user's current services
    const currentServiceCount = await serviceModel.countDocuments({ serviceProviderId: user._id });

    if (currentServiceCount >= limit && limit > 0) {
      return res.status(403).json({
        success: false,
        message: `Limit reached! Your current plan only allows up to ${limit} services. Please upgrade your plan.`,
        limit,
        currentCount: currentServiceCount,
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
