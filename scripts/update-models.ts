#!/usr/bin/env npx tsx
/**
 * Fetches and consolidates all model/config data used by ChunkCanvas.
 *
 * Data sources:
 *   - OpenRouter /embeddings/models  → embedding model list (dims parsed from descriptions)
 *   - OpenRouter /models             → multimodal parsing model fallbacks
 *   - Voyage AI (static — no listing API)
 *   - Pinecone  (static — no listing API for regions)
 *   - PDF Engines (static — OpenRouter plugin config)
 *
 * Usage:
 *   npm run update-models
 *   npx tsx scripts/update-models.ts
 *
 * Output: app/lib/generated/models-data.json
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";
const OUTPUT_PATH = join(__dirname, "..", "app", "lib", "generated", "models-data.json");

// ─── Dimension fallbacks ──────────────────────────────────────────────── https://openrouter.ai/models?fmt=cards&output_modalities=embeddings
// Only needed for embedding models whose API description doesn't mention
// their output dimension (e.g. "768-dimensional"). When the script can
// parse dimensions from the description text, that takes precedence.
// If a new model appears without description-dimensions, add it here
// and re-run the script.
const DIMENSION_FALLBACKS: Record<string, number> = {
  "google/gemini-embedding-001": 3072,
  "openai/text-embedding-ada-002": 1536,
  "openai/text-embedding-3-large": 3072,
  "openai/text-embedding-3-small": 1536,
  "mistralai/codestral-embed-2505": 1024,
  "qwen/qwen3-embedding-8b": 4096,
  "qwen/qwen3-embedding-4b": 2560,
};

// ─── Static data (no API available) ─────────────────────────────────────

/** Voyage AI embedding models — sourced from https://docs.voyageai.com/docs/embeddings + /docs/multimodal-embeddings + /docs/pricing */
const VOYAGE_MODELS = [
  // Current recommended text embedding models
  { key: "voyage-4-large", label: "Voyage 4 Large", dimensions: 1024, context_length: 32000, pricing_per_million_tokens: 0.12, description: "Best general-purpose and multilingual retrieval quality" },
  { key: "voyage-4", label: "Voyage 4", dimensions: 1024, context_length: 32000, pricing_per_million_tokens: 0.06, description: "Optimized for general-purpose and multilingual retrieval quality" },
  { key: "voyage-4-lite", label: "Voyage 4 Lite", dimensions: 1024, context_length: 32000, pricing_per_million_tokens: 0.02, description: "Optimized for latency and cost" },
  { key: "voyage-code-3", label: "Voyage Code 3", dimensions: 1024, context_length: 32000, pricing_per_million_tokens: 0.18, description: "Optimized for code retrieval" },
  { key: "voyage-finance-2", label: "Voyage Finance 2", dimensions: 1024, context_length: 32000, pricing_per_million_tokens: 0.12, description: "Optimized for finance retrieval and RAG" },
  { key: "voyage-law-2", label: "Voyage Law 2", dimensions: 1024, context_length: 16000, pricing_per_million_tokens: 0.12, description: "Optimized for legal retrieval and RAG" },
  // Multimodal
  { key: "voyage-multimodal-3.5", label: "Voyage Multimodal 3.5", dimensions: 1024, context_length: 32000, pricing_per_million_tokens: 0.12, description: "Rich multimodal embedding model for text + images + video" },
  // Open-weight model
  { key: "voyage-4-nano", label: "Voyage 4 Nano (open-weight)", dimensions: 1024, context_length: 32000, pricing_per_million_tokens: 0, description: "Open-weight model available on Hugging Face" },
];

