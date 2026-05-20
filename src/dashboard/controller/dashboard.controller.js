import userModel from "../../auth/schema/auth.modal.js";
import Payment from "../../payment/schema/payment.modal.js";

export const dashboard = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    // Get all total counts and data in parallel
    const now = new Date();
    const currentMonth = now.getMonth();

    const [
      totalConsumers,
      totalServiceProviders,
      monthlyUserRatio,
      calendarEvents,
      recentUsers,
    ] = await Promise.all([
      // Total consumers
      userModel.countDocuments({ role: "consumer" }),

      // Total service providers
      userModel.countDocuments({ role: "serviceProvider" }),

      // Monthly user registration data for current year (User Ratio chart)
      userModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(currentYear, 0, 1),
              $lt: new Date(currentYear + 1, 0, 1),
            },
          },
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),

      // Calendar events — user registrations per day for the current month
      userModel.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(currentYear, currentMonth, 1),
              $lt: new Date(currentYear, currentMonth + 1, 1),
            },
          },
        },
        {
          $group: {
            _id: { $dayOfMonth: "$createdAt" },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),

      // Recent users
      userModel
        .find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .select("userName email phone role image createdAt"),
    ]);

    // Build full 12-month array (fill missing months with 0)
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const userRatio = monthNames.map((month, index) => {
      const found = monthlyUserRatio.find((m) => m._id === index + 1);
      return {
        month,
        count: found ? found.count : 0,
      };
    });

    // Build calendar highlight dates
    const calendarDates = calendarEvents.map((e) => ({
      date: e._id,
      events: e.count,
    }));

    // Build full calendar grid (6 weeks × 7 days) like the screenshot
    const today = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0=Sun

    // Previous month filler days
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();

    const calendarGrid = [];

    // Fill previous month trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      calendarGrid.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Fill current month days
    for (let d = 1; d <= daysInMonth; d++) {
      calendarGrid.push({
        day: d,
        isCurrentMonth: true,
        isToday: d === today,
      });
    }

    // Fill next month leading days to complete the grid (up to 42 cells = 6 rows)
    const remaining = 42 - calendarGrid.length;
    for (let d = 1; d <= remaining; d++) {
      calendarGrid.push({
        day: d,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Split into weeks (rows of 7)
    const weeks = [];
    for (let i = 0; i < calendarGrid.length; i += 7) {
      weeks.push(calendarGrid.slice(i, i + 7));
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "Dashboard data retrieved successfully",
      data: {
        totals: {
          consumer: totalConsumers,
          serviceProvider: totalServiceProviders,
        },
        userRatio: {
          year: currentYear,
          data: userRatio,
        },
        calendar: {
          year: currentYear,
          month: currentMonth + 1,
          monthName: now.toLocaleString("default", { month: "long" }),
          today,
          dayHeaders: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
          weeks,
          events: calendarDates,
        },
        recentUsers,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving dashboard data",
      error: error.message,
    });
  }
};

export const userDashboard = async (req, res) => {
  try {
    // Get user ID from token
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Authentication required",
      });
    }

    // Get user details to determine role and subscription
    const user = await userModel.findById(userId).populate("subscriptionId");
    if (!user) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "User not found",
      });
    }

    const subscription = user.subscriptionId;
    const isBronze = subscription?.planName === "Bronze";
    const isTrial = isBronze && user.subscriptionExpiry > new Date();
    
    // Bronze users get "preview" access
    const isPreview = isBronze && !isTrial; // If trial is over, it's definitely preview/locked
    // Actually the document says "Bronze includes Revenue dashboard preview..."
    // So even during trial it might be a preview, OR they get full access during trial.
    // "During the 14-day free trial, users receive temporary access to many Gold-tier amenities."
    // This implies full access during trial.
    const showFullAnalytics = !isBronze || isTrial;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Get all user-specific data in parallel
    const [
      totalSpending,
      monthlySpending,
      lastMonthSpending,
      totalEarnings,
      monthlyEarnings,
      lastMonthEarnings,
    ] = await Promise.all([
      Payment.aggregate([
        {
          $match: {
            userId,
            status: { $in: ["SUCCESS", "IN_PROGRESS", "HOLD"] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),

      Payment.aggregate([
        {
          $match: {
            userId,
            status: { $in: ["SUCCESS", "IN_PROGRESS || HOLD"] },
            createdAt: {
              $gte: new Date(currentYear, currentMonth, 1),
              $lt: new Date(currentYear, currentMonth + 1, 1),
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),

      // Last month spending
      Payment.aggregate([
        {
          $match: {
            userId,
            status: { $in: ["SUCCESS", "IN_PROGRESS || HOLD"] },
            createdAt: {
              $gte: new Date(lastMonthYear, lastMonth, 1),
              $lt: new Date(lastMonthYear, lastMonth + 1, 1),
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),

      // Total earnings (for influencers)
      Payment.aggregate([
        {
          $match: {
            selectInfluencerOrHost: userId,
            status: "SUCCESS",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$influencer_amount" },
          },
        },
      ]),

      // Monthly earnings (current month)
      Payment.aggregate([
        {
          $match: {
            selectInfluencerOrHost: userId,
            status: "SUCCESS",
            createdAt: {
              $gte: new Date(currentYear, currentMonth, 1),
              $lt: new Date(currentYear, currentMonth + 1, 1),
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$influencer_amount" },
          },
        },
      ]),

      // Last month earnings
      Payment.aggregate([
        {
          $match: {
            selectInfluencerOrHost: userId,
            status: "SUCCESS",
            createdAt: {
              $gte: new Date(lastMonthYear, lastMonth, 1),
              $lt: new Date(lastMonthYear, lastMonth + 1, 1),
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$influencer_amount" },
          },
        },
      ]),
    ]);

    // Calculate growth rates
    const currentSpending = monthlySpending[0]?.total || 0;
    const lastSpending = lastMonthSpending[0]?.total || 0;
    const spendingGrowth =
      lastSpending > 0
        ? (((currentSpending - lastSpending) / lastSpending) * 100).toFixed(2)
        : 0;

    const currentEarnings = monthlyEarnings[0]?.total || 0;
    const lastEarnings = lastMonthEarnings[0]?.total || 0;
    const earningsGrowth =
      lastEarnings > 0
        ? (((currentEarnings - lastEarnings) / lastEarnings) * 100).toFixed(2)
        : 0;


    res.status(200).json({
      success: true,
      error: false,
      message: "User dashboard data retrieved successfully",
        data: {
        userRole: user.role,
        subscription: {
          planName: subscription?.planName || "No Plan",
          isTrial,
          isPreview,
          showFullAnalytics,
        },
        totals: {
          earnings: {
            total: showFullAnalytics ? (totalEarnings[0]?.total || 0) : 0,
            currentMonth: showFullAnalytics ? currentEarnings : 0,
            growth: showFullAnalytics ? parseFloat(earningsGrowth) : 0,
          },
          spending: {
            total: showFullAnalytics ? (totalSpending[0]?.total || 0) : 0,
            currentMonth: showFullAnalytics ? currentSpending : 0,
            growth: showFullAnalytics ? parseFloat(spendingGrowth) : 0,
          },
        },
        monthlyData: {
          currentMonth: new Date().toLocaleString("default", {
            month: "long",
            year: "numeric",
          }),
        },
        meta: {
          lastUpdated: new Date(),
          currency: "USD",
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error retrieving user dashboard data",
      error: error.message,
    });
  }
};
