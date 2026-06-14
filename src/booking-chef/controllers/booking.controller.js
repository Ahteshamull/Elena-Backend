import mongoose from "mongoose";
import bookingModel from "../schema/booking.modal.js";
import userModel from "../../auth/schema/auth.modal.js";
import Profile from "../../profileSetup/schema/profile.modal.js";
import Payment from "../../payment/schema/payment.modal.js";
import Notification from "../../notification/schema/notification.modal.js";

// Helper function to format booking response uniformly
const formatBookingsWithChefInfo = async (bookingsInput) => {
  if (!bookingsInput || (Array.isArray(bookingsInput) && bookingsInput.length === 0)) {
    return bookingsInput;
  }
  
  const isArray = Array.isArray(bookingsInput);
  const bookings = isArray ? bookingsInput : [bookingsInput];

  const chefIds = [
    ...new Set(
      bookings.map((b) => {
        const json = typeof b.toJSON === 'function' ? b.toJSON() : b;
        return json.chefId?._id?.toString() || json.chefId?.toString();
      }).filter(Boolean)
    ),
  ];

  const profiles = await Profile.find({ userId: { $in: chefIds } });
  const profileMap = {};
  profiles.forEach((p) => {
    profileMap[p.userId.toString()] = p.toJSON();
  });

  const objectIdChefIds = chefIds.map(
    (id) => new mongoose.Types.ObjectId(id)
  );
  const chefBookingStats = await bookingModel.aggregate([
    { $match: { chefId: { $in: objectIdChefIds } } },
    {
      $group: {
        _id: "$chefId",
        totalBookings: { $sum: 1 },
        completedBookings: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
  ]);

  const statsMap = {};
  chefBookingStats.forEach((stat) => {
    statsMap[stat._id.toString()] = {
      totalBookings: stat.totalBookings,
      completedBookings: stat.completedBookings,
    };
  });

  // Fetch payment statuses
  const bookingIds = bookings.map((b) => {
    const json = typeof b.toJSON === 'function' ? b.toJSON() : b;
    return json._id;
  }).filter(Boolean);

  const payments = await Payment.find({ bookingId: { $in: bookingIds } });
  const paymentMap = {};
  const paymentIdMap = {};
  payments.forEach((payment) => {
    paymentMap[payment.bookingId.toString()] = payment.status;
    paymentIdMap[payment.bookingId.toString()] = payment._id;
  });

  const formattedBookings = bookings.map((booking) => {
    const bookingJSON = typeof booking.toJSON === 'function' ? booking.toJSON() : booking;
    const chefIdStr = bookingJSON.chefId?._id?.toString() || bookingJSON.chefId?.toString();
    const chefProfile = chefIdStr ? profileMap[chefIdStr] : null;
    const stats = chefIdStr
      ? statsMap[chefIdStr]
      : { totalBookings: 0, completedBookings: 0 };

    return {
      bookingDetails: {
        _id: bookingJSON._id,
        firstName: bookingJSON.firstName,
        lastName: bookingJSON.lastName,
        email: bookingJSON.email,
        phone: bookingJSON.phone,
        eventLocation: bookingJSON.eventLocation,
        eventDate: bookingJSON.eventDate,
        arrivalTime: bookingJSON.arrivalTime,
        numberOfGuests: bookingJSON.numberOfGuests,
        totalAmount: bookingJSON.totalAmount,
        status: bookingJSON.status,
        paymentStatus: paymentMap[bookingJSON._id.toString()] || "UNPAID",
        paymentId: paymentIdMap[bookingJSON._id.toString()] || null,
        createdAt: bookingJSON.createdAt,
        updatedAt: bookingJSON.updatedAt,
      },
      clientInfo: bookingJSON.userId,
      chefInfo: {
        ...(bookingJSON.chefId || {}),
        totalBookingsReceived: stats.totalBookings || 0,
        totalBookingsCompleted: stats.completedBookings || 0,
        profile: chefProfile,
      },
    };
  });

  return isArray ? formattedBookings : formattedBookings[0];
};

// @desc    Create a new chef booking
// @route   POST /api/v1/booking/:chefId
// @access  Private
export const createBooking = async (req, res) => {
  try {
    const { chefId } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(chefId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Chef ID parameter",
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      eventLocation,
      eventDate,
      arrivalTime,
      numberOfGuests,
    } = req.body;

    // Validate request fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !eventLocation ||
      !eventDate ||
      !arrivalTime ||
      !numberOfGuests
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Prevent self-booking
    if (userId.toString() === chefId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot book yourself",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Phone validation (basic length check)
    if (phone.length < 7 || phone.length > 20) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid phone number",
      });
    }

    // Arrival time basic validation
    if (typeof arrivalTime !== "string" || arrivalTime.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid arrival time",
      });
    }

    const bookingDate = new Date(eventDate);

    // Check if date is valid
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid event date format",
      });
    }

    // Check if the date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      return res.status(400).json({
        success: false,
        message: "Booking date cannot be in the past",
      });
    }

    // Advanced notice: Bookings must be made at least 24 hours in advance
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (bookingDate < tomorrow) {
      return res.status(400).json({
        success: false,
        message: "Bookings must be made at least 24 hours in advance",
      });
    }

    // Check if the chef is already booked for this date
    const startOfDay = new Date(bookingDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(bookingDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBooking = await bookingModel.findOne({
      chefId,
      eventDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: "This chef is already booked for the selected date",
      });
    }

    // Verify chef user exists and has chef role
    const chefUser = await userModel.findById(chefId);
    if (!chefUser) {
      return res.status(404).json({
        success: false,
        message: "Chef user not found",
      });
    }

    if (chefUser.role !== "chef") {
      return res.status(400).json({
        success: false,
        message: "The requested user is not a chef",
      });
    }

    // Fetch chef profile to determine rate if not specified
    const chefProfile = await Profile.findOne({ userId: chefId });

    if (!chefProfile || chefProfile.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "This chef's profile is not yet approved to accept bookings",
      });
    }

    const guestCount = parseInt(numberOfGuests, 10);
    if (isNaN(guestCount) || guestCount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Number of guests must be a valid positive number",
      });
    }

    const minimumFee = chefProfile?.minimumBookingAmount || 0;
    let perPersonRate = chefProfile?.startingPricePerPerson || 0;
    let isCustomQuote = false;

    // Determine rate from guest-count pricing tiers if available
    if (
      chefProfile?.guestPricingTiers &&
      chefProfile.guestPricingTiers.length > 0
    ) {
      const applicableTier = chefProfile.guestPricingTiers.find((tier) => {
        const matchesMin = guestCount >= tier.minGuests;
        const matchesMax = tier.maxGuests ? guestCount <= tier.maxGuests : true;
        return matchesMin && matchesMax;
      });

      if (applicableTier) {
        if (applicableTier.isCustomQuote) {
          isCustomQuote = true;
        } else {
          perPersonRate = applicableTier.pricePerPerson || 0;
        }
      }
    }

    let totalAmount = 0;
    if (!isCustomQuote) {
      totalAmount = minimumFee + guestCount * perPersonRate;
    }

    const newBooking = new bookingModel({
      chefId,
      userId,
      firstName,
      lastName,
      email,
      phone,
      eventLocation,
      eventDate: bookingDate,
      arrivalTime,
      numberOfGuests: guestCount,
      totalAmount,
      status: "pending",
    });

    const savedBooking = await newBooking.save();

    await Notification.create({
      type: "booking_created",
      title: "New Booking Request",
      message: `${firstName} ${lastName} has requested a booking for ${guestCount} guests on ${bookingDate.toDateString()}.`,
      bookingId: savedBooking._id,
      createdBy: userId,
      receiverId: chefId,
      receiverRole: "chef",
    });

    const populatedBooking = await savedBooking.populate([
      { path: "chefId", select: "-password -confirmPassword -refreshToken" },
      { path: "userId", select: "-password -confirmPassword -refreshToken" },
    ]);

    const formattedResponse = await formatBookingsWithChefInfo(populatedBooking);

    return res.status(201).json({
      success: true,
      message: "Chef booking created successfully",
      data: formattedResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create chef booking",
      error: error.message,
    });
  }
};

