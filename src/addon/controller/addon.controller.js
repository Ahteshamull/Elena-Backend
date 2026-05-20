import addonModal from "../schema/addon.modal.js";
import userModel from "../../auth/schema/auth.modal.js";
import Payment from "../../payment/schema/payment.modal.js";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const createAddon = async (req, res) => {
  try {
    const addon = await addonModal.create(req.body);
    res.status(201).json({
      success: true,
      message: "Addon created successfully",
      data: addon,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create addon",
      error: error.message,
    });
  }
};

export const getAllAddons = async (req, res) => {
  try {
    const addons = await addonModal.find({ status: "active" });
    res.status(200).json({
      success: true,
      message: "Addons retrieved successfully",
      data: addons,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve addons",
      error: error.message,
    });
  }
};

export const purchaseAddon = async (req, res) => {
  try {
    const { addonId } = req.params;
    const userId = req.user?._id || req.user?.id;

    const user = await userModel.findById(userId);
    const addon = await addonModal.findById(addonId);

    if (!user || !addon) {
      return res.status(404).json({ success: false, message: "User or Addon not found" });
    }

    if (!stripe) {
      return res.status(500).json({ success: false, message: "Stripe is not configured" });
    }

    // Dynamic Pricing Logic
    let finalPrice = addon.standardPrice;
    if (user.isFoundedMember && addon.type === "Consultation" && addon.foundingMemberPrice) {
      finalPrice = addon.foundingMemberPrice;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: addon.name,
              description: addon.description || `${addon.type} Service`,
            },
            unit_amount: Math.round(finalPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=addon`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
      metadata: {
        userId: userId.toString(),
        addonId: addon._id.toString(),
        addonType: addon.type,
      },
    });

    res.status(200).json({
      success: true,
      message: "Checkout session created",
      url: session.url,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create purchase session",
      error: error.message,
    });
  }
};
