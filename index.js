const express = require("express");
const { currentSignal } = require("./src/main/utils/supertrend");
require("dotenv").config();
const cors = require("cors");
const http = require("http");

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;
const userResource = require("./src/main/api/userResource");
const tradeResource = require("./src/main/api/tradeResource");
const tradePlanResource = require("./src/main/api/tradePlanResource");

require("./src/main/config/mongoose").connect();

const corsOptions = {
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Authorization"],
  credentials: true,
};

const corsMiddleware = (req, res, next) => {
  cors(corsOptions)(req, res, next);
};

app.use(corsMiddleware);
app.use("/api/", userResource);
app.use("/api/trade", tradeResource);
app.use("/api/trade-plan", tradePlanResource);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/bot-01", (req, res) => {
  const { symbol, timeframe, atrForDays } = req.query;

  currentSignal(symbol, timeframe, atrForDays).then((signal) => {
    res.json(signal);
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
