import mongoose from "mongoose";
import userModel from "../../auth/schema/auth.modal.js";
import Payment from "../schema/payment.modal.js";
import bookingModel from "../../booking-chef/schema/booking.modal.js";
import Notification from "../../notification/schema/notification.modal.js";
import SendOtp from "../../helper/helpers/sendOtp.js";


import Stripe from "stripe";

// Initialize Stripe with your secret key
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const stripeAccountOnboarding = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    // Check if Stripe is configured
    if (!stripe) {
      return res.status(500).json({
        success: false,
        message:
          "Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.",
      });
    }

    // Validate environment URLs
    const frontendUrl = process.env.CLIENT_URL;
    const refreshUrl =
      process.env.ONBOARDING_REFRESH_URL || `${frontendUrl}/stripe-refresh`;
    const returnUrl =
      process.env.ONBOARDING_RETURN_URL || `${frontendUrl}/stripe-return`;

    // Find user
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // if user already has stripe account
    if (user.stripeAccountId) {
      const account = await stripe.accounts.retrieve(user.stripeAccountId);

      const cardPayments = account.capabilities?.card_payments;
      const transfers = account.capabilities?.transfers;
      const requirements = account.requirements?.currently_due || [];

      // if verified
      if (cardPayments === "active" && transfers === "active") {
        // update DB to mark as connected
        await userModel.findByIdAndUpdate(user.id, {
          isStripeConnected: true,
        });

        return res.status(200).json({
          success: true,
          status: "verified",
          message: "Stripe account verified successfully.",
          capabilities: account.capabilities,
        });
      }

      // if not verified → generate onboarding link
      const accountLinks = await stripe.accountLinks.create({
        account: user.stripeAccountId,
        refresh_url: `${refreshUrl}?accountId=${user.stripeAccountId}`,
        return_url: `${returnUrl}?accountId=${user.stripeAccountId}`,
        type: "account_onboarding",
      });

      // update DB to store stripeAccountId & mark connected
      await userModel.findByIdAndUpdate(user.id, {
        stripeAccountId: user.stripeAccountId,
        isStripeConnected: true,
      });

      return res.status(200).json({
        success: true,
        status: requirements.length > 0 ? "requirements_due" : "pending",
        message:
          requirements.length > 0
            ? "Additional information required for Stripe verification."
            : "Your Stripe account verification is under review.",
        requirements,
        onboardingLink: accountLinks.url,
      });
    }

    // if user has no stripe account → create new account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: user?.email,
      business_type: "individual",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            delay_days: 2, // minimum allowed
          },
        },
      },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${refreshUrl}?accountId=${account.id}`,
      return_url: `${returnUrl}?accountId=${account.id}`,
      type: "account_onboarding",
    });

    // update DB with stripeAccountId & mark connected
    await userModel.findByIdAndUpdate(user.id, {
      stripeAccountId: account.id,
      isStripeConnected: true,
    });

    return res.status(200).json({
      success: true,
      status: "pending",
      message: "Your Stripe account verification is under review.",
      capabilities: account.capabilities,
      onboardingLink: accountLink.url,
    });
  } catch (error) {
    console.error("Error in stripe account onboarding:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating Stripe account onboarding",
      error: error.message,
    });
  }
};


export const createCheckoutSession = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.id || req.user?._id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!stripe) {
      return res.status(500).json({ success: false, message: "Stripe not configured" });
    }

    const booking = await bookingModel.findById(bookingId).populate("chefId");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Verify user owns the booking
    if (booking.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You can only pay for your own bookings" });
    }

    // Verify chef has Stripe
    const chef = booking.chefId;
    if (!chef.stripeAccountId) {
      return res.status(400).json({ success: false, message: "The chef has not set up their payment account yet." });
    }

    const { paymentType } = req.body || {};
    let amountToCharge = booking.totalAmount;
    
    if (paymentType === "minimum" && booking.minimumFee && booking.minimumFee > 0) {
      amountToCharge = booking.minimumFee;
    }

    // Amount calculations
    const totalAmount = amountToCharge;
    const adminCut = totalAmount * 0.20;
    const chefCut = totalAmount - adminCut;

    const totalAmountInCents = Math.round(totalAmount * 100);
    const adminCutInCents = Math.round(adminCut * 100);

    // Create a Checkout Session
    const frontendUrl = process.env.CLIENT_URL;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Booking with Chef ${chef.userName}`,
              description: `Booking ID: ${booking._id}`,
            },
            unit_amount: totalAmountInCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        capture_method: "manual",
        transfer_data: {
          destination: chef.stripeAccountId,
        },
        application_fee_amount: adminCutInCents,
        metadata: {
          bookingId: booking._id.toString(),
          chefId: chef._id.toString(),
          userId: userId.toString(),
        },
      },
      success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment/cancel`,
      metadata: {
        bookingId: booking._id.toString(),
        chefId: chef._id.toString(),
        userId: userId.toString(),
      },
    });

    // Save pending payment record
    const payment = new Payment({
      amount: totalAmount,
      currency: "usd",
      sessionId: session.id,
      status: "PENDING",
      provider: "STRIPE",
      userId,
      chefId: chef._id,
      bookingId: booking._id,
      admin_amount: adminCut,
      influencer_amount: chefCut,
    });

    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Checkout session created successfully",
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating checkout session",
      error: error.message,
    });
  }
};

export const paymentSuccess = async (req, res) => {
  res.send(`
    <html>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #4CAF50;">Payment Successful!</h1>
        <p>Your payment has been held successfully.</p>
        <p>Session ID: ${req.query.session_id}</p>
        <p>You can close this window now.</p>
      </body>
    </html>
  `);
};

export const paymentCancel = async (req, res) => {
  res.send(`
    <html>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #f44336;">Payment Cancelled</h1>
        <p>You cancelled the checkout process.</p>
        <p>You can close this window now.</p>
      </body>
    </html>
  `);
};

export const webhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_KEY,
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Received stripe webhook event: ${event.type}`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    
    // Find payment
    const payment = await Payment.findOne({ sessionId: session.id })
      .populate("bookingId")
      .populate("userId")
      .populate("chefId");
      
    if (payment) {
      payment.status = "HOLD"; // Funds are authorized but not captured
      payment.paymentIntentId = session.payment_intent;
      await payment.save();

      // Notify the chef
      await Notification.create({
        type: "payment_hold",
        title: "Payment Received in Escrow",
        message: `A payment of $${payment.amount} has been successfully held in escrow for your booking.`,
        bookingId: payment.bookingId?._id || payment.bookingId,
        createdBy: payment.userId?._id || payment.userId,
        receiverId: payment.chefId?._id || payment.chefId,
        receiverRole: "chef",
      });

      // Send Confirmation Emails to both client and chef
      try {
        const clientEmail = payment.userId?.email;
        const clientName = payment.userId?.userName || payment.userId?.name || "Client";
        
        const chefEmail = payment.chefId?.email;
        const chefName = payment.chefId?.userName || payment.chefId?.name || "Chef";

        if (clientEmail) {
          await SendOtp.sendPaymentConfirmationEmail(clientEmail, clientName, "client", payment.amount);
        }
        if (chefEmail) {
          await SendOtp.sendPaymentConfirmationEmail(chefEmail, chefName, "chef", payment.amount);
        }
      } catch (err) {
        console.error("Error sending payment confirmation emails:", err);
      }
    }
  }

  res.json({ received: true });
};