// @desc    Get bookings created by the logged-in client
// @route   GET /api/v1/booking/client
// @access  Private
export const getClientBookings = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { status } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = { userId };

    if (status) {
      const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
      const lowerStatus = status.toLowerCase();
      if (!validStatuses.includes(lowerStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status parameter. Must be one of: ${validStatuses.join(", ")}`,
        });
      }
      query.status = lowerStatus;
    }

    const bookings = await bookingModel
      .find(query)
      .populate({
        path: "chefId",
        select: "-password -confirmPassword -refreshToken",
      })
      .populate({
        path: "userId",
        select: "-password -confirmPassword -refreshToken",
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const formattedBookings = await formatBookingsWithChefInfo(bookings);
    const total = await bookingModel.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: "Client bookings retrieved successfully",
      meta: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        limit,
      },
      data: formattedBookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve client bookings",
      error: error.message,
    });
  }
};

// @desc    Get bookings received by the logged-in chef
// @route   GET /api/v1/booking/chef
// @access  Private (Chef only)
export const getChefBookings = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { status } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = { chefId: userId };

    if (status) {
      const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
      const lowerStatus = status.toLowerCase();
      if (!validStatuses.includes(lowerStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status parameter. Must be one of: ${validStatuses.join(", ")}`,
        });
      }
      query.status = lowerStatus;
    }

    const bookings = await bookingModel
      .find(query)
      .populate({
        path: "chefId",
        select: "-password -confirmPassword -refreshToken",
      })
      .populate({
        path: "userId",
        select: "-password -confirmPassword -refreshToken",
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const formattedBookings = await formatBookingsWithChefInfo(bookings);
    const total = await bookingModel.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: "Chef bookings retrieved successfully",
      meta: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        limit,
      },
      data: formattedBookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve chef bookings",
      error: error.message,
    });
  }
};

