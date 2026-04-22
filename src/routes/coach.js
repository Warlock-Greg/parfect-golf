import express from "express";
import { openai, OPENAI_MODEL } from "../openaiClient.js";
import {
  ensureObject,
  safeJsonParse,
  extractTextFromResponse,
  validateSwingOutput,
  validateTrainingOutput,
  validateRoundOutput
} from "../utils/validation.js";
import { getSwingSystemPrompt } from "../prompts/swingPrompt.js";
import { getTrainingSystemPrompt } from "../prompts/trainingPrompt.js";
import { getRoundSystemPrompt } from "../prompts/roundPrompt.js";

const router = express.Router();

// --------------------------------------------------
// Helpers
// --------------------------------------------------
async function runJsonResponse({ systemPrompt, payload }) {
  const response = await openai.responses.create({
    model: OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `Réponds uniquement en JSON.\n\nDATA:\n${JSON.stringify(payload, null, 2)}`
      }
    ]
  });

  const text = extractTextFromResponse(response);
  const parsed = safeJsonParse(text);

  if (!parsed) {
    const error = new Error("invalid_model_json");
    error.raw = text;
    throw error;
  }

  return parsed;
}

// --------------------------------------------------
// POST /api/coach/analyze-swing
// --------------------------------------------------
router.post("/analyze-swing", async (req, res) => {
  try {
    ensureObject(req.body, "request body");

    const { context, userMessage = "" } = req.body;
    ensureObject(context, "context");

    const payload = {
      userMessage,
      context
    };

    const parsed = await runJsonResponse({
      systemPrompt: getSwingSystemPrompt(),
      payload
    });

    const analysis = validateSwingOutput(parsed);

    return res.json({
      ok: true,
      analysis,
      meta: {
        route: "analyze-swing",
        model: OPENAI_MODEL
      }
    });
  } catch (err) {
    console.error("❌ /api/coach/analyze-swing", err);
    return res.status(err.raw ? 502 : 400).json({
      ok: false,
      error: err.message || "unknown_error",
      raw: err.raw || null
    });
  }
});

// --------------------------------------------------
// POST /api/coach/training
// --------------------------------------------------
router.post("/training", async (req, res) => {
  try {
    ensureObject(req.body, "request body");

    const { context, userMessage = "" } = req.body;
    ensureObject(context, "context");

    const payload = {
      userMessage,
      context
    };

    const parsed = await runJsonResponse({
      systemPrompt: getTrainingSystemPrompt(),
      payload
    });

    const analysis = validateTrainingOutput(parsed);

    return res.json({
      ok: true,
      analysis,
      meta: {
        route: "training",
        model: OPENAI_MODEL
      }
    });
  } catch (err) {
    console.error("❌ /api/coach/training", err);
    return res.status(err.raw ? 502 : 400).json({
      ok: false,
      error: err.message || "unknown_error",
      raw: err.raw || null
    });
  }
});

// --------------------------------------------------
// POST /api/coach/round-support
// --------------------------------------------------
router.post("/round-support", async (req, res) => {
  try {
    ensureObject(req.body, "request body");

    const { context, userMessage = "" } = req.body;
    ensureObject(context, "context");

    const payload = {
      userMessage,
      context
    };

    const parsed = await runJsonResponse({
      systemPrompt: getRoundSystemPrompt(),
      payload
    });

    const analysis = validateRoundOutput(parsed);

    return res.json({
      ok: true,
      analysis,
      meta: {
        route: "round-support",
        model: OPENAI_MODEL
      }
    });
  } catch (err) {
    console.error("❌ /api/coach/round-support", err);
    return res.status(err.raw ? 502 : 400).json({
      ok: false,
      error: err.message || "unknown_error",
      raw: err.raw || null
    });
  }
});

export default router;
