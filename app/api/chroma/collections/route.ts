import { NextRequest, NextResponse } from "next/server";

type ChromaMode = "local" | "cloud";

type Metadata = Record<string, unknown>;

const DEFAULT_LOCAL_URL = process.env.CHROMA_LOCAL_URL || "http://localhost:8000";
const DEFAULT_TENANT = "default_tenant";
const DEFAULT_DATABASE = "default_database";
const DEFAULT_CLOUD_HOST = "https://api.trychroma.com";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function parseMode(value: string | null): ChromaMode {
  return value === "cloud" ? "cloud" : "local";
}

function resolveCloudAuth(opts: {
  apiKey?: string;
  tenant?: string;
  database?: string;
}): { apiKey: string; tenant: string; database: string } {
  const apiKey = opts.apiKey || process.env.CHROMA_API_KEY || process.env.NEXT_PUBLIC_CHROMA_API_KEY;
  const tenant = opts.tenant || process.env.CHROMA_TENANT || process.env.NEXT_PUBLIC_CHROMA_TENANT;
  const database = opts.database || process.env.CHROMA_DATABASE || process.env.NEXT_PUBLIC_CHROMA_DATABASE;

  if (!apiKey || !tenant || !database) {
    throw new Error(
      "Missing Chroma Cloud credentials. Provide apiKey/tenant/database (or set CHROMA_API_KEY, CHROMA_TENANT, CHROMA_DATABASE).",
    );
  }

  return { apiKey, tenant, database };
}

function resolveConnection(args: {
  mode: ChromaMode;
  localUrl?: string;
  cloudApiKey?: string;
  cloudTenant?: string;
  cloudDatabase?: string;
}): { baseUrl: string; apiKey?: string; tenant: string; database: string } {
  if (args.mode === "cloud") {
    const cloud = resolveCloudAuth({
      apiKey: args.cloudApiKey,
      tenant: args.cloudTenant,
      database: args.cloudDatabase,
    });
    return {
      baseUrl: DEFAULT_CLOUD_HOST,
      apiKey: cloud.apiKey,
      tenant: cloud.tenant,
      database: cloud.database,
    };
  }

  return {
    baseUrl: normalizeBaseUrl(args.localUrl?.trim() || DEFAULT_LOCAL_URL),
    tenant: DEFAULT_TENANT,
    database: DEFAULT_DATABASE,
  };
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
  const timeoutMs = init.timeoutMs ?? 15_000;
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

interface CreateCollectionRequest {
  mode: ChromaMode;
  localUrl?: string;
  cloudApiKey?: string;
  cloudTenant?: string;
  cloudDatabase?: string;
  name: string;
  metadata?: Metadata;
  getOrCreate?: boolean;
}

type ChromaCollectionListItem = {
  id: string;
  name: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = parseMode(searchParams.get("mode"));
    const localUrl = searchParams.get("localUrl") ?? undefined;

    const cloudApiKey = request.headers.get("x-chroma-api-key") ?? undefined;
    const cloudTenant = request.headers.get("x-chroma-tenant") ?? undefined;
    const cloudDatabase = request.headers.get("x-chroma-database") ?? undefined;

    const conn = resolveConnection({
      mode,
      localUrl,
      cloudApiKey,
      cloudTenant,
      cloudDatabase,
    });

    const url = new URL(
      `${normalizeBaseUrl(conn.baseUrl)}/api/v2/tenants/${encodeURIComponent(conn.tenant)}/databases/${encodeURIComponent(conn.database)}/collections`,
    );
    url.searchParams.set("limit", "500");
    url.searchParams.set("offset", "0");

    const data = await chromaFetchJson<ChromaCollectionListItem[]>(url.toString(), {
      method: "GET",
      headers: conn.apiKey ? { "x-chroma-token": conn.apiKey } : undefined,
    });

    const collections = Array.isArray(data) ? data.map((c) => c.name) : [];

    return NextResponse.json({
      success: true,
      mode,
      collections,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to list collections",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateCollectionRequest = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, message: "Collection name is required" }, { status: 400 });
    }

    const name = body.name.trim();
    const mode = body.mode === "cloud" ? "cloud" : "local";

    const conn = resolveConnection({
      mode,
      localUrl: body.localUrl,
      cloudApiKey: body.cloudApiKey,
      cloudTenant: body.cloudTenant,
      cloudDatabase: body.cloudDatabase,
    });

    const url = `${normalizeBaseUrl(conn.baseUrl)}/api/v2/tenants/${encodeURIComponent(conn.tenant)}/databases/${encodeURIComponent(conn.database)}/collections`;
    const data = await chromaFetchJson<{ id: string; name: string }>(url, {
      method: "POST",
      headers: conn.apiKey ? { "x-chroma-token": conn.apiKey } : undefined,
      body: JSON.stringify({
        name,
        configuration: {},
        metadata: body.metadata,
        get_or_create: body.getOrCreate ?? true,
      }),
    });

    return NextResponse.json({
      success: true,
      mode,
      collection: {
        id: data.id,
        name: data.name,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create collection",
      },
      { status: 500 },
    );
  }
}