// @desc    Get single booking details
// @route   GET /api/v1/booking/:id
// @access  Private
export const getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID parameter",
      });
    }

    const booking = await bookingModel
      .findById(id)
      .populate({
        path: "chefId",
        select: "-password -confirmPassword -refreshToken",
      })
      .populate({
        path: "userId",
        select: "-password -confirmPassword -refreshToken",
      });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Verify authorized party: client, chef, or administrator
    const isClient = booking.userId?._id.toString() === userId.toString();
    const isChef = booking.chefId?._id.toString() === userId.toString();
    const isAdmin =
      req.user?.role === "admin" || req.user?.role === "superAdmin";

    if (!isClient && !isChef && !isAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You do not have permission to view this booking.",
      });
    }

    const formattedBooking = await formatBookingsWithChefInfo(booking);

    return res.status(200).json({
      success: true,
      message: "Booking details retrieved successfully",
      data: formattedBooking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve booking details",
      error: error.message,
    });
  }
};

// @desc    Update booking status
// @route   PATCH /api/v1/booking/:id/status
// @access  Private
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID parameter",
      });
    }

    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const booking = await bookingModel.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const isClient = booking.userId.toString() === userId.toString();
    const isChef = booking.chefId.toString() === userId.toString();
    const isAdmin =
      req.user?.role === "admin" || req.user?.role === "superAdmin";

    // Validate update permissions based on state changes
    if (!isAdmin) {
      if (status === "confirmed" || status === "completed") {
        // Only the chef can confirm or complete a booking
        if (!isChef) {
          return res.status(403).json({
            success: false,
            message: `Only the booked chef can mark this booking as ${status}.`,
          });
        }
      } else if (status === "cancelled") {
        // Either client or chef can cancel
        if (!isClient && !isChef) {
          return res.status(403).json({
            success: false,
            message: "You do not have permission to cancel this booking.",
          });
        }
      } else if (status === "pending") {
        // Bookings are pending by default. Reverting back is not allowed directly
        return res.status(403).json({
          success: false,
          message: "Cannot revert booking status back to pending.",
        });
      }
    }

    booking.status = status;
    const updatedBooking = await booking.save();

    // Create notification for the client
    await Notification.create({
      type: `booking_${status}`,
      title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your booking request has been ${status}.`,
      bookingId: updatedBooking._id,
      createdBy: userId,
      receiverId: booking.userId,
      receiverRole: "user",
    });

    const populatedBooking = await updatedBooking.populate([
      { path: "chefId", select: "-password -confirmPassword -refreshToken" },
      { path: "userId", select: "-password -confirmPassword -refreshToken" },
    ]);

    const formattedResponse = await formatBookingsWithChefInfo(populatedBooking);

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${status} successfully`,
      data: formattedResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update booking status",
      error: error.message,
    });
  }
};

// @desc    Get all bookings (Admin/Superadmin)
// @route   GET /api/v1/booking
// @access  Private (Admin/SuperAdmin only)
export const getAllBookings = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    if (userRole !== "admin" && userRole !== "superAdmin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin or SuperAdmin role required.",
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const bookings = await bookingModel
      .find({})
      .populate({
        path: "chefId",
        select: "-password -confirmPassword -refreshToken",
      })
      .populate({
        path: "userId",
        select: "-password -confirmPassword -refreshToken",
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const formattedBookings = await formatBookingsWithChefInfo(bookings);
    const total = await bookingModel.countDocuments();

    return res.status(200).json({
      success: true,
      message: "All bookings retrieved successfully",
      meta: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        limit,
      },
      data: formattedBookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve bookings",
      error: error.message,
    });
  }
};

