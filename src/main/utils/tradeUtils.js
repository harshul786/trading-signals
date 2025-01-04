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
 * If the token account doesn't exist, return 0 as the balance.
 * @param {string} walletAddress - The public address of the wallet.
 * @param {string} mintAddress - The mint address of the stable coin.
 * @returns {Promise<number>} - The balance of the stable coin.
 */
const getStableCoinBalance = async (walletAddress, mintAddress) => {
  try {
    const walletPublicKey = new PublicKey(walletAddress);
    const mintPublicKey = new PublicKey(mintAddress);

    // Derive the associated token address
    const tokenAddress = await getAssociatedTokenAddress(
      mintPublicKey,
      walletPublicKey
    );

    // Attempt to fetch the token account
    const tokenAccount = await getAccount(connection, tokenAddress);

    // Fetch mint info for decimals
    const mintInfo = await getMint(connection, mintPublicKey);

    return Number(tokenAccount.amount) / Math.pow(10, mintInfo.decimals); // Convert to decimals
  } catch (error) {
    if (error.name === "TokenAccountNotFoundError") {
      console.warn(
        `Token account not found for wallet: ${walletAddress}, returning 0 balance.`
      );
      return 0;
    }
    console.error("Error fetching stable coin balance:", error);
    throw new Error("Failed to fetch stable coin balance.");
  }
};

/**
 * Validate wallet balance based on the top-up type.
 * @param {string} walletAddress - The wallet address.
 * @param {string} topupType - The type of top-up ("SOL" or "STABLE_COIN").
 * @param {number} requiredSolBalance - The minimum required balance in SOL.
 * @param {string} mintAddress - The mint address of the stable coin (optional).
 * @returns {Promise<object>} - Whether the wallet balance is sufficient and details.
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
      const isBalanceSufficient = solBalance >= requiredSolBalance;
      return {
        isBalanceSufficient,
        solBalance,
        stableCoinBalance: 0,
        walletAddress,
      };
    }

    if (topupType === "STABLE_COIN") {
      if (!mintAddress) {
        throw new Error("Mint address is required for stable coin validation.");
      }

      const stableCoinBalance = await getStableCoinBalance(
        walletAddress,
        mintAddress
      );

      const isBalanceSufficient =
        solBalance >= requiredSolBalance && stableCoinBalance >= 15; // Assume stable coin value is 1:1 USD.

      return {
        isBalanceSufficient,
        solBalance,
        stableCoinBalance,
        walletAddress,
      };
    }

    throw new Error("Invalid top-up type.");
  } catch (error) {
    console.error("Error validating wallet balance:", error);
    return {
      error: "Insufficient wallet balance.",
      walletAddress,
      currentSolBalance: 0,
    };
  }
};

// Helper function to calculate profit
const calculateProfit = (trades, initialBalance) => {
  let actualBalance = initialBalance; // Actual balance for actual trades
  let expectedBalance = initialBalance; // Expected balance for expected trades
  let actualStats = {
    totalTrades: 0,
    totalWins: 0,
    totalLosses: 0,
    totalProfit: 0,
  };
  let expectedStats = {
    totalTrades: 0,
    totalWins: 0,
    totalLosses: 0,
    totalProfit: 0,
  };
  let openPosition = { actual: null, expected: null }; // Track open positions

  trades.forEach((trade) => {
    if (trade.status !== "SUCCESS") return; // Only consider successful trades

    const { type, expectedExecutionPrice, actualExecutionPrice, amount, fee } =
      trade;

    if (type === "BUY") {
      // Record BUY trade details for both actual and expected calculations
      const actualBuyPrice = actualExecutionPrice; // No additional slippage since it's already included
      const expectedBuyPrice = expectedExecutionPrice;

      openPosition.actual = { amount, buyPrice: actualBuyPrice, fee };
      openPosition.expected = { amount, buyPrice: expectedBuyPrice, fee };
    } else if (
      type === "SELL" &&
      openPosition.actual &&
      openPosition.expected
    ) {
      // Calculate actual profit
      const actualSellPrice = actualExecutionPrice; // Already includes slippage
      const actualCost =
        openPosition.actual.buyPrice * openPosition.actual.amount +
        openPosition.actual.fee;
      const actualEarnings = actualSellPrice * openPosition.actual.amount - fee;
      const actualProfit = actualEarnings - actualCost;

      actualBalance += actualProfit;
      actualStats.totalTrades++;
      actualStats.totalProfit += actualProfit;
      actualProfit >= 0 ? actualStats.totalWins++ : actualStats.totalLosses++;

      // Calculate expected profit
      const expectedSellPrice = expectedExecutionPrice; // No slippage adjustment needed
      const expectedCost =
        openPosition.expected.buyPrice * openPosition.expected.amount +
        openPosition.expected.fee;
      const expectedEarnings =
        expectedSellPrice * openPosition.expected.amount - fee;
      const expectedProfit = expectedEarnings - expectedCost;

      expectedBalance += expectedProfit;
      expectedStats.totalTrades++;
      expectedStats.totalProfit += expectedProfit;
      expectedProfit >= 0
        ? expectedStats.totalWins++
        : expectedStats.totalLosses++;

      // Reset positions
      openPosition.actual = null;
      openPosition.expected = null;
    }
  });

  return {
    actualProfit: {
      finalBalance: actualBalance,
      ...actualStats,
    },
    expectedProfit: {
      finalBalance: expectedBalance,
      ...expectedStats,
    },
  };
};

module.exports = {
  calculateProfit,
  getSolWalletBalance,
  getStableCoinBalance,
  validateWalletBalance,
};
