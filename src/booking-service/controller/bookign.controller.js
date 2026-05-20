import bookingModel from "../schema/booking.modal.js";
import serviceModel from "../../service/schema/service.modal.js";
import businessModel from "../../buisness/schema/buisness.modal.js";
import { createNotification } from "../../notification/service/notification.service.js";

export const createBooking = async (req, res) => {
  try {
    const { bookings } = req.body; // Expecting an array of { serviceId, bookingDate, from, to }
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User ID not found",
      });
    }

    if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid request: 'bookings' must be a non-empty array",
      });
    }

    const preparedBookings = [];
    const notificationsToCreate = [];

    // 1. Validate all bookings first
    for (const item of bookings) {
      const { serviceId, bookingDate, from, to, fullName, phoneNumber, notes, seatNumber } = item;

      // Get service details
      const service = await serviceModel.findById(serviceId).populate({
        path: "serviceProviderId",
        populate: { path: "subscriptionId" }
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: `Service not found for ID: ${serviceId}`,
        });
      }

      // --- Provider Subscription Booking Limit Check ---
      const provider = service.serviceProviderId;
      if (provider && provider.subscriptionId) {
        const subscription = provider.subscriptionId;
        if (subscription.maxBookings !== -1) {
          const totalProviderBookings = await bookingModel.countDocuments({
            serviceProviderId: provider._id,
            status: { $ne: "cancelled" }
          });
          
          if (totalProviderBookings >= subscription.maxBookings) {
            return res.status(403).json({
              success: false,
              message: `This provider has reached their booking limit for their current plan.`,
              providerLimitReached: true
            });
          }
        }
      }
      // -------------------------------------------------

      // Check if the requested date exists in service availability
      const dateAvailability = service.availability.find(
        (a) => a.date === bookingDate,
      );
      if (!dateAvailability) {
        return res.status(400).json({
          success: false,
          message: `Date ${bookingDate} is not available for service "${service.serviceName}"`,
        });
      }

      // Check if the specific from/to slot exists for that date
      const slotExists = dateAvailability.slots.find(
        (s) => s.from === from && s.to === to,
      );
      if (!slotExists) {
        return res.status(400).json({
          success: false,
          message: `Slot ${from} - ${to} is not available on ${bookingDate} for service "${service.serviceName}"`,
        });
      }

      // 1. Check if THIS USER already booked this exact slot
      const alreadyBookedByUser = await bookingModel.findOne({
        userId,
        serviceId,
        bookingDate,
        from,
        to,
        status: { $ne: "cancelled" },
      });

      if (alreadyBookedByUser) {
        return res.status(400).json({
          success: false,
          message: `You have already booked the slot ${from} - ${to} on ${bookingDate}`,
        });
      }

      // 2. Check total availability for this slot
      const existingBookingsCount = await bookingModel.countDocuments({
        serviceId,
        bookingDate,
        from,
        to,
        status: { $ne: "cancelled" },
      });

      const maxSeats = parseInt(dateAvailability.availableSeats) || 1;

      if (existingBookingsCount >= maxSeats) {
        return res.status(400).json({
          success: false,
          message: `Slot ${from} - ${to} on ${bookingDate} for "${service.serviceName}" is already fully booked`,
        });
      }

      // Prepare data for creation
      preparedBookings.push({
        userId,
        serviceId,
        businessId: service.selectBusiness,
        serviceProviderId: service.serviceProviderId,
        bookingDate,
        from,
        to,
        fullName,
        phoneNumber,
        notes,
        seatNumber,
        status: "pending",
      });

      // Prepare notification data
      notificationsToCreate.push({
        type: "new_booking",
        title: "New Booking Request",
        message: `You have a new booking request for "${service.serviceName}" on ${bookingDate} at ${from} - ${to}`,
        receiverId: service.serviceProviderId,
        createdBy: userId,
        receiverRole: "provider",
      });
    }

    // 2. If all validations pass, create bookings
    const createdBookings = await bookingModel.insertMany(preparedBookings);

    // 3. Create notifications
    for (const notify of notificationsToCreate) {
      await createNotification(
        notify.type,
        notify.title,
        notify.message,
        null,
        notify.createdBy,
        notify.receiverRole,
        notify.receiverId,
      );
    }

    // 4. Fetch populated details for the response
    const createdIds = createdBookings.map((b) => b._id);
    const populatedBookings = await bookingModel
      .find({ _id: { $in: createdIds } })
      .populate("userId", "userName email image")
      .populate("serviceId")
      .populate("businessId")
      .populate("serviceProviderId", "userName email image");

    return res.status(201).json({
      success: true,
      message: `${createdBookings.length} booking(s) requested successfully. Waiting for provider approval.`,
      data: populatedBookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create booking(s)",
      error: error.message,
    });
  }
};

