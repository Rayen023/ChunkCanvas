import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const {
      uri,
      database,
      collection,
      documents,
      embeddings,
      metadatas,
      vectorField,
      textField,
      metadataField,
    } = await request.json();

    if (!uri || !database || !collection || !documents || !embeddings || !vectorField || !textField) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    if (documents.length !== embeddings.length) {
      return NextResponse.json({ success: false, message: "Documents and embeddings length mismatch" }, { status: 400 });
    }

    const client = new MongoClient(uri);
    try {
      await client.connect();
      const db = client.db(database);
      const coll = db.collection(collection);

      const operations = documents.map((doc: string, i: number) => {
        const metadata = metadatas ? metadatas[i] : {};
        return {
          [textField]: doc,
          [vectorField]: embeddings[i],
          [metadataField || "metadata"]: metadata,
        };
      });

      // Using insertMany for simplicity, could be bulkWrite with upsert if needed
      // But usually for new documents we just insert. 
      // If we want to replace existing, we'd need unique IDs.
      const result = await coll.insertMany(operations);

      return NextResponse.json({
        success: true,
        message: `Successfully uploaded ${result.insertedCount} documents to MongoDB`,
        insertedCount: result.insertedCount,
      });
    } finally {
      await client.close();
    }
  } catch (error) {
    console.error("MongoDB Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to upload to MongoDB" },
      { status: 500 },
    );
  }
}
