const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const jwt_secret = process.env.JWTSECRET;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 3,
  },
  creationDate: {
    type: Date,
    default: Date.now,
  },
  lastModifiedDate: {
    type: Date,
    default: Date.now,
  },
  solWalletAddress: {
    type: String,
    required: true,
  },
  solWalletPrivateKey: {
    type: String,
    required: true,
    set: function (value) {
      if (this.solWalletPrivateKey) {
        return this.solWalletPrivateKey;
      } else {
        return value;
      }
    },
  },
  solBalance: {
    type: Number,
    default: 0,
  },
  otherBalance: [
    {
      symbol: {
        type: String,
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
      contractAddress: {
        type: String,
        required: true,
      },
    },
  ],
  topUpVerified: {
    type: Boolean,
    default: false,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^\S+@\S+\.\S+$/, // Email regex
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
});

userSchema.methods.getPublicObject = function () {
  const userObject = this.toObject();

  delete userObject.password;
  delete userObject.solWalletPrivateKey;

  return userObject;
};

userSchema.methods.generateAuthToken = async function () {
  const user = this;

  const token = jwt.sign(
    { userId: user._id.toString(), solWalletAddress: user.solWalletAddress },
    jwt_secret,
    {
      expiresIn: "3 days",
    }
  );

  return token;
};

userSchema.statics.authenticateByCredentials = async (email, password) => {
  const user = await User.findOne({ email: email });

  if (!user) {
    throw new Error("Invalid Email or Password!");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid Email or Password!");
  }

  return user;
};

// middleware
userSchema.pre("save", async function (next) {
  const user = this;
  if (user.isModified("password")) {
    try {
      user.password = await bcrypt.hash(user.password, 8);
    } catch (err) {
      console.log(err);
    }
  }

  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