export const verifyPayment = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Fetch session from stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    const payment = await Payment.findOne({ sessionId })
      .populate("bookingId")
      .populate("userId")
      .populate("chefId");
      
    if (payment && payment.status === "PENDING" && session.payment_status === "paid") {
      payment.status = "HOLD"; // Funds are authorized but not captured
      payment.paymentIntentId = session.payment_intent;
      await payment.save();

      // Notify the chef
      await Notification.create({
        type: "payment_hold",
        title: "Payment Received in Escrow",
        message: `A payment of $${payment.amount} has been successfully held in escrow for your booking.`,
        bookingId: payment.bookingId?._id || payment.bookingId,
        createdBy: payment.userId?._id || payment.userId,
        receiverId: payment.chefId?._id || payment.chefId,
        receiverRole: "chef",
      });

      // Send Confirmation Emails to both client and chef
      try {
        const clientEmail = payment.userId?.email;
        const clientName = payment.userId?.userName || payment.userId?.name || "Client";
        
        const chefEmail = payment.chefId?.email;
        const chefName = payment.chefId?.userName || payment.chefId?.name || "Chef";

        if (clientEmail) {
          await SendOtp.sendPaymentConfirmationEmail(clientEmail, clientName, "client", payment.amount);
        }
        if (chefEmail) {
          await SendOtp.sendPaymentConfirmationEmail(chefEmail, chefName, "chef", payment.amount);
        }
      } catch (err) {
        console.error("Error sending payment confirmation emails:", err);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      status: payment?.status || "NOT_FOUND"
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: error.message,
    });
  }
};

