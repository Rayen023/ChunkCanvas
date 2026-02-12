import { getEncoding } from "js-tiktoken";

/**
 * A fast, lightweight tokenizer using the o200k_base encoding (optimized for GPT-4o).
 * We use a singleton encoder to avoid re-initializing it on every call.
 */
let encoder: ReturnType<typeof getEncoding> | null = null;

function getEncoder() {
  if (!encoder) {
    encoder = getEncoding("o200k_base");
  }
  return encoder;
}

/**
 * Counts the number of tokens in a string.
 */
export function countTokens(text: string | null | undefined): number {
  if (!text) return 0;
  try {
    return getEncoder().encode(text).length;
  } catch (e) {
    console.error("Tokenization error:", e);
    // Fallback to a rough approximation if tokenization fails
    return Math.ceil(text.length / 4);
  }
}