// @desc    Update booking details (date, time, guests)
// @route   PATCH /api/v1/booking/:id/update-details
// @access  Private
export const updateBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { eventDate, arrivalTime, numberOfGuests } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID parameter",
      });
    }

    const booking = await bookingModel.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const isClient = booking.userId.toString() === userId.toString();
    const isAdmin = req.user?.role === "admin" || req.user?.role === "superAdmin";

    if (!isClient && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this booking.",
      });
    }

    // Process updates
    if (eventDate) {
      const bookingDate = new Date(eventDate);
      if (isNaN(bookingDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid event date format",
        });
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (bookingDate < today) {
        return res.status(400).json({
          success: false,
          message: "Booking date cannot be in the past",
        });
      }
      booking.eventDate = bookingDate;
    }

    if (arrivalTime) {
      booking.arrivalTime = arrivalTime;
    }

    if (numberOfGuests) {
      const guestCount = parseInt(numberOfGuests, 10);
      if (isNaN(guestCount) || guestCount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Number of guests must be a valid positive number",
        });
      }
      
      booking.numberOfGuests = guestCount;
      
      // Recalculating pricing:
      const chefProfile = await Profile.findOne({ userId: booking.chefId });
      if (chefProfile) {
        const minimumFee = chefProfile.minimumBookingAmount || 0;
        let perPersonRate = chefProfile.startingPricePerPerson || 0;
        let isCustomQuote = false;

        if (chefProfile.guestPricingTiers && chefProfile.guestPricingTiers.length > 0) {
          const applicableTier = chefProfile.guestPricingTiers.find((tier) => {
            const matchesMin = guestCount >= tier.minGuests;
            const matchesMax = tier.maxGuests ? guestCount <= tier.maxGuests : true;
            return matchesMin && matchesMax;
          });

          if (applicableTier) {
            if (applicableTier.isCustomQuote) {
              isCustomQuote = true;
            } else {
              perPersonRate = applicableTier.pricePerPerson || 0;
            }
          }
        }

        if (!isCustomQuote) {
          booking.totalAmount = minimumFee + guestCount * perPersonRate;
        }
      }
    }

    // Set status to pending if changes were made
    booking.status = "pending";

    const updatedBooking = await booking.save();

    await Notification.create({
      type: `booking_updated`,
      title: `Booking Updated`,
      message: `The booking details have been updated.`,
      bookingId: updatedBooking._id,
      createdBy: userId,
      receiverId: booking.chefId,
      receiverRole: "chef",
    });

    const populatedBooking = await updatedBooking.populate([
      { path: "chefId", select: "-password -confirmPassword -refreshToken" },
      { path: "userId", select: "-password -confirmPassword -refreshToken" },
    ]);

    const formattedResponse = await formatBookingsWithChefInfo(populatedBooking);

    return res.status(200).json({
      success: true,
      message: "Booking details updated successfully",
      data: formattedResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update booking details",
      error: error.message,
    });
  }
};

// @desc    Cancel a booking (Client/Chef/Admin)
// @route   PATCH /api/v1/booking/:id/cancel
// @access  Private
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID parameter",
      });
    }

    const booking = await bookingModel.findById(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const isClient = booking.userId.toString() === userId.toString();
    const isChef = booking.chefId.toString() === userId.toString();
    const isAdmin = req.user?.role === "admin" || req.user?.role === "superAdmin";

    if (!isClient && !isChef && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to cancel this booking.",
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Booking is already cancelled.",
      });
    }

    if (booking.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a completed booking.",
      });
    }

    booking.status = "cancelled";
    const updatedBooking = await booking.save();

    await Notification.create({
      type: "booking_cancelled",
      title: "Booking Cancelled",
      message: `A booking has been cancelled.`,
      bookingId: updatedBooking._id,
      createdBy: userId,
      receiverId: isClient ? booking.chefId : booking.userId,
      receiverRole: isClient ? "chef" : "user",
    });

    const populatedBooking = await updatedBooking.populate([
      { path: "chefId", select: "-password -confirmPassword -refreshToken" },
      { path: "userId", select: "-password -confirmPassword -refreshToken" },
    ]);

    const formattedResponse = await formatBookingsWithChefInfo(populatedBooking);

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: formattedResponse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
      error: error.message,
    });
  }
};
