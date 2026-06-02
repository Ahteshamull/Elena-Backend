import Notification from "../schema/notification.modal.js";

const listNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, isRead } = req.query;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User ID not found",
      });
    }

    let filter = { receiverId: userId };

    if (req.user?.role === "admin" || req.user?.role === "superAdmin") {
      filter = {
        $or: [
          { receiverId: userId },
          { receiverRole: "admin" }
        ]
      };
    }

    if (isRead !== undefined) {
      filter.isRead = isRead === "true";
    }

    const notifications = await Notification.find(filter)
      .populate("createdBy", "userName email image")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      meta: {
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
      },
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message,
    });
  }
};

const markNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { isRead } = req.body;
    const userId = req.user?.id || req.user?._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, receiverId: userId },
      { isRead },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or unauthorized",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification updated successfully",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating notification",
      error: error.message,
    });
  }
};

const markAllNotifications = async (req, res) => {
  try {
    const { isRead } = req.body;
    const userId = req.user?.id || req.user?._id;

    await Notification.updateMany({ receiverId: userId }, { isRead });

    res.status(200).json({
      success: true,
      message: `All notifications marked as ${isRead ? "read" : "unread"}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating notifications",
      error: error.message,
    });
  }
};

export {
  listNotifications,
  markNotification,
  markAllNotifications,
};
