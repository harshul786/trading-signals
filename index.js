const express = require("express");
const { currentSignal } = require("./src/supertrend");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

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
