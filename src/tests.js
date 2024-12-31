const moment = require("moment-timezone");
const { supertrendSorted, fetchOHLCV_V2 } = require("./supertrend");
const ccxt = require("ccxt");

// Fetch OHLCV data
async function fetchOHLCV(symbol, timeframe, limit) {
  const exchange = new ccxt.binance();
  const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
  return ohlcv.map((candle) => ({
    timestamp: candle[0],
    open: candle[1],
    high: candle[2],
    low: candle[3],
    close: candle[4],
    volume: candle[5],
  }));
}

function getTradeLimit(timeframe) {
  const timeframeInMinutes = parseInt(timeframe) || 1; // Default to 1 minute if parsing fails
  const limitPerMinute = 1; // You can set this to the max number of trades per minute

  // Calculate the limit based on timeframe (in minutes)
  const tradesPerTimeframe = limitPerMinute * (60 / timeframeInMinutes);

  return Math.floor(tradesPerTimeframe); // Return the limit for the given timeframe
}

function calculateProfit(
  results,
  transactionFee = 0.02,
  initialBalance = 100,
  slippage = 0.005
) {
  let position = null; // Tracks the open position
  let balance = initialBalance; // Start with the initial balance
  let totalTrades = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalProfit = 0; // Track the total profit for the test
  console.log(results);

  results.forEach((result, index) => {
    const price = parseFloat(result.supertrend.toFixed(2)); // Ensure price is a number with two decimals

    if (result.signal === "BUY" && !position) {
      // Apply slippage for the BUY price
      const buyPrice = price * (1 + slippage);
      const quantity = balance / buyPrice; // Use all available balance to buy
      position = {
        entryPrice: buyPrice,
        quantity,
        type: "BUY",
        timestamp: result.timestamp,
      }; // Open a new position
    } else if (
      result.signal === "SELL" &&
      position &&
      position.type === "BUY"
    ) {
      // Apply slippage for the SELL price
      const sellPrice = price * (1 - slippage);
      const tradeProfit =
        position.quantity * (sellPrice - position.entryPrice) -
        transactionFee * 2; // Fee for both buy and sell
      const tradeProfitPercentage = (tradeProfit / position.entryPrice) * 100;

      balance += tradeProfit; // Update the balance after the trade
      totalTrades++;
      totalProfit += tradeProfit; // Add to total profit

      if (tradeProfit >= 0) {
        const buyTime = moment(position.timestamp).tz("Asia/Kolkata");
        const sellTime = moment(result.timestamp).tz("Asia/Kolkata");
        const hours = sellTime.diff(buyTime, "hours", true);

        totalWins++;
        console.log(
          "Trade Profit:",
          tradeProfit.toFixed(2),
          "with percentage:",
          tradeProfitPercentage.toFixed(2) + "%",
          "for BUY trade:",
          index
        );
        console.log(
          "-->",
          "Buy at:",
          buyTime.format("YYYY-MM-DD HH:mm:ss"),
          "Sell at:",
          sellTime.format("YYYY-MM-DD HH:mm:ss"),
          "Hour dif:",
          hours
        );
      } else {
        const buyTime = moment(position.timestamp).tz("Asia/Kolkata");
        const sellTime = moment(result.timestamp).tz("Asia/Kolkata");
        const hours = sellTime.diff(buyTime, "hours", true);

        totalLosses++;
        console.log(
          "Trade Loss:",
          tradeProfit.toFixed(2),
          "with percentage:",
          tradeProfitPercentage.toFixed(2) + "%",
          "for BUY trade:",
          index
        );
        console.log(
          "-->",
          "Buy at:",
          buyTime.format("YYYY-MM-DD HH:mm:ss"),
          "Sell at:",
          sellTime.format("YYYY-MM-DD HH:mm:ss"),
          "Hour dif:",
          hours
        );
      }

      position = null; // Reset position
    }
  });

  console.log("Initial Balance:", initialBalance.toFixed(2));
  console.log("Final Balance:", balance.toFixed(2));
  console.log("Total Trades:", totalTrades);
  console.log("Total Wins:", totalWins);
  console.log("Total Losses:", totalLosses);
  console.log("Total Profit:", totalProfit.toFixed(2));

  return balance.toFixed(2) - initialBalance.toFixed(2); // Return the net profit (final balance - initial balance)
}

function getTradeLimit(timeframe, days = 1) {
  // Convert the timeframe string into a number (e.g., "1m" -> 1, "1h" -> 1, "1d" -> 1)
  const timeUnit = timeframe.slice(-1); // Get the last character: 'm', 'h', 'd'
  const timeframeInUnits = parseInt(timeframe); // Extract the number part of the timeframe

  const limitPerMinute = 1; // Default to 1 trade per minute for minute-based timeframes

  let totalMinutes;

  // Handle different timeframes based on their units
  if (timeUnit === "m") {
    // For "1m", "5m", "15m", etc., the timeframe is in minutes
    totalMinutes = 60 * 24 * days; // Total minutes in the given number of days
  } else if (timeUnit === "h") {
    // For "1h", "2h", etc., the timeframe is in hours
    totalMinutes = 60 * timeframeInUnits * days; // Convert hours to minutes
  } else if (timeUnit === "d") {
    // For "1d", "2d", etc., the timeframe is in days
    totalMinutes = 60 * 24 * timeframeInUnits * days; // Convert days to minutes
  } else {
    throw new Error('Invalid timeframe unit. Use "m", "h", or "d"');
  }

  // Calculate trades per timeframe
  const tradesPerTimeframe = limitPerMinute * (60 / timeframeInUnits);

  // Calculate the total limit over the given days
  const totalTradesLimit = Math.floor(tradesPerTimeframe * (totalMinutes / 60));

  return totalTradesLimit; // Return the total trade limit for the given timeframe and days
}

(async () => {
  const symbol = "SOL/USDT";
  const timeframe = "5m";
  const days = 365; // Test last 7 days
  const limit = getTradeLimit(timeframe, days);

  // Fetch OHLCV data
  // const data = await fetchOHLCV_V1(symbol, timeframe, limit);
  const data = await fetchOHLCV_V2(symbol, timeframe, days);

  // Supertrend Parameters
  const atrLength = 10;
  const multiplier = 3;

  // Calculate Supertrend
  const results = supertrendSorted(data, atrLength, multiplier);

  console.log("total trades (buy + sell):", results.length);
  // Calculate total profit
  const totalProfit = calculateProfit(results);

  console.log("Total Profit: $", totalProfit);
})();