export const capturePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // Ensure user is admin/superadmin
    const userRole = req.user?.role;
    if (userRole !== "admin" && userRole !== "superAdmin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can release payments",
      });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    if (payment.status !== "HOLD") {
      return res.status(400).json({ success: false, message: `Payment cannot be captured. Current status is ${payment.status}` });
    }

    if (!payment.paymentIntentId) {
      return res.status(400).json({ success: false, message: "Payment intent ID is missing" });
    }

    // Capture the payment intent
    const intent = await stripe.paymentIntents.capture(payment.paymentIntentId);

    // Update DB
    payment.status = "SUCCESS";
    await payment.save();

    // Update booking status to completed
    if (payment.bookingId) {
      await bookingModel.findByIdAndUpdate(payment.bookingId, { status: "completed" });
      
      // Notify client and chef about completion
      await Notification.create([
        {
          type: "booking_completed",
          title: "Booking Completed",
          message: "The booking has been successfully completed and the payment has been released.",
          bookingId: payment.bookingId,
          receiverId: payment.userId,
          receiverRole: "user",
        },
        {
          type: "payment_released",
          title: "Payment Released",
          message: `Your payout of $${payment.influencer_amount || payment.amount * 0.85} for the completed booking has been released.`,
          bookingId: payment.bookingId,
          receiverId: payment.chefId,
          receiverRole: "chef",
        }
      ]);
    }

    return res.status(200).json({
      success: true,
      message: "Payment released to chef successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Error capturing payment:", error);
    return res.status(500).json({
      success: false,
      message: "Error capturing payment",
      error: error.message,
    });
  }
};

export const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user?._id || req.user?.id || req.user?.userId;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID is required",
      });
    }

    // Find payment
    const payment = await Payment.findById(paymentId)
      .populate("userId", "name email")
      .populate("title", "status payment");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Check if user owns the payment
    if (payment.userId._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own payments",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment status retrieved successfully",
      data: {
        payment: {
          _id: payment._id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          description: payment.description,
          sessionId: payment.sessionId,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          collaboration: payment.title,
        },
      },
    });
  } catch (error) {
    console.error("Error getting payment status:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting payment status",
      error: error.message,
    });
  }
};

export const getUserPayments = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.userId;
    const { page = 1, limit = 10, status } = req.query;

    const filter = { userId, isDeleted: false };

    if (status) {
      filter.status = status.toUpperCase();
    }

    const skip = (page - 1) * limit;

    const payments = await Payment.find(filter)
      .populate("title", "status payment")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);

    const total = await Payment.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "Payments retrieved successfully",
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error getting user payments:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting user payments",
      error: error.message,
    });
  }
};

export const getChefEarnings = async (req, res) => {
  try {
    const chefId = req.user?._id || req.user?.id || req.user?.userId;
    const { page = 1, limit = 10, status } = req.query;

    const filter = { chefId, isDeleted: false };

    if (status) {
      filter.status = status.toUpperCase();
    }

    const skip = (page - 1) * limit;

    const payments = await Payment.find(filter)
      .populate("userId", "name userName email")
      .populate("bookingId")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);

    const total = await Payment.countDocuments(filter);
    
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const metricsAggr = await Payment.aggregate([
      { $match: { chefId: new mongoose.Types.ObjectId(chefId), status: "SUCCESS" } },
      { 
        $facet: {
          totalEarnings: [
            { $group: { _id: null, total: { $sum: "$influencer_amount" } } }
          ],
          lastPayout: [
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            { $project: { createdAt: 1 } }
          ],
          thisMonthEarnings: [
            { $match: { createdAt: { $gte: firstDayThisMonth } } },
            { $group: { _id: null, total: { $sum: "$influencer_amount" } } }
          ],
          lastMonthEarnings: [
            { $match: { createdAt: { $gte: firstDayLastMonth, $lt: firstDayThisMonth } } },
            { $group: { _id: null, total: { $sum: "$influencer_amount" } } }
          ]
        }
      }
    ]);

    const metrics = metricsAggr[0] || {};
    const totalEarnings = metrics.totalEarnings?.[0]?.total || 0;
    const lastPayoutDate = metrics.lastPayout?.[0]?.createdAt || null;
    const thisMonthEarnings = metrics.thisMonthEarnings?.[0]?.total || 0;
    const lastMonthEarnings = metrics.lastMonthEarnings?.[0]?.total || 0;

    // Calculate growth percentage
    let growth = 0;
    if (lastMonthEarnings > 0) {
      growth = ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100;
    } else if (thisMonthEarnings > 0) {
      growth = 100;
    }

    return res.status(200).json({
      success: true,
      message: "Chef earnings retrieved successfully",
      data: {
        payments,
        totalEarnings,
        lastPayoutDate,
        thisMonthEarnings,
        growth: Math.round(growth),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error getting chef earnings:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting chef earnings",
      error: error.message,
    });
  }
};

