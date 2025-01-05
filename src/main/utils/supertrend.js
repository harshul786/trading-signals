const moment = require("moment-timezone");
const ccxt = require("ccxt");

const calculateATR = (data, period) => {
  const atrValues = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      atrValues.push(null); // Not enough data for ATR
      continue;
    }

    const high = data[i].high;
    const low = data[i].low;
    const closePrev = data[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - closePrev),
      Math.abs(low - closePrev)
    );

    if (i === period) {
      // Initial ATR calculation (simple average)
      const sumTR = data.slice(0, period).reduce((acc, d, idx) => {
        const trInitial = Math.max(
          d.high - d.low,
          Math.abs(d.high - (idx > 0 ? data[idx - 1].close : 0)),
          Math.abs(d.low - (idx > 0 ? data[idx - 1].close : 0))
        );
        return acc + trInitial;
      }, 0);
      atrValues.push(sumTR / period);
    } else {
      // Smoothed ATR calculation
      const prevATR = atrValues[i - 1];
      atrValues.push((prevATR * (period - 1) + tr) / period);
    }
  }

  return atrValues;
};

const calculateSupertrend = (data, atrPeriod, multiplier) => {
  const atr = calculateATR(data, atrPeriod);
  const results = [];

  let prevUpperBand, prevLowerBand, prevSuperTrend, prevDirection;

  for (let i = 0; i < data.length; i++) {
    const timestampIST = moment(data[i].timestamp);
    //   .tz("Asia/Kolkata")
    //   .format("YYYY-MM-DD HH:mm:ss");

    if (i < atrPeriod || atr[i] === null) {
      results.push({
        timestamp: timestampIST,
        supertrend: null,
        signal: null,
      });
      continue;
    }

    const hl2 = (data[i].high + data[i].low) / 2;
    const upperBand = hl2 + multiplier * atr[i];
    const lowerBand = hl2 - multiplier * atr[i];

    if (i === atrPeriod) {
      prevUpperBand = upperBand;
      prevLowerBand = lowerBand;
      prevSuperTrend = lowerBand;
      prevDirection = 1; // Initial direction is uptrend
    }

    const currUpperBand =
      upperBand < prevUpperBand || data[i - 1].close > prevUpperBand
        ? upperBand
        : prevUpperBand;
    const currLowerBand =
      lowerBand > prevLowerBand || data[i - 1].close < prevLowerBand
        ? lowerBand
        : prevLowerBand;

    const currDirection =
      prevSuperTrend === prevUpperBand
        ? data[i].close > currUpperBand
          ? 1 // Uptrend
          : -1 // Downtrend
        : data[i].close < currLowerBand
        ? -1 // Downtrend
        : 1; // Uptrend

    const currSuperTrend = currDirection === 1 ? currLowerBand : currUpperBand;

    const signal =
      prevDirection !== null && currDirection !== prevDirection
        ? currDirection === 1
          ? "BUY"
          : "SELL"
        : null;

    results.push({
      timestamp: timestampIST,
      supertrend: currSuperTrend,
      signal: signal,
    });

    prevUpperBand = currUpperBand;
    prevLowerBand = currLowerBand;
    prevSuperTrend = currSuperTrend;
    prevDirection = currDirection;
  }

  return results;
};

const supertrendSorted = (data, atrPeriod, multiplier, doFilter = true) => {
  let response = calculateSupertrend(data, atrPeriod, multiplier);

  // Filter out items with null signals
  response = doFilter
    ? response.filter((item) => item.signal !== null)
    : response;

  // Sort by timestamp in increasing order
  response.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return response;
};

async function fetchOHLCV_V1(symbol, timeframe, limit = 10000) {
  const exchange = new ccxt.bitbns();
  const maxPerRequest = 200; // Binance's max limit per request
  let since = undefined; // Start with the most recent candles
  const candles = [];

  while (candles.length < limit) {
    const fetchLimit = Math.min(maxPerRequest, limit - candles.length);

    try {
      const data = await exchange.fetchOHLCV(
        symbol,
        timeframe,
        since,
        fetchLimit
      );

      if (!data || data.length === 0) {
        console.error("No more data available from Binance.");
        break;
      }

      candles.push(
        ...data.map((candle) => ({
          timestamp: candle[0],
          open: candle[1],
          high: candle[2],
          low: candle[3],
          close: candle[4],
          volume: candle[5],
        }))
      );

      since = data[0][0]; // Update `since` to the earliest timestamp in the new batch
    } catch (error) {
      console.error("Error fetching candles:", error.message);
      break;
    }

    // Delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1)); // 100ms delay
  }

  const result = new Array();
  candles.forEach((candleI) => result.push(candleI));

  return result; // Ensure only the requested number of candles is returned
}

