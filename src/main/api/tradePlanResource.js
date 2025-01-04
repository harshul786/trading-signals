const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const TradePlan = require("../model/tradePlan");

// pairs: {
//   firstPair: {
//     symbol,
//     contractAddress,
//   },
//   secondPair: {
//     symbol,
//     contractAddress,
//   },
// },
// Create a new trade plan
router.post("/", auth, async (req, res) => {
  try {
    const { pairs, selectedTimeframe } = req.body;

    const user = req.user;

    if (user.topUpVerified === false) {
      return res.status(400).json({
        error: "User has not verified top-up. Please verify top-up first.",
      });
    }

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

// Pause a trade plan
router.put("/:id/pause", auth, async (req, res) => {
  try {
    const tradePlan = await TradePlan.findById(req.params.id);
    if (!tradePlan) {
      return res.status(404).json({ error: "Trade plan not found" });
    }

    tradePlan.status = "INACTIVE";
    tradePlan.lastModifiedDate = new Date();
    await tradePlan.save();
    res.json(tradePlan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Resume a trade plan
router.put("/:id/resume", auth, async (req, res) => {
  try {
    const tradePlan = await TradePlan.findById(req.params.id);
    if (!tradePlan) {
      return res.status(404).json({ error: "Trade plan not found" });
    }

    if (req.user.topUpVerified === false) {
      return res.status(400).json({
        error: "User has not verified top-up. Please verify top-up first.",
      });
    }

    tradePlan.status = "ACTIVE";
    tradePlan.lastModifiedDate = new Date();
    await tradePlan.save();
    res.json(tradePlan);
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
router.get("/", async (req, res) => {
  try {
    const { timeframe } = req.query;
    const tradePlans = await TradePlan.find({
      selectedTimeframe: timeframe,
    }).populate("userId");
    res.json(tradePlans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