export const userSpendingGrowth = async (req, res) => {
  try {
    const userId = req.user._id;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const totalSpending = await Payment.aggregate([
      {
        $match: {
          userId: userId,
          status: { $in: ["SUCCESS", "IN_PROGRESS", "HOLD"] },
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const monthlySpending = await Payment.aggregate([
      {
        $match: {
          userId: userId,
          status: { $in: ["SUCCESS", "IN_PROGRESS", "HOLD"] },
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const monthlyData = [];
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    for (let i = 1; i <= 12; i++) {
      const monthData = monthlySpending.find((item) => item._id === i);
      monthlyData.push({
        month: months[i - 1],
        monthNumber: i,
        amount: monthData ? monthData.amount : 0,
        count: monthData ? monthData.count : 0,
      });
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "User spending growth retrieved successfully",
      data: {
        year,
        totalSpending: totalSpending[0]?.total || 0,
        monthlyData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving user spending growth",
      error: error.message,
    });
  }
};

export const adminEarnings = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    // 1. Overall Stats & Counts
    const [earnings, totalConsumers, totalProviders] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "SUCCESS" } },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: "$admin_amount" },
            totalSubscriptions: { $sum: 1 }, // Map total subscription payments count to total successful payments
          },
        },
      ]),
      userModel.countDocuments({ role: "user" }),
      userModel.countDocuments({ role: "chef" }),
    ]);

    // 2. Monthly Growth for the current year (based on successful transactions/payments)
    const monthlyGrowth = await Payment.aggregate([
      {
        $match: {
          status: "SUCCESS",
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          earnings: { $sum: "$admin_amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format monthly data
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const chartData = monthNames.map((month, index) => {
      const found = monthlyGrowth.find((m) => m._id === index + 1);
      return {
        month,
        earnings: found ? found.earnings : 0,
        subscriptions: found ? found.count : 0,
      };
    });

    const summary = earnings.length > 0 ? earnings[0] : { totalEarnings: 0, totalSubscriptions: 0 };
    // Remove the null _id from response to make it cleaner
    delete summary._id;

    return res.status(200).json({
      success: true,
      message: "Admin overview data retrieved successfully",
      data: {
        overview: {
          totalRevenue: summary.totalEarnings,
          totalSubscriptions: summary.totalSubscriptions,
          totalConsumers,
          totalProviders,
          totalUsers: totalConsumers,
          totalChefs: totalProviders,
          activeUsers: totalConsumers + totalProviders,
        },
        planBreakdown: [],
        monthlyChart: chartData,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('userId', 'userName email')
      .populate('chefId', 'userName email')
      .populate('bookingId')
      .sort({ createdAt: -1 });

    const formattedPayments = payments.map(payment => {
      let daysPending = 0;
      if (payment.status === 'HOLD') {
        const diffTime = Math.abs(new Date() - new Date(payment.createdAt));
        daysPending = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      return {
        _id: payment._id,
        amount: payment.amount,
        influencer_amount: payment.influencer_amount,
        admin_amount: payment.admin_amount,
        status: payment.status,
        provider: payment.provider,
        createdAt: payment.createdAt,
        daysPending,
        client: payment.userId,
        chef: payment.chefId,
        booking: payment.bookingId
      };
    });

    return res.status(200).json({
      success: true,
      message: 'All payments retrieved successfully',
      data: formattedPayments
    });
  } catch (error) {
    console.error('Error getting all payments:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting all payments',
      error: error.message
    });
  }
};
