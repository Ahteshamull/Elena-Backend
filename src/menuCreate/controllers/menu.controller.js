import mongoose from "mongoose";
import Menu from "../schema/menu.modal.js";
import userModel from "../../auth/schema/auth.modal.js";

// Create a new menu
export const createMenu = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Authentication required",
      });
    }

    const { menuTitle, menuCategory, numberOfCourse } = req.body;

    if (!menuTitle || !menuCategory || !numberOfCourse) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "menuTitle, menuCategory, and numberOfCourse are required",
      });
    }

    // Determine the menuImage path
    let menuImage = "";
    if (req.file) {
      menuImage = `/uploads/${req.file.filename}`;
    } else if (req.files && req.files.menuImage && req.files.menuImage[0]) {
      menuImage = `/uploads/${req.files.menuImage[0].filename}`;
    } else if (req.body.menuImage) {
      menuImage = req.body.menuImage;
    }

    if (!menuImage) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "menuImage is required",
      });
    }

    const newMenu = new Menu({
      userId,
      menuTitle,
      menuImage,
      menuCategory,
      numberOfCourse: Number(numberOfCourse),
    });

    await newMenu.save();

    return res.status(201).json({
      success: true,
      message: "Menu created successfully and associated with your profile",
      data: newMenu,
    });
  } catch (error) {
    console.error("Error creating menu:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || "Failed to create menu",
    });
  }
};

// Get all menus of the logged-in user
export const getMyMenus = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Authentication required",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search;

    const query = { userId };
    if (search) {
      query.$or = [
        { menuTitle: { $regex: search, $options: "i" } },
        { menuCategory: { $regex: search, $options: "i" } }
      ];
    }

    const total = await Menu.countDocuments(query);
    const menus = await Menu.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      meta: {
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
        limit,
      },
      data: menus,
    });
  } catch (error) {
    console.error("Error getting user menus:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || "Failed to retrieve your menus",
    });
  }
};

// Get menus of a specific chef/user by userId
export const getMenusByUserId = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "User ID parameter is required",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search;

    const query = { userId: id };
    if (search) {
      query.$or = [
        { menuTitle: { $regex: search, $options: "i" } },
        { menuCategory: { $regex: search, $options: "i" } }
      ];
    }

    const total = await Menu.countDocuments(query);
    const menus = await Menu.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      meta: {
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
        limit,
      },
      data: menus,
    });
  } catch (error) {
    console.error("Error getting menus by user ID:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || "Failed to retrieve menus",
    });
  }
};

// Update a menu (Only owner can update)
export const updateMenu = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Authentication required",
      });
    }

    const menu = await Menu.findById(id);

    if (!menu) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Menu not found",
      });
    }

    // Authorization check
    if (menu.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: true,
        message: "Access denied. You can only update your own menus.",
      });
    }

    const { menuTitle, menuCategory, numberOfCourse } = req.body;

    const updateData = {};
    if (menuTitle !== undefined) updateData.menuTitle = menuTitle;
    if (menuCategory !== undefined) updateData.menuCategory = menuCategory;
    if (numberOfCourse !== undefined) updateData.numberOfCourse = Number(numberOfCourse);

    // Determine the menuImage path if updated
    if (req.file) {
      updateData.menuImage = `/uploads/${req.file.filename}`;
    } else if (req.files && req.files.menuImage && req.files.menuImage[0]) {
      updateData.menuImage = `/uploads/${req.files.menuImage[0].filename}`;
    } else if (req.body.menuImage !== undefined) {
      updateData.menuImage = req.body.menuImage;
    }

    const updatedMenu = await Menu.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Menu updated successfully",
      data: updatedMenu,
    });
  } catch (error) {
    console.error("Error updating menu:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || "Failed to update menu",
    });
  }
};

// Delete a menu (Only owner can delete)
export const deleteMenu = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Authentication required",
      });
    }

    const menu = await Menu.findById(id);

    if (!menu) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Menu not found",
      });
    }

    // Authorization check
    if (menu.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: true,
        message: "Access denied. You can only delete your own menus.",
      });
    }

    await Menu.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Menu deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting menu:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || "Failed to delete menu",
    });
  }
};