/** Cohere embedding models — sourced from https://docs.cohere.com/docs/models#embedding */
const COHERE_MODELS = [
  { key: "embed-english-v3.0", label: "Embed English v3.0", dimensions: 1024, description: "State-of-the-art English embedding model" },
  { key: "embed-multilingual-v3.0", label: "Embed Multilingual v3.0", dimensions: 1024, description: "Best-in-class multilingual embedding model" },
  { key: "embed-english-light-v3.0", label: "Embed English Light v3.0", dimensions: 384, description: "Fast and lightweight English embedding model" },
  { key: "embed-multilingual-light-v3.0", label: "Embed Multilingual Light v3.0", dimensions: 384, description: "Fast and lightweight multilingual embedding model" },
  { key: "embed-english-v2.0", label: "Embed English v2.0", dimensions: 4096, description: "Legacy English embedding model" },
  { key: "embed-multilingual-v2.0", label: "Embed Multilingual v2.0", dimensions: 768, description: "Legacy multilingual embedding model" },
];

/** Pinecone cloud regions — sourced from https://docs.pinecone.io/guides/index-data/create-an-index#cloud-regions */
const PINECONE_ENVIRONMENTS = [
  { key: "aws-us-east-1", label: "AWS - US East (Virginia) - Starter, Standard, Enterprise", cloud: "aws", region: "us-east-1" },
  { key: "aws-us-west-2", label: "AWS - US West (Oregon) - Standard, Enterprise", cloud: "aws", region: "us-west-2" },
  { key: "aws-eu-west-1", label: "AWS - EU West (Ireland) - Standard, Enterprise", cloud: "aws", region: "eu-west-1" },
  { key: "gcp-us-central1", label: "GCP - US Central (Iowa) - Standard, Enterprise", cloud: "gcp", region: "us-central1" },
  { key: "gcp-europe-west4", label: "GCP - Europe West (Netherlands) - Standard, Enterprise", cloud: "gcp", region: "europe-west4" },
  { key: "azure-eastus2", label: "Azure - East US 2 (Virginia) - Standard, Enterprise", cloud: "azure", region: "eastus2" },
];

/** OpenRouter PDF processing engine options — these are plugin config, not dynamic https://openrouter.ai/docs/guides/overview/multimodal/pdfs */ 
const PDF_ENGINES = [
  { key: "native", label: "Native (No extra plugin cost — uses model's vision)", description: "Sends PDF page as base64 images to the multimodal model" },
  { key: "pdf-text", label: "PDF-Text (extracts text from well-structured PDFs, free)", description: "Pre-extracts text before sending to model" },
  { key: "mistral-ocr", label: "Mistral OCR (best for scanned docs / images, $2/1000 pages)", description: "Uses Mistral's OCR service" },
];

// ─── API response types ─────────────────────────────────────────────────

