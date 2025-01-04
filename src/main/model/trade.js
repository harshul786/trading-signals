const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema({
  expectedExecutionPrice: {
    type: Number,
    required: true,
  },
  actualExecutionPrice: {
    type: Number,
    required: false,
  },
  amount: {
    type: Number,
    required: true, // Amount of the current symbol
  },
  expectedSlippage: {
    type: Number,
    required: true,
  },
  actualSlippage: {
    type: Number,
    required: false,
  },
  fee: {
    type: Number,
    required: false,
  },
  status: {
    type: String,
    enum: ["PENDING", "SUCCESS", "FAILURE"],
    required: true,
  },
  type: {
    type: String,
    enum: ["BUY", "SELL"],
    required: true,
  },
  creationDate: {
    type: Date,
    default: Date.now,
    index: true, // Add an index for sorting
  },
  lastModifiedDate: {
    type: Date,
    default: Date.now,
  },
  symbols: {
    pair: {
      type: String, // eg, "SOL/USDC"
      required: true,
    },
    current: {
      type: String, // eg, "USDC" or "SOL"
      required: true,
    },
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  timeFrame: {
    type: String,
    required: true,
  },
  transactionSignature: {
    type: String,
    required: false,
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TradePlan",
    required: true,
  },
});

tradeSchema.index({ creationDate: 1 }); // Sort by creationDate in ascending order

const Trade = mongoose.model("Trade", tradeSchema);

module.exports = Trade;
