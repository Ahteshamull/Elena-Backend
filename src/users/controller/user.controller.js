import userModel from "../../auth/schema/auth.modal.js";
import favoriteModel from "../../auth/schema/favorite.modal.js";
import fs from "fs";
import path from "path";

export const allUser = async (req, res) => {
  try {
    const { role } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (role) {
      filter.role = role;
    }

    const totalUsers = await userModel.countDocuments(filter);

    const users = await userModel
      .find(filter)
      .select("-password -confirmPassword")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalPages = Math.ceil(totalUsers / limit);

    return res.status(200).json({
      success: true,
      message: role
        ? `${role.charAt(0).toUpperCase() + role.slice(1)}s retrieved successfully`
        : "All users retrieved successfully",
      meta: {
        currentPage: page,
        totalPages,
        totalUsers,
        limit,
      },
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve users",
      error: error.message,
    });
  }
};

export const singleUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const userData = await userModel
      .findById(id)
      .select("-password -confirmPassword -refreshToken");

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /* =========================
       5. Response
    ========================= */
    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: userData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user",
      error: error.message,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || req.user?._id || req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID not found in token",
      });
    }

    const {
      userName,
      email,
      phone,
      dateOfBirth,
      country,
      image,
    } = req.body;

    const existingUser = await userModel.findById(userId);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updateData = {};
    let hasChanges = false;

    // Check mapping since the UI uses Full Name -> userName
    if (userName !== undefined && userName.trim() !== existingUser.userName) {
      const duplicate = await userModel.findOne({ userName: userName.trim(), _id: { $ne: userId } });
      if (duplicate) {
        return res.status(409).json({ success: false, message: "This Name is already taken." });
      }
      updateData.userName = userName.trim();
      hasChanges = true;
    }

    if (email !== undefined && email.toLowerCase().trim() !== existingUser.email) {
      const duplicate = await userModel.findOne({ email: email.toLowerCase().trim(), _id: { $ne: userId } });
      if (duplicate) {
        return res.status(409).json({ success: false, message: "This Email is already in use." });
      }
      updateData.email = email.toLowerCase().trim();
      hasChanges = true;
    }

    if (phone !== undefined && phone !== existingUser.phone) {
      updateData.phone = phone;
      hasChanges = true;
    }

    if (dateOfBirth !== undefined && dateOfBirth !== existingUser.dateOfBirth) {
      updateData.dateOfBirth = dateOfBirth;
      hasChanges = true;
    }

    if (country !== undefined && country !== existingUser.country) {
      updateData.country = country;
      hasChanges = true;
    }



    // Image upload handling
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
      hasChanges = true;
    } else if (image !== undefined && image !== existingUser.image) {
      updateData.image = image;
      hasChanges = true;
    }

    if (!hasChanges) {
      return res.status(200).json({
        success: true,
        message: "No changes detected",
        data: existingUser,
      });
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password -confirmPassword -refreshToken");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

export const userGrowth = async (req, res) => {
  try {
    const { period = "monthly", year } = req.query;

    // Determine date range based on period
    const currentDate = new Date();
    let startDate, groupFormat, pipeline;

    if (period === "daily") {
      startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - 30); // Last 30 days
      groupFormat = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
    } else if (period === "weekly") {
      startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - 12 * 7); // Last 12 weeks
      groupFormat = {
        year: { $year: "$createdAt" },
        week: { $week: "$createdAt" },
      };
    } else if (period === "yearly") {
      startDate = new Date(currentDate);
      startDate.setFullYear(startDate.getFullYear() - 5); // Last 5 years
      groupFormat = {
        year: { $year: "$createdAt" },
      };
    } else {
      // Default to monthly
      startDate = new Date(currentDate);
      startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
      groupFormat = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      };
    }

    // Filter by specific year if provided
    if (year) {
      const yearNum = parseInt(year);
      startDate = new Date(yearNum, 0, 1);
      const endDate = new Date(yearNum, 11, 31);

      pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
      ];
    } else {
      pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
      ];
    }

    // Add grouping stage
    pipeline.push({
      $group: {
        _id: groupFormat,
        count: { $sum: 1 },
        users: {
          $sum: {
            $cond: [{ $eq: ["$role", "user"] }, 1, 0],
          },
        },
        chefs: {
          $sum: {
            $cond: [{ $eq: ["$role", "chef"] }, 1, 0],
          },
        },
      },
    });

    // Add sorting stage
    if (period === "daily") {
      pipeline.push({ $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } });
    } else if (period === "weekly") {
      pipeline.push({ $sort: { "_id.year": 1, "_id.week": 1 } });
    } else if (period === "yearly") {
      pipeline.push({ $sort: { "_id.year": 1 } });
    } else {
      pipeline.push({ $sort: { "_id.year": 1, "_id.month": 1 } });
    }

    const growthData = await userModel.aggregate(pipeline);

    // Calculate cumulative growth
    let cumulativeCount = 0;
    const formattedData = growthData.map((item) => {
      cumulativeCount += item.count;

      let periodLabel;
      if (period === "daily") {
        periodLabel = `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`;
      } else if (period === "weekly") {
        periodLabel = `Week ${item._id.week} ${item._id.year}`;
      } else if (period === "yearly") {
        periodLabel = item._id.year.toString();
      } else {
        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        periodLabel = `${monthNames[item._id.month - 1]} ${item._id.year}`;
      }

      return {
        period: periodLabel,
        newUsers: item.count,
        cumulativeUsers: cumulativeCount,
        users: item.users,
        chefs: item.chefs,
        rawData: item._id,
      };
    });

    // Get overall stats
    const totalUsersCount = await userModel.countDocuments();
    const totalUsers = await userModel.countDocuments({ role: "user" });
    const totalChefs = await userModel.countDocuments({
      role: "chef",
    });

    return res.status(200).json({
      success: true,
      message: "User growth data retrieved successfully",
      data: {
        period,
        growthData: formattedData,
        summary: {
          totalUsers: totalUsersCount,
          users: totalUsers,
          chefs: totalChefs,
          growthRate:
            formattedData.length > 1
              ? (
                  ((formattedData[formattedData.length - 1].newUsers -
                    formattedData[0].newUsers) /
                    formattedData[0].newUsers) *
                  100
                ).toFixed(2)
              : 0,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user growth data",
      error: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate user ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const existingUser = await userModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (existingUser.image) {
      // Remove leading slash so path.join works correctly on all OS
      const imageRelativePath = existingUser.image.startsWith('/') 
        ? existingUser.image.substring(1) 
        : existingUser.image;
        
      const imagePath = path.join(process.cwd(), imageRelativePath);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await userModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const existingUser = await userModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Toggle the status
    const newStatus = existingUser.status === "blocked" ? "active" : "blocked";
    existingUser.status = newStatus;
    
    await existingUser.save();

    return res.status(200).json({
      success: true,
      message: `User ${newStatus === "blocked" ? "blocked" : "unblocked"} successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: error.message,
    });
  }
};

export const allBlockedUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { status: "blocked" };

    const totalBlockedUsers = await userModel.countDocuments(filter);

    const blockedUsers = await userModel
      .find(filter)
      .select("-password -confirmPassword -refreshToken")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalPages = Math.ceil(totalBlockedUsers / limit);

    return res.status(200).json({
      success: true,
      message: "Blocked users retrieved successfully",
      meta: {
        currentPage: page,
        totalPages,
        totalUsers: totalBlockedUsers,
        limit,
      },
      data: blockedUsers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve blocked users",
      error: error.message,
    });
  }
};

export const approveChef = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const existingUser = await userModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (existingUser.role !== "chef") {
      return res.status(400).json({
        success: false,
        message: "Only chefs require approval",
      });
    }

    // Toggle approval status
    existingUser.isApprovedByAdmin = !existingUser.isApprovedByAdmin;
    await existingUser.save();

    return res.status(200).json({
      success: true,
      message: `Chef ${existingUser.isApprovedByAdmin ? "approved" : "disapproved"} successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update approval status",
      error: error.message,
    });
  }
};

export const createFavorite = async (req, res) => {
  try {
    // Get user ID from token
    const userId = req.user?.id || req.user?._id;
    // Get favorited user ID from request parameters
    const { favoritedUserId } = req.params;

    if (!userId || !favoritedUserId) {
      return res.status(400).json({
        success: false,
        message:
          "User authentication required and favorited user ID parameter is required",
      });
    }

    // Verify chef exists and has role 'chef'
    const chef = await userModel.findById(favoritedUserId);
    if (!chef) {
      return res.status(404).json({
        success: false,
        message: "Chef not found",
      });
    }

    if (chef.role !== "chef") {
      return res.status(400).json({
        success: false,
        message: "You can only favorite a user with 'chef' role",
      });
    }

    // Check if already favorited
    const existingFavorite = await favoriteModel.findOne({
      myId: userId,
      favoritedUserId,
    });

    if (existingFavorite) {
      // Remove from favorites
      await favoriteModel.deleteOne({ _id: existingFavorite._id });
      return res.status(200).json({
        success: true,
        message: "User removed from favorites successfully",
      });
    } else {
      // Add to favorites
      const favorite = new favoriteModel({
        myId: userId,
        favoritedUserId,
      });

      await favorite.save();
      await favorite.populate({
        path: "favoritedUserId",
        select: "-password -confirmPassword -refreshToken",
      });
      return res.status(201).json({
        success: true,
        message: "User added to favorites successfully",
        data: favorite,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error toggling favorite",
      error: error.message,
    });
  }
};

export const getMyFavoriteUsers = async (req, res) => {
  try {
    // Get user ID from token
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User authentication required",
      });
    }

    // Get all favorite users
    const favorites = await favoriteModel
      .find({ myId: userId })
      .populate({
        path: "favoritedUserId",
        select: "-password -confirmPassword -refreshToken",
      });

    // Extract user data and add isFavoritedByMe field
    const favoriteUsers = favorites
      .filter((fav) => fav.favoritedUserId)
      .map((fav) => {
        const user = fav.favoritedUserId.toObject();
        user.isFavoritedByMe = true;
        return user;
      });

    return res.status(200).json({
      success: true,
      message: "Favorite users retrieved successfully",
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalUsers: favoriteUsers.length,
        limit: favoriteUsers.length,
      },
      data: favoriteUsers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error retrieving favorite users",
      error: error.message,
    });
  }
};