interface RawModel {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  pricing?: {
    prompt?: string;
    completion?: string;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

/** Parse dimensions from model description (e.g. "768-dimensional") */
function parseDimensionsFromDescription(description: string): number | null {
  const match = description.match(/(\d+)-dim/);
  return match ? parseInt(match[1], 10) : null;
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log("🔄 Fetching models from OpenRouter...\n");

  // ── 1. Embedding models ───────────────────────────────────────────────
  console.log("  → Fetching embedding models from /embeddings/models...");

  const embRes = await fetch(`${OPENROUTER_API_URL}/embeddings/models`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!embRes.ok) {
    console.error(`❌ Embedding models API returned ${embRes.status}: ${embRes.statusText}`);
    process.exit(1);
  }

  const embJson = await embRes.json();
  const rawEmbModels: RawModel[] = embJson.data ?? [];
  console.log(`    Found ${rawEmbModels.length} embedding models`);

  const embeddingModels = rawEmbModels
    .filter((m) => m.id && m.architecture)
    .map((m) => {
      const descDims = parseDimensionsFromDescription(m.description ?? "");
      const fallbackDims = DIMENSION_FALLBACKS[m.id] ?? null;
      return {
        id: m.id,
        name: m.name ?? m.id,
        input_modalities: m.architecture?.input_modalities ?? ["text"],
        output_modalities: m.architecture?.output_modalities ?? ["embeddings"],
        context_length: m.context_length ?? 0,
        dimensions: descDims ?? fallbackDims,
        pricing: {
          prompt: m.pricing?.prompt ?? "0",
          completion: m.pricing?.completion ?? "0",
        },
      };
    });

  // Sort: default model first, then alphabetical
  embeddingModels.sort((a, b) => {
    if (a.id === "qwen/qwen3-embedding-8b") return -1;
    if (b.id === "qwen/qwen3-embedding-8b") return 1;
    return a.name.localeCompare(b.name);
  });

  // Report dimension coverage
  const withDims = embeddingModels.filter((m) => m.dimensions !== null);
  const withoutDims = embeddingModels.filter((m) => m.dimensions === null);
  console.log(`    ${withDims.length} with known dimensions, ${withoutDims.length} without`);
  if (withoutDims.length > 0) {
    console.log(`    ⚠ Missing dimensions for: ${withoutDims.map((m) => m.id).join(", ")}`);
    console.log(`      Add them to DIMENSION_FALLBACKS in this script and re-run.`);
  }

  // ── 2. Parsing models (multimodal) ────────────────────────────────────
  console.log("\n  → Fetching parsing models from /models...");

  const modRes = await fetch(`${OPENROUTER_API_URL}/models`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!modRes.ok) {
    console.error(`❌ Models API returned ${modRes.status}: ${modRes.statusText}`);
    process.exit(1);
  }

  const modJson = await modRes.json();
  const rawModels: RawModel[] = modJson.data ?? [];

  // Filter for multimodal models — accept image, file, audio, or video
  const parsingModels: Record<string, { id: string; name: string; input_modalities: string[] }> = {};
  for (const m of rawModels) {
    const inputMods = m.architecture?.input_modalities ?? [];
    if (m.id && inputMods.some((mod) => ["image", "file", "audio", "video"].includes(mod))) {
      parsingModels[m.id] = {
        id: m.id,
        name: m.name ?? m.id,
        input_modalities: inputMods,
      };
    }
  }

  console.log(`    Found ${Object.keys(parsingModels).length} multimodal parsing models`);

  // ── 3. Write output ───────────────────────────────────────────────────
  const output = {
    _generated: `Auto-generated by scripts/update-models.ts on ${new Date().toISOString()}. Do not edit manually. Run \`npm run update-models\` to refresh.`,
    openrouterEmbeddingModels: embeddingModels,
    openrouterParsingModels: parsingModels,
    voyageModels: VOYAGE_MODELS,
    cohereModels: COHERE_MODELS,
    pineconeEnvironments: PINECONE_ENVIRONMENTS,
    pdfEngines: PDF_ENGINES,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf-8");

  console.log("\n✅ Written to: app/lib/generated/models-data.json");
  console.log(`   ${embeddingModels.length} OpenRouter embedding models`);
  console.log(`   ${Object.keys(parsingModels).length} OpenRouter parsing models (fallback)`);
  console.log(`   ${VOYAGE_MODELS.length} Voyage AI models`);
  console.log(`   ${COHERE_MODELS.length} Cohere models`);
  console.log(`   ${PINECONE_ENVIRONMENTS.length} Pinecone environments`);
  console.log(`   ${PDF_ENGINES.length} PDF engines`);

  // Print embedding models summary table
  console.log("\n── OpenRouter Embedding Models ──");
  console.log("Model ID".padEnd(45) + "Dims".padEnd(8) + "Ctx".padEnd(10) + "Input $/M");
  console.log("─".repeat(75));
  for (const m of embeddingModels) {
    const dims = m.dimensions !== null ? String(m.dimensions) : "—";
    const ctx = m.context_length >= 1000 ? `${Math.round(m.context_length / 1000)}k` : String(m.context_length);
    const price = parseFloat(m.pricing.prompt) * 1_000_000;
    const priceStr = price === 0 ? "Free" : `$${price.toFixed(4)}`;
    console.log(m.id.padEnd(45) + dims.padEnd(8) + ctx.padEnd(10) + priceStr);
  }
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
