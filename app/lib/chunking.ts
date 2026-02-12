/**
 * Text chunking using LangChain RecursiveCharacterTextSplitter.
 */
import type { ChunkingParams } from "./types";

export async function chunkText(
  text: string,
  params: ChunkingParams,
  filename: string,
): Promise<string[]> {
  if (params.chunkingType === "parent-child") {
    // Placeholder for Parent-Child Chunking
    // In a real implementation, this would generate hierarchical chunks
    return [
      `[PARENT-CHILD PLACEHOLDER] This is a placeholder for hierarchical chunking of: ${filename}`,
      `Original content length: ${text.length} characters.`,
      `Recursive parameters would have been: Size=${params.chunkSize}, Overlap=${params.chunkOverlap}`,
      `The full hierarchical implementation will be added in a future update.`,
    ];
  }

  // Fast-path: if the whole document fits in one chunk, don't let the splitter
  // create spurious empty/extra chunks based on separator boundaries.
  if (params.chunkSize >= text.length) {
    const only = text.trim().length > 0 ? [text] : [];
    return only;
  }

  const { RecursiveCharacterTextSplitter } = await import(
    "@langchain/textsplitters"
  );

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: params.chunkSize,
    chunkOverlap: params.chunkOverlap,
    lengthFunction: (t: string) => t.length,
    separators: params.separators,
  });

  const docs = await splitter.createDocuments([text], [{ filename }]);
  return docs
    .map((d) => d.pageContent)
    .filter((c) => c.trim().length > 0);
}

export async function chunkExcelRows(
  rows: string[],
  params: ChunkingParams,
  filename: string,
): Promise<string[]> {
  if (params.chunkingType === "parent-child") {
    return [
      `[PARENT-CHILD PLACEHOLDER] Hierarchical chunking for Excel rows from: ${filename}`,
      `Total rows: ${rows.length}`,
    ];
  }

  const { RecursiveCharacterTextSplitter } = await import(
    "@langchain/textsplitters"
  );

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: params.chunkSize,
    chunkOverlap: params.chunkOverlap,
    lengthFunction: (t: string) => t.length,
    separators: params.separators,
  });

  const allChunks: string[] = [];
  for (const row of rows) {
    const rowText = String(row);

    if (params.chunkSize >= rowText.length) {
      if (rowText.trim().length > 0) allChunks.push(rowText);
      continue;
    }

    const docs = await splitter.createDocuments([rowText], [{ filename }]);
    allChunks.push(
      ...docs
        .map((d) => d.pageContent)
        .filter((c) => c.trim().length > 0),
    );
  }
  return allChunks;
}
