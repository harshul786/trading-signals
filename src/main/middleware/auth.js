const jwt = require("jsonwebtoken");
const User = require("../model/user");

const authMiddleware = async (req, res, next) => {
  try {
    // Get the token from the request headers
    const token = req.header("Authorization").replace("Bearer ", "");

    // Verify the token using the secret from the environment variable
    const decoded = jwt.verify(token, process.env.JWTSECRET);

    // Find the user associated with the token
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Attach the user object to the request for further use
    req.user = user;

    next();
  } catch (error) {
    res.status(401).json({ message: "Authentication failed" });
  }
};

module.exports = authMiddleware;
