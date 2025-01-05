const express = require("express");
const Trade = require("../model/trade");
const auth = require("../middleware/auth");
const { calculateProfit } = require("../utils/tradeUtils");
const User = require("../model/user");
const { sendTelegramNotification } = require("../utils/telegram");
const router = express.Router();
const moment = require("moment-timezone");

// Create a new trade
router.post("/", async (req, res) => {
  try {
    const {
      pair,
      currentSymbol,
      expectedExecutionPrice,
      slippage,
      creationDate,
      type,
      userId,
      planId,
      timeFrame,
    } = req.body;

    const trade = new Trade({
      userId,
      expectedExecutionPrice: expectedExecutionPrice,
      amount: 0,
      fee: 0,
      expectedSlippage: slippage,
      status: "PENDING",
      type: type,
      creationDate,
      lastModifiedDate: new Date(),
      planId,
      timeFrame,
      symbols: {
        pair: pair,
        current: currentSymbol,
      },
    });

    const user = await User.findById(trade.userId);
    sendTelegramNotification(`📈 *New Trade Created* 📈
      *Trade ID:* ${trade._id}
      *Pair:* ${pair}
      *Type:* ${type}
      *Expected Price:* ${expectedExecutionPrice}
      *Slippage:* ${slippage}
      *User ID:* ${user.email}
      *Date:* ${moment(creationDate)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD HH:mm:ss")}`);

    await trade.save();
    res.status(201).json(trade);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all trades
router.get("/", async (req, res) => {
  try {
    const trades = await Trade.find();
    res.json(trades);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single trade by ID
router.get("/:id", async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);
    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }
    res.json(trade);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a trade by ID
router.put("/:id/success", async (req, res) => {
  try {
    const {
      actualExecutionPrice,
      actualSlippage,
      fee,
      amount,
      transactionSignature,
    } = req.body;
    let trade = await Trade.findById(req.params.id);
    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }
    trade.actualExecutionPrice = actualExecutionPrice;
    trade.actualSlippage = actualSlippage;
    trade.transactionSignature = transactionSignature;
    trade.fee += fee;
    trade.amount = amount;
    trade.status = "SUCCESS";
    trade.lastModifiedDate = new Date();
    trade = await trade.save();
    const user = await User.findById(trade.userId);
    const msg = `🎉 *Trade Success* 🎉
      *Trade ID:* ${trade._id}
      *Pair:* ${trade.symbols.pair}
      *Type:* ${trade.type}
      *Amount:* ${trade.amount}
      *Expected Price:* ${trade.expectedExecutionPrice}
      *Actual Price:* ${trade.actualExecutionPrice}
      *User:* ${user.email}
      *Date:* ${moment(trade.creationDate)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD HH:mm:ss")}`;

    if (trade.type === "SELL") {
      const lastBuy = await Trade.findOne({
        userId: trade.userId,
        type: "BUY",
        "symbols.pair": trade.symbols.pair,
      }).sort({ creationDate: -1 });

      if (lastBuy) {
        // calculate profit
        const profit =
          trade.actualExecutionPrice - lastBuy.actualExecutionPrice - trade.fee;
        const profitPercentage = (profit / lastBuy.actualExecutionPrice) * 100;
        const expectedProfit =
          trade.expectedExecutionPrice -
          lastBuy.expectedExecutionPrice -
          trade.fee;
        const expectedProfitPercentage =
          (expectedProfit / lastBuy.expectedExecutionPrice) * 100;
        msg += `
      *Profit:* ${profit.toFixed(2)} (${profitPercentage.toFixed(2)}%)
      *Expected Profit:* ${expectedProfit.toFixed(
        2
      )} (${expectedProfitPercentage.toFixed(2)}%)`;
      } else {
        // Handle case when no previous buy trade is found
        msg += `
      *Profit:* N/A
      *Expected Profit:* N/A`;
      }
    }
    sendTelegramNotification(msg);
    res.json(trade);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:id/pending", async (req, res) => {
  try {
    const { fee, transactionSignature } = req.body;
    const trade = await Trade.findById(req.params.id);
    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }
    trade.status = "PENDING";
    trade.lastModifiedDate = new Date();
    trade.fee += fee;
    trade.transactionSignature = transactionSignature;
    await trade.save();
    res.json(trade);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:id/fail", async (req, res) => {
  try {
    const { fee, transactionSignature } = req.body;
    const trade = await Trade.findById(req.params.id);
    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }
    trade.status = "FAILURE";
    trade.fee += fee;
    trade.transactionSignature = transactionSignature;
    trade.lastModifiedDate = new Date();
    await trade.save();

    const user = await User.findById(trade.userId);
    sendTelegramNotification(` 🚫 *Trade Failure* 🚫
      *Trade ID:* ${trade._id}
      *Pair:* ${trade.symbols.pair}
      *Type:* ${trade.type}
      *Amount:* ${trade.amount}
      *Expected Price:* ${trade.expectedExecutionPrice}
      *User:* ${user.email}
      *Date:* ${moment(trade.lastModifiedDate)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD HH:mm:ss")}`);
    res.json(trade);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a trade by ID
// router.delete("/:id", async (req, res) => {
//   try {
//     const trade = await Trade.findByIdAndDelete(req.params.id);
//     if (!trade) {
//       return res.status(404).json({ error: "Trade not found" });
//     }
//     res.json({ message: "Trade deleted successfully" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

router.post("/calculate-profit", auth, async (req, res) => {
  try {
    const { startTradeId, endTradeId } = req.body;
    const userId = req.user._id;

    if (!userId) {
      return res
        .status(400)
        .json({ error: "Missing required parameter: userId" });
    }

    // Fetch all trades for the user to find extremes if necessary
    const allTrades = await Trade.find({ userId }).sort({ creationDate: 1 });

    if (allTrades.length === 0) {
      return res.status(404).json({ error: "No trades found for the user" });
    }

    // Determine the start and end trade IDs
    const startTrade = startTradeId
      ? await Trade.findById(startTradeId)
      : allTrades[0];
    const endTrade = endTradeId
      ? await Trade.findById(endTradeId)
      : allTrades[allTrades.length - 1];

    if (!startTrade || !endTrade) {
      return res
        .status(400)
        .json({ error: "Invalid trade IDs provided or trades not found" });
    }

    // Fetch trades within the range
    const trades = await Trade.find({
      userId,
      _id: { $gte: startTrade._id, $lte: endTrade._id },
    }).sort({ creationDate: 1 });

    if (trades.length === 0) {
      return res
        .status(404)
        .json({ error: "No trades found in the specified range" });
    }

    const initialBalance = trades[0].amount; // Get initial balance from the first trade
    const { finalBalance, totalTrades, totalWins, totalLosses, totalProfit } =
      calculateProfit(trades, initialBalance);

    res.json({
      userId,
      solWalletAddress: req.user.solWalletAddress,
      startTradeId: startTrade._id,
      endTradeId: endTrade._id,
      initialBalance: initialBalance.toFixed(2),
      finalBalance: finalBalance.toFixed(2),
      totalTrades,
      totalWins,
      totalLosses,
      totalProfit: totalProfit.toFixed(2),
    });
  } catch (error) {
    console.error("Error in /api/calculate-profit:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
