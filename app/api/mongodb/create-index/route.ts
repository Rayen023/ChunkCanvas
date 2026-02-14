import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const { uri, database, collection, indexName, vectorField, dimensions, similarity } = await request.json();

    if (!uri || !database || !collection || !indexName || !vectorField || !dimensions || !similarity) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db(database);
      const coll = db.collection(collection);

      const indexDescription = {
        name: indexName,
        type: "vectorSearch",
        definition: {
          fields: [
            {
              type: "vector",
              numDimensions: dimensions,
              path: vectorField,
              similarity: similarity,
            },
          ],
        },
      };

      const result = await coll.createSearchIndex(indexDescription);

      return NextResponse.json({
        success: true,
        message: `Search index "${result}" created successfully`,
        indexName: result,
      });
    } finally {
      await client.close();
    }
  } catch (error) {
    console.error("MongoDB Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to create search index" },
      { status: 500 },
    );
  }
}