/**
 * Update booking status (Accept/Cancel)
 * Only for serviceProvider
 */
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'confirmed' or 'cancelled'
    const requesterId = req.user?.id || req.user?._id;

    if (!["confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'confirmed' or 'cancelled'",
      });
    }

    const booking = await bookingModel.findById(id).populate("serviceId");
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const isProvider = booking.serviceProviderId.toString() === requesterId.toString();
    const isUser = booking.userId.toString() === requesterId.toString();

    // Verify permission
    if (!isProvider && !isUser) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You don't have permission to update this booking",
      });
    }

    // Only provider can confirm
    if (status === "confirmed" && !isProvider) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Only the service provider can confirm a booking",
      });
    }

    // If it's already cancelled or confirmed, prevent redundant updates if needed
    // But usually, updating from pending to confirmed/cancelled is what we want.

    booking.status = status;
    await booking.save();

    // Notify the other party
    let receiverId;
    let message;
    let title;

    if (isProvider) {
      receiverId = booking.userId;
      title = `Booking ${status === "confirmed" ? "Confirmed" : "Cancelled"}`;
      message = `Your booking for "${booking.serviceId.serviceName}" on ${booking.bookingDate} at ${booking.from} - ${booking.to} has been ${status} by the provider`;
    } else {
      receiverId = booking.serviceProviderId;
      title = "Booking Cancelled by User";
      message = `The booking for "${booking.serviceId.serviceName}" on ${booking.bookingDate} at ${booking.from} - ${booking.to} has been cancelled by the user`;
    }

    await createNotification(
      "booking_status_updated",
      title,
      message,
      null,
      requesterId,
      isProvider ? "user" : "provider",
      receiverId,
    );

    // Fetch populated booking details for the response
    const populatedBooking = await bookingModel
      .findById(booking._id)
      .populate("userId", "userName email image")
      .populate("serviceId")
      .populate("businessId")
      .populate("serviceProviderId", "userName email image");

    return res.status(200).json({
      success: true,
      message: `Booking ${status} successfully`,
      data: populatedBooking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update booking status",
      error: error.message,
    });
  }
};

/**
 * Get only pending bookings for the logged-in provider
 */
export const getMyPendingBookings = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {
      serviceProviderId: userId,
      status: "pending",
    };

    const totalBookings = await bookingModel.countDocuments(query);
    const bookings = await bookingModel
      .find(query)
      .populate("userId", "userName email image")
      .populate("serviceId")
      .populate("businessId")
      .populate("serviceProviderId", "userName email image")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Pending bookings retrieved successfully",
      meta: {
        currentPage: page,
        totalPages: Math.ceil(totalBookings / limit),
        totalBookings,
        limit,
      },
      data: bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve pending bookings",
      error: error.message,
    });
  }
};

/**
 * Get bookings for the logged-in user
 * Can be used by both User (to see their bookings) and Provider (to see bookings they received)
 */
export const getMyBookings = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { role } = req.query; // optional: 'user' or 'provider'
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    if (role === "provider") {
      query.serviceProviderId = userId;
    } else if (role === "user") {
      query.userId = userId;
    } else {
      // Default: Show where user is either customer or provider
      query = { $or: [{ userId: userId }, { serviceProviderId: userId }] };
    }

    const totalBookings = await bookingModel.countDocuments(query);
    const bookings = await bookingModel
      .find(query)
      .populate("userId", "userName email image")
      .populate("serviceId")
      .populate("businessId")
      .populate("serviceProviderId", "userName email image")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Bookings retrieved successfully",
      meta: {
        currentPage: page,
        totalPages: Math.ceil(totalBookings / limit),
        totalBookings,
        limit,
      },
      data: bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve bookings",
      error: error.message,
    });
  }
};

/**
 * Get a single booking by ID
 */
export const getSingleBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await bookingModel
      .findById(id)
      .populate("userId", "userName email image")
      .populate("serviceId")
      .populate("businessId")
      .populate("serviceProviderId", "userName email image");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking retrieved successfully",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve booking",
      error: error.message,
    });
  }
};

/**
 * Get all bookings (Admin only)
 */
export const getAllBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalBookings = await bookingModel.countDocuments();
    const bookings = await bookingModel
      .find()
      .populate("userId", "userName email image")
      .populate("serviceId")
      .populate("businessId")
      .populate("serviceProviderId", "userName email image")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "All bookings retrieved successfully",
      meta: {
        currentPage: page,
        totalPages: Math.ceil(totalBookings / limit),
        totalBookings,
        limit,
      },
      data: bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve all bookings",
      error: error.message,
    });
  }
};