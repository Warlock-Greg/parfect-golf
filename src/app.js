import express from "express";
import dotenv from "dotenv";
import coachRouter from "./routes/coach.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
    error: "internal_server_error"
  });
});

app.listen(PORT, () => {
  console.log(`✅ Parfect coach backend listening on R ${PORT}`);
});
