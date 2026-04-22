import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import coachRouter from "./routes/coach.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Origines autorisées
const allowedOrigins = [
  "https://parfectgolfr.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];

// CORS
app.use(cors({
  origin(origin, callback) {
    // autorise aussi les appels sans origin (curl, health checks, serveur à serveur)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

// Répond aux preflight OPTIONS
app.options("*", cors());

app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "parfect-coach-backend"
  });
});

app.use("/api/coach", coachRouter);

app.use((err, _req, res, _next) => {
  console.error("Unhandled error", err);
  res.status(500).json({
    ok: false,
    error: err.message || "internal_server_error"
  });
});

app.listen(PORT, () => {
  console.log(`✅ Parfect coach backend listening on port ${PORT}`);
});
