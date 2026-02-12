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
  return docs.map((d) => d.pageContent);
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
    const docs = await splitter.createDocuments([String(row)], [{ filename }]);
    allChunks.push(...docs.map((d) => d.pageContent));
  }
  return allChunks;
}
