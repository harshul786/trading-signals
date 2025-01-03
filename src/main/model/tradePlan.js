const mongoose = require("mongoose");

const tradePlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  pairs: {
    firstPair: {
      symbol: {
        type: String,
        required: true,
      },
      contractAddress: {
        type: String,
        required: true,
      },
    },
    secondPair: {
      symbol: {
        type: String,
        required: true,
      },
      contractAddress: {
        type: String,
        required: true,
      },
    },
  },
  creationDate: {
    type: Date,
    default: Date.now,
  },
  lastModifiedDate: {
    type: Date,
    default: Date.now,
  },
  selectedTimeframe: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["ACTIVE", "INACTIVE"],
    default: "ACTIVE",
  },
});

const TradePlan = mongoose.model("TradePlan", tradePlanSchema);

module.exports = TradePlan;
