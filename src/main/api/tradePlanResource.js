const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const TradePlan = require("../model/tradePlan");

//       pairs: {
//         firstPair: {
//           symbol,
//           contractAddress,
//         },
//         secondPair: {
//           symbol,
//           contractAddress,
//         },
//       },
// Create a new trade plan
router.post("/", auth, async (req, res) => {
  try {
    const { pairs, selectedTimeframe } = req.body;

    const tradePlan = new TradePlan({
      userId: req.user._id,
      pairs,
      selectedTimeframe,
      creationDate: new Date(),
      lastModifiedDate: new Date(),
    });

    await tradePlan.save();
    res.status(201).json(tradePlan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all trade plans by user ID
router.get("/user", async (req, res) => {
  try {
    const { userId } = req.query;
    const tradePlans = await TradePlan.find({ userId: userId });
    res.json(tradePlans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//  Get all trade plans by timeframe
router.get("/timeframe", async (req, res) => {
  try {
    const { timeframe } = req.query;
    const tradePlans = await TradePlan.find({ selectedTimeframe: timeframe });
    res.json(tradePlans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
