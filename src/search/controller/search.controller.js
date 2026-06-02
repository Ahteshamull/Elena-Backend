import User from "../../auth/schema/auth.modal.js";

const globalSearch = async (req, res) => {
  try {
    const {
      query,
      page = 1,
      limit = 10,
      searchType = "all", // all, users
    } = req.query;

    const searchRegex = query ? { $regex: query, $options: "i" } : null;
    const results = {
      users: [],
      pagination: {
        currentPage: parseInt(page),
        totalPages: 1,
        total: 0,
        limit: parseInt(limit),
      },
    };

    // Search Users
    if (searchType === "all" || searchType === "users") {
      const userFilter = {};
      if (query) {
        userFilter.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { userName: searchRegex },
          { aboutMe: searchRegex },
          { city: searchRegex },
          { country: searchRegex },
        ];
      }

      const users = await User.find(userFilter)
        .select("name email userName role city country aboutMe image createdAt")
        .lean();

      // Apply pagination
      const paginatedUsers = users.slice((page - 1) * limit, page * limit);
      results.users = paginatedUsers;
      results.pagination.total = users.length;
      results.pagination.totalPages = Math.ceil(users.length / limit);
    }

    // Calculate total results
    const total = results.users.length;
    results.pagination.total = total;
    results.pagination.totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      error: false,
      message: "Search completed successfully",
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error during search",
      error: error.message,
    });
  }
};

const specificSearch = async (req, res) => {
  try {
    const {
      query: collection = "all", // users | all
      searchType: keyword = "", // actual search text
    } = req.query;

    // ✅ validate collection
    const validCollections = [
      "all",
      "users",
      "user", // singular form
    ];
    let actualCollection = validCollections.includes(collection)
      ? collection
      : "all";

    // If collection is invalid, fallback to the keyword as collection if it's valid
    if (collection !== actualCollection && validCollections.includes(keyword)) {
      actualCollection = keyword;
    }

    const searchRegex = keyword ? { $regex: keyword, $options: "i" } : null;

    const results = {
      users: [],
    };

    // 👤 USERS - search if collection is "users" or "all"
    if (actualCollection === "users" || actualCollection === "all" || actualCollection === "user") {
      const users = await User.find({})
        .select("name email phone role image createdAt")
        .sort({ createdAt: -1 })
        .lean();

      // Filter users in JavaScript after population
      const filteredUsers = users.filter((user) => {
        if (!keyword) return true;

        const searchTerm = keyword.toLowerCase();

        return (
          (user.name && user.name.toLowerCase().includes(searchTerm)) ||
          (user.email && user.email.toLowerCase().includes(searchTerm)) ||
          (user.phone && user.phone.toLowerCase().includes(searchTerm))
        );
      });

      results.users = filteredUsers;
    }

    res.status(200).json({
      success: true,
      error: false,
      message: "Specific search completed successfully",
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: true,
      message: "Error during specific search",
      error: error.message,
    });
  }
};

export { globalSearch, specificSearch };
