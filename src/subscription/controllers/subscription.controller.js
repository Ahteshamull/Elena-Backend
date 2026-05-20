import subscriptionModal from "../schema/subscription.modal.js";
import userModel from "../../auth/schema/auth.modal.js";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const createSubscription = async (req, res) => {
  try {
    const {
      planName,
      billingCycle,
      price,
      discountPrice,
      discountPercentage,
      trialDays,
      features,
      status,
    } = req.body;
    const subscription = await subscriptionModal.create({
      planName,
      billingCycle,
      price,
      discountPrice,
      discountPercentage,
      trialDays,
      features,
      status,
    });
    res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data: subscription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create subscription",
      error: error.message,
    });
  }
};

export const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await subscriptionModal.find({ status: "active" });
    res.status(200).json({
      success: true,
      message: "Subscriptions retrieved successfully",
      data: subscriptions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve subscriptions",
      error: error.message,
    });
  }
};

export const selectPlan = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user?._id || req.user?.id;

    if (!subscriptionId) {
      return res
        .status(400)
        .json({ success: false, message: "Subscription ID is required" });
    }

    const user = await userModel.findById(userId);
    const plan = await subscriptionModal.findById(subscriptionId);

    if (!user || !plan) {
      return res
        .status(404)
        .json({ success: false, message: "User or Plan not found" });
    }

    // --- Founding Member Logic ---
    if (plan.planName === "Founding Member") {
      const foundingMemberCount = await userModel.countDocuments({
        isFoundedMember: true,
      });
      if (foundingMemberCount >= 1) {
        return res.status(400).json({
          success: false,
          message:
            "The Founding Member program has reached its limit of 50 members.",
        });
      }

      // If it's a Founding Member plan, we might want a different checkout session
      // (The one-time $350 fee)
      // For now, I'll let the regular payment logic handle the price from the plan object.
    }
    // ------------------------------

    // Case 1: Free Trial Plan (Price is 0)
    if (plan.price === 0) {
      if (user.isTrialUsed) {
        return res.status(400).json({
          success: false,
          message: "Free trial has already been used.",
        });
      }

      const expiry = new Date();
      expiry.setDate(expiry.getDate() + (plan.trialDays || 14));

      user.subscriptionExpiry = expiry;
      user.subscriptionId = plan._id;
      user.isTrialUsed = true;
      await user.save({ validateBeforeSave: false });

      return res.status(200).json({
        success: true,
        message: "Free trial activated successfully",
        data: { subscriptionExpiry: user.subscriptionExpiry },
      });
    }

    // Case 2: Paid Plan (Price > 0)
    if (plan.price > 0) {
      if (!stripe) {
        return res
          .status(500)
          .json({ success: false, message: "Stripe is not configured" });
      }

      // Use discountPrice if available, otherwise use regular price
      const finalPrice =
        plan.discountPrice !== undefined && plan.discountPrice !== null
          ? plan.discountPrice
          : plan.price;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: plan.planName,
                description: `${plan.billingCycle} subscription ${plan.discountPrice ? "(Discounted)" : ""}`,
              },
              unit_amount: Math.round(finalPrice * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/subscription/cancel`,
        metadata: {
          userId: userId.toString(),
          subscriptionId: plan._id.toString(),
          billingCycle: plan.billingCycle,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Checkout session created",
        url: session.url,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to select plan",
      error: error.message,
    });
  }
};

export const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedPlan = await subscriptionModal.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updatedPlan) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription plan not found" });
    }

    res.status(200).json({
      success: true,
      message: "Subscription plan updated successfully",
      data: updatedPlan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update subscription",
      error: error.message,
    });
  }
};
