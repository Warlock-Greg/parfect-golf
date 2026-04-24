import express from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import fs from "fs";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

function cleanText(text = "") {
  return text
    .replace(/\s+/g, " ")
    .replace(/[•●]/g, "-")
    .trim();
}

function detectCategory(text) {
  const t = text.toLowerCase();

  if (t.includes("mental") || t.includes("routine") || t.includes("pressure") || t.includes("confiance")) {
    return "mental";
  }

  if (t.includes("club") || t.includes("strategy") || t.includes("caddy") || t.includes("course management")) {
    return "caddy";
  }

  if (t.includes("tempo")) return "tempo";
  if (t.includes("rotation")) return "rotation";
  if (t.includes("balance")) return "balance";
  if (t.includes("impact")) return "impact";

  return "general";
}

function chunkText(text, size = 1200) {
  const chunks = [];
  let i = 0;

  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size;
  }

  return chunks;
}

function buildKnowledgeJSON({ fileName, text }) {
  const chunks = chunkText(text);

  return {
    source: {
      name: fileName,
      type: "pdf",
      importedAt: new Date().toISOString()
    },

    categories: chunks.map((chunk, index) => ({
      id: `${fileName}-${index + 1}`,
      category: detectCategory(chunk),
      rawText: chunk,
      extracted: {
        principles: [],
        mistakes: [],
        drills: [],
        caddyRules: [],
        mentalRules: []
      }
    }))
  };
}

router.post("/pdf-to-knowledge", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun PDF reçu" });
    }

    const buffer = fs.readFileSync(req.file.path);
    const parsed = await pdfParse(buffer);

    const text = cleanText(parsed.text);

    const knowledge = buildKnowledgeJSON({
      fileName: req.file.originalname,
      text
    });

    fs.unlinkSync(req.file.path);

    res.json(knowledge);
  } catch (err) {
    console.error("PDF extraction error:", err);
    res.status(500).json({ error: "Impossible d’extraire le PDF" });
  }
});

export default router;
