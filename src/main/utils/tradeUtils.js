require("dotenv").config();
const { Connection, PublicKey } = require("@solana/web3.js");
const {
  getAssociatedTokenAddress,
  getAccount,
  getMint,
} = require("@solana/spl-token");
const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(SOLANA_RPC_URL);

/**
 * Fetch the balance of a Solana wallet in SOL.
 * @param {string} walletAddress - The public address of the wallet.
 * @returns {Promise<number>} - The balance in SOL.
 */
const getSolWalletBalance = async (walletAddress) => {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balanceInLamports = await connection.getBalance(publicKey);
    return balanceInLamports / 1e9; // Convert lamports to SOL
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    throw new Error("Failed to fetch wallet balance.");
  }
};

/**
 * Fetch the balance of a stable coin in the user's wallet.
 * @param {string} walletAddress - The public address of the wallet.
 * @param {string} mintAddress - The mint address of the stable coin.
 * @returns {Promise<number>} - The balance of the stable coin.
 */
const getStableCoinBalance = async (walletAddress, mintAddress) => {
  try {
    const walletPublicKey = new PublicKey(walletAddress);
    const mintPublicKey = new PublicKey(mintAddress);
    const tokenAddress = await getAssociatedTokenAddress(
      mintPublicKey,
      walletPublicKey
    );
    const tokenAccount = await getAccount(connection, tokenAddress);
    const mintInfo = await getMint(connection, mintPublicKey);

    return Number(tokenAccount.amount) / Math.pow(10, mintInfo.decimals); // Convert to decimals
  } catch (error) {
    console.error("Error fetching stable coin balance:", error);
    throw new Error("Failed to fetch stable coin balance.");
  }
};

/**
 * Placeholder for fetching the price of a stable coin.
 * @param {string} mintAddress - The mint address of the stable coin.
 * @returns {Promise<number>} - The price of the stable coin.
 */
const getStableCoinPrice = async (mintAddress) => {
  // Placeholder: Implement actual logic to fetch stable coin price
  return 1; // Assuming 1:1 USD price
};

/**
 * Validate wallet balance based on the top-up type.
 * @param {string} walletAddress - The wallet address.
 * @param {string} topupType - The type of top-up ("SOL" or "STABLE_COIN").
 * @param {number} requiredSolBalance - The minimum required balance in SOL.
 * @param {string} mintAddress - The mint address of the stable coin (optional).
 * @returns {Promise<boolean>} - Whether the wallet balance is sufficient.
 */
const validateWalletBalance = async (
  walletAddress,
  topupType,
  requiredSolBalance,
  mintAddress
) => {
  try {
    const solBalance = await getSolWalletBalance(walletAddress);

    if (topupType === "SOL") {
      return solBalance >= requiredSolBalance;
    }

    if (topupType === "STABLE_COIN") {
      if (!mintAddress) {
        throw new Error("Mint address is required for stable coin validation.");
      }

      const stableCoinBalance = await getStableCoinBalance(
        walletAddress,
        mintAddress
      );
      console.log("Stable coin balance:", stableCoinBalance);
      const stableCoinPrice = await getStableCoinPrice(mintAddress);

      return {
        isBalanceSufficient:
          solBalance >= requiredSolBalance &&
          stableCoinBalance * stableCoinPrice >= 15,
        stableCoinBalance,
        solBalance,
      };
    }

    throw new Error("Invalid top-up type.");
  } catch (error) {
    console.error("Error validating wallet balance:", error);
    throw new Error("Failed to validate wallet balance.");
  }
};

// Helper function to calculate profit
const calculateProfit = (trades, initialBalance) => {
  let balance = initialBalance; // Start with the initial balance
  let totalTrades = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalProfit = 0;
  let openPosition = null; // Track the open BUY position

  trades.forEach((trade) => {
    // Only consider successful trades
    if (trade.status !== "SUCCESS") return;

    if (trade.type === "BUY") {
      // Record the BUY trade details with actual slippage
      const buyPrice = trade.actualBuyPrice * (1 + trade.actualSlippage);
      openPosition = {
        amount: trade.amount,
        buyPrice,
        fee: trade.fee,
      };
    } else if (trade.type === "SELL" && openPosition) {
      // Calculate profit for the SELL trade
      const sellPrice = trade.actualSellPrice * (1 - trade.actualSlippage);
      const cost =
        openPosition.buyPrice * openPosition.amount + openPosition.fee;
      const earnings = sellPrice * openPosition.amount - trade.fee;
      const profit = earnings - cost;

      balance += profit; // Update balance with profit/loss
      totalTrades++;
      totalProfit += profit;

      if (profit >= 0) {
        totalWins++;
      } else {
        totalLosses++;
      }

      openPosition = null; // Reset position after SELL
    }
  });

  return {
    finalBalance: balance,
    totalTrades,
    totalWins,
    totalLosses,
    totalProfit,
  };
};

module.exports = {
  calculateProfit,
  getSolWalletBalance,
  getStableCoinBalance,
  validateWalletBalance,
};
