import { NextRequest, NextResponse } from "next/server";

type Metadata = Record<string, unknown>;

const DEFAULT_CLOUD_HOST = "https://api.trychroma.com";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function resolveCloudAuth(): { apiKey: string; tenant: string; database: string } {
  const apiKey = process.env.CHROMA_API_KEY || process.env.NEXT_PUBLIC_CHROMA_API_KEY;
  const tenant = process.env.CHROMA_TENANT || process.env.NEXT_PUBLIC_CHROMA_TENANT;
  const database = process.env.CHROMA_DATABASE || process.env.NEXT_PUBLIC_CHROMA_DATABASE;

  if (!apiKey || !tenant || !database) {
    throw new Error(
      "Missing Chroma Cloud credentials. Set CHROMA_API_KEY, CHROMA_TENANT, and CHROMA_DATABASE to use this example route.",
    );
  }

  return { apiKey, tenant, database };
}

async function chromaFetchJson<T>(
  input: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const messageFromJson = (value: unknown): string | null => {
    if (!value || typeof value !== "object") return null;
    if (!("message" in value)) return null;
    const msg = (value as Record<string, unknown>).message;
    return typeof msg === "string" ? msg : null;
  };

  const controller = new AbortController();
  const timeoutMs = init.timeoutMs ?? 30_000;
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });

    const text = await res.text();
    const json = text ? (JSON.parse(text) as unknown) : null;
    if (!res.ok) throw new Error(messageFromJson(json) || `HTTP ${res.status}`);
    return json as T;
  } finally {
    clearTimeout(id);
  }
}

interface AddDataRequest {
  ids: string[];
  documents?: string[];
  metadatas?: Metadata[];
  embeddings?: number[][];
  collectionName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: AddDataRequest = await request.json();

    if (!Array.isArray(data.ids) || data.ids.length === 0) {
      return NextResponse.json({ success: false, message: "ids are required" }, { status: 400 });
    }

    const collectionName = data.collectionName?.trim() || "myCollection";

    const cloud = resolveCloudAuth();
    const baseCollectionsUrl = `${normalizeBaseUrl(DEFAULT_CLOUD_HOST)}/api/v2/tenants/${encodeURIComponent(cloud.tenant)}/databases/${encodeURIComponent(cloud.database)}/collections`;

    const created = await chromaFetchJson<{ id: string; name: string }>(baseCollectionsUrl, {
      method: "POST",
      headers: { "x-chroma-token": cloud.apiKey },
      body: JSON.stringify({
        name: collectionName,
        configuration: {},
        get_or_create: true,
      }),
    });

    await chromaFetchJson<unknown>(`${baseCollectionsUrl}/${encodeURIComponent(created.id)}/upsert`, {
      method: "POST",
      headers: { "x-chroma-token": cloud.apiKey },
      body: JSON.stringify({
        ids: data.ids,
        embeddings: data.embeddings,
        documents: data.documents,
        metadatas: data.metadatas,
      }),
    });

    return NextResponse.json({
      success: true,
      message: "Data added successfully",
      data: {
        ids: data.ids,
        documents: data.documents,
        metadatas: data.metadatas,
        embeddings: data.embeddings,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to add data" },
      { status: 500 },
    );
  }
}
