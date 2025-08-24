const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Start GPU Worker Server automatically
const startGpuWorker = () => {
  const gpuWorkerPath = path.join(__dirname, "..", "gpu-worker");
  const gpuWorker = spawn("node", ["server.js"], {
    cwd: gpuWorkerPath,
    stdio: ["inherit", "pipe", "pipe"],
  });

  gpuWorker.stdout.on("data", (data) => {
    console.log(`[GPU Worker] ${data.toString().trim()}`);
  });

  gpuWorker.stderr.on("data", (data) => {
    console.error(`[GPU Worker Error] ${data.toString().trim()}`);
  });

  gpuWorker.on("close", (code) => {
    console.log(`[GPU Worker] Process exited with code ${code}`);
    if (code !== 0) {
      console.log("[GPU Worker] Restarting GPU worker in 5 seconds...");
      setTimeout(startGpuWorker, 5000);
    }
  });

  gpuWorker.on("error", (err) => {
    console.error("[GPU Worker] Failed to start:", err);
  });

  return gpuWorker;
};

// Start GPU Worker
console.log("Starting GPU Worker...");
const gpuWorkerProcess = startGpuWorker();

// PostgreSQL connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "logindet",
  password: "040711",
  port: 5432,
});
pool.on("error", (err) => {
  console.error("[Postgres] Unexpected error on idle client", err);
});

// Create user table if not exists
const createTableQuery = `
CREATE TABLE IF NOT EXISTS "user" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL
);
`;
pool.query(createTableQuery).catch(console.error);

// Signup route
app.post("/signup", async (req, res) => {
  console.log("[Signup] body:", req.body);
  const { name, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }
  try {
    const userExists = await pool.query(
      'SELECT * FROM "user" WHERE email = $1',
      [email]
    );
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }
    const password_hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO "user" (name, email, password_hash) VALUES ($1, $2, $3)',
      [name, email, password_hash]
    );
    console.log("[Signup] created:", email);
    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("[Signup] error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res
      .status(500)
      .json({ status: "error", db: "disconnected", error: err.message });
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }
  try {
    const userResult = await pool.query(
      'SELECT * FROM "user" WHERE email = $1',
      [email]
    );
    const user = userResult.rows[0];
    if (user && (await bcrypt.compare(password, user.password_hash))) {
      res.status(200).json({ message: "Login successful", email });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

const PORT = 5000;

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log("GPU Worker should be running on port 5001");
});

// Graceful shutdown handling
process.on("SIGINT", () => {
  console.log("\nShutting down servers...");

  // Close GPU Worker
  if (gpuWorkerProcess) {
    console.log("Stopping GPU Worker...");
    gpuWorkerProcess.kill("SIGTERM");
  }

  // Close backend server
  server.close(() => {
    console.log("Backend server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");

  if (gpuWorkerProcess) {
    gpuWorkerProcess.kill("SIGTERM");
  }

  server.close(() => {
    console.log("Backend server closed");
    process.exit(0);
  });
});
