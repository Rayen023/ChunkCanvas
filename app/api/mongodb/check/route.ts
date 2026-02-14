import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { MongodbIndex } from "@/app/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { uri, database, collection } = await request.json();

    if (!uri) {
      return NextResponse.json({ success: false, message: "Missing URI" }, { status: 400 });
    }

    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    
    try {
      await client.connect();
      // Ping the database to confirm connection
      await client.db("admin").command({ ping: 1 });
      
      // List databases
      const dbsResult = await client.db().admin().listDatabases();
      const databases = dbsResult.databases.map(db => db.name).filter(name => !["admin", "local", "config"].includes(name));

      let collections: string[] = [];
      let indexes: MongodbIndex[] = [];

      if (database) {
        const db = client.db(database);
        const collsResult = await db.listCollections().toArray();
        collections = collsResult.map(c => c.name);

        if (collection && collections.includes(collection)) {
          const coll = db.collection(collection);
          try {
            // Get full index objects
            indexes = await coll.listSearchIndexes().toArray() as unknown as MongodbIndex[];
          } catch (e) {
            console.error("Error listing search indexes (might not be Atlas 7.0+):", e);
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        message: "MongoDB Atlas is reachable",
        databases,
        collections,
        indexes, // Now returning full objects
      });
    } finally {
      await client.close();
    }
  } catch (error) {
    console.error("MongoDB Check Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to connect to MongoDB" },
      { status: 500 },
    );
  }
}
