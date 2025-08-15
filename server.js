require("dotenv").config();
const cors = require("cors");

// Ensure environment variables are available for blaze-engine
process.env.MONGODB_URI = process.env.MONGODB_URI;
process.env.MONGODB_DBNAME = process.env.MONGODB_DBNAME || "CDD";

// Environment validation
console.log("🔍 Environment Check:");
console.log("NODE_ENV:", process.env.NODE_ENV || "development");
console.log("PORT:", process.env.PORT || "8080");
console.log("MONGODB_URI exists:", !!process.env.MONGODB_URI);
console.log("NPM_TOKEN exists:", !!process.env.NPM_TOKEN);

if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is not set!");
  process.exit(1);
}

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const app = express();
app.use(
  cors({
    origin: [process.env.DEV_URL, process.env.PRODUCTION_URL],
    credentials: true,
  })
);
// 1. Import your db-interaction module
const dbInteraction = require("./node_modules/@blaze-case-ai/blaze-engine/server/database/db-interaction");

// Debug what the blaze-engine is getting
const blazeConfig = require("./node_modules/@blaze-case-ai/blaze-engine/server/database/config");
console.log("🔧 Blaze-engine config:");
console.log("URL:", blazeConfig.url);
console.log("DB Name:", blazeConfig.dbName);

// Correctly require the routes from the @blaze-case-ai/blaze-engine package
const caseTypeRoute = require("./node_modules/@blaze-case-ai/blaze-engine/server/route/case-type-route");
const caseRoute = require("./node_modules/@blaze-case-ai/blaze-engine/server/route/case-route");
const componentRoute = require("./node_modules/@blaze-case-ai/blaze-engine/server/route/component-route");
const authRoutes = require("./node_modules/@blaze-case-ai/blaze-engine/server/controller/auth-controller");
const dataModelRoute = require("./node_modules/@blaze-case-ai/blaze-engine/server/route/data-model-route");
const authService = require("./node_modules/@blaze-case-ai/blaze-engine/server/service/auth-service");

// Serve static files from the "client/public" directory
app.use(express.static(path.join(__dirname, "client/public")));

// Serve node_modules from the root path
app.use("/node_modules", express.static(path.join(__dirname, "node_modules")));

// Route for the root of your application
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client/public/index.html"));
});

app.use("/src", express.static(path.join(__dirname, "client/src")));
app.use(express.json());

// Auth service connection test endpoint
app.get("/api/test-auth", async (req, res) => {
  try {
    const connectionStatus = await authService.checkConnectionStatus();
    res.json({
      success: connectionStatus.success,
      message: connectionStatus.success
        ? "Auth service connected"
        : "Auth service connection failed",
      details: connectionStatus,
      mongooseState: mongoose.connection.readyState,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      mongooseState: mongoose.connection.readyState,
    });
  }
});

// Database test endpoint
app.get("/api/test-db", async (req, res) => {
  try {
    const db = await dbInteraction.connect();
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((col) => col.name);

    let records = [];
    if (collectionNames.length > 0) {
      const userCollections = collectionNames.filter(
        (name) => !name.startsWith("system.")
      );
      if (userCollections.length > 0) {
        const collectionName = userCollections[0];
        records = await dbInteraction.findRecords(collectionName, {});
        records = records.slice(0, 5);
      }
    }

    res.json({
      success: true,
      dbName: dbInteraction.dbName,
      collections: collectionNames,
      sampleRecords: records,
      recordCount: records.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.use("/auth", authRoutes);
app.use("/api", caseTypeRoute);
app.use("/api", caseRoute);
app.use("/api", componentRoute);
app.use("/api", dataModelRoute);

const PORT = process.env.PORT || 8080;

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/CDD";
console.log("🔗 Connecting to MongoDB...");
console.log(
  "📍 MongoDB URI:",
  mongoUri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@")
); // Hide credentials in logs

mongoose
  .connect(mongoUri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log("✅ Mongoose connected");
    return dbInteraction.connect();
  })
  .then(() => {
    console.log("✅ Database connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  });
