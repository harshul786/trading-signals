require("dotenv").config();

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB_NAME;
const mongoose = require("mongoose");

exports.connect = () => {
  if (!uri) {
    console.error("MONGODB_URI environment variable is not set.");
    process.exit(1); // Exit if the URI is not defined
  }

  let connectionUri = uri;

  if (databaseName) {
    const urlParts = new URL(uri);
    urlParts.pathname = `/${databaseName}`;
    connectionUri = urlParts.toString();
  }

  mongoose
    .connect(connectionUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log(
        `Successfully connected to database: ${
          databaseName || "default database"
        }`
      );
    })
    .catch((error) => {
      console.log("Database connection failed. Exiting now...");
      console.error(error);
      process.exit(1);
    });
};