async function fetchOHLCV_V2(symbol, timeframe, days = 7) {
  const exchange = new ccxt.huobi();
  const maxPerRequest = 200; // Binance's max limit per request
  const limit = 10000; // Maximum number of candles to fetch
  let sinceMilliSecond = Date.now() - days * 24 * 60 * 60 * 1000; // Start 30 days ago
  const candles = [];

  while (candles.length < limit) {
    const fetchLimit = Math.min(maxPerRequest, limit - candles.length);

    try {
      const data = await exchange.fetchOHLCV(
        symbol,
        timeframe,
        sinceMilliSecond,
        fetchLimit
      );

      if (!data || data.length === 0) {
        console.warn("No more data available from Binance.");
        break;
      }

      candles.push(
        ...data.map((candle) => ({
          timestamp: candle[0],
          open: candle[1],
          high: candle[2],
          low: candle[3],
          close: candle[4],
          volume: candle[5],
        }))
      );

      sinceMilliSecond = candles[candles.length - 1]?.timestamp + 1; // Increment to fetch the next batch
    } catch (error) {
      console.error("Error fetching candles:", error.message);
      break;
    }

    // Delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
  }

  candles.sort((a, b) => a.timestamp - b.timestamp); // Sort the candles by timestamp in increasing order

  console.log("-> Last candle==>", candles.splice(-1));
  // // Filter candles based on timestamp
  // const filteredCandles = candles.filter((candle) => {
  //   const timestamp = new Date(candle.timestamp);
  //   const filterTimestamp = new Date("2025-01-05T10:45:00");
  //   return timestamp <= filterTimestamp;
  // });

  // return filteredCandles;

  return candles;
}

const currentSignal = async (
  symbol = "SOL/USDT",
  timeframe = "5m",
  atrForDays = 7
) => {
  let response = {};
  const days = atrForDays;

  // Fetch OHLCV data
  const data = await fetchOHLCV_V2(symbol, timeframe, days);
  response.ohlcvDataLength = data.length;

  // Supertrend Parameters
  const atrLength = 20;
  const multiplier = 4;

  // Calculate Supertrend
  const results = supertrendSorted(
    data,
    atrLength,
    multiplier,
    (doFilter = false)
  );

  // Get the last candle
  const lastCandle = results.splice(-1)[0]; // Retrieve the most recent result
  let lc = {
    timestamp: moment(lastCandle.timestamp)
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD HH:mm:ss"),
    signal: lastCandle.signal,
    price: parseFloat(lastCandle.supertrend.toFixed(2)),
  };
  response.lastCandle = lc;

  // Check if the last candle is in the current timeframe
  if (lastCandle) {
    response.signal = lastCandle.signal ? lastCandle.signal : null;
  }

  const lastSignaledCandle = results
    .filter((item) => item.signal !== null)
    .splice(-1)[0];
  let lsc = {
    timestamp: moment(lastSignaledCandle.timestamp)
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD HH:mm:ss"),
    signal: lastSignaledCandle.signal,
    price: parseFloat(lastSignaledCandle.supertrend.toFixed(2)),
  };
  response.lastSignaledCandle = lsc;

  return response;
};

// currentSignal((symbol = "SOL/USDT"), (timeframe = "5m"), (atrForDays = 1)).then(
//   (signal) => {
//     console.log("Current Signal:", signal);
//   }
// );

// let retryCount = 0;
// let x = 10; // Retry every x seconds
// let y = 3; // Retry for y minutes
// const maxRetries = (y * 60) / x; // Total retries = y minutes * 60 seconds / x seconds

// const retryInterval = setInterval(async () => {
//   const currentS = await currentSignal(
//     (symbol = "SOL/USDT"),
//     (timeframe = "5m"),
//     (atrForDays = 1)
//   );
//   if (currentS.signal) {
//     console.log("Current Signal:", currentS, "Retry count:", retryCount);
//     clearInterval(retryInterval); // Stop retrying once a signal is received
//     return currentS;
//   } else {
//     retryCount++;
//     console.log("Retrying...", retryCount, "current signal:", currentS);

//     if (retryCount >= maxRetries) {
//       console.log("Max retries reached. No signal received.");
//       clearInterval(retryInterval); // Stop retrying after reaching max retries
//     }
//   }
// }, 1000 * x); // Retry after 10 seconds

module.exports = {
  currentSignal,
  supertrendSorted,
  fetchOHLCV_V1,
  fetchOHLCV_V2,
};
