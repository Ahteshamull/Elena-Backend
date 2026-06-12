const fs = require('fs'); 
const path = 'c:/Users/ahtes/Office ST/Elena_Backend/src/payment/controller/payment.controller.js'; 
let content = fs.readFileSync(path, 'utf8'); 

const startIdx = content.indexOf('export const userSpendingGrowth = async (req, res) => {'); 
const endIdx = content.indexOf('export const adminEarnings = async (req, res) => {'); 

if(startIdx !== -1 && endIdx !== -1) { 
  const newContent = content.substring(0, startIdx) + 
`export const userSpendingGrowth = async (req, res) => {
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

` + content.substring(endIdx); 
  
  fs.writeFileSync(path, newContent); 
  console.log('Fixed file successfully'); 
} else { 
  console.log('Target blocks not found in file'); 
}
