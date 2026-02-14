"use client";

import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/app/lib/store";
import { PIPELINE } from "@/app/lib/constants";
import ActionRow from "@/app/components/downloads/ActionRow";
import StatusMessage from "@/app/components/shared/StatusMessage";
import type { ScriptConfig } from "@/app/lib/script-generator";

export default function MongodbSection() {
  const editedChunks = useAppStore((s) => s.editedChunks);
  const chunkSourceFiles = useAppStore((s) => s.chunkSourceFiles);
  const parsedFilename = useAppStore((s) => s.parsedFilename);
  const embeddingsData = useAppStore((s) => s.embeddingsData);
  const chunksHash = useAppStore((s) => s.chunksHash);
  const embeddingsForChunksHash = useAppStore((s) => s.embeddingsForChunksHash);
  const pipeline = useAppStore((s) => s.pipeline);
  
  // Script dependencies
  const chunkingParams = useAppStore((s) => s.chunkingParams);
  const openrouterModel = useAppStore((s) => s.openrouterModel);
  const openrouterPrompt = useAppStore((s) => s.openrouterPrompt);
  const pdfEngine = useAppStore((s) => s.pdfEngine);
  const excelColumn = useAppStore((s) => s.excelColumn);
  const excelSheet = useAppStore((s) => s.excelSheet);
  const embeddingProvider = useAppStore((s) => s.embeddingProvider);
  const voyageModel = useAppStore((s) => s.voyageModel);
  const cohereModel = useAppStore((s) => s.cohereModel);
  const openrouterEmbeddingModel = useAppStore((s) => s.openrouterEmbeddingModel);
  const embeddingDimensions = useAppStore((s) => s.embeddingDimensions);

  const mongodbUri = useAppStore((s) => s.mongodbUri);
  const mongodbDatabases = useAppStore((s) => s.mongodbDatabases);
  const mongodbCollections = useAppStore((s) => s.mongodbCollections);
  const mongodbIndexes = useAppStore((s) => s.mongodbIndexes);
  const mongodbFieldMapping = useAppStore((s) => s.mongodbFieldMapping);
  const isUploading = useAppStore((s) => s.isUploadingMongodb);
  const mongodbError = useAppStore((s) => s.mongodbError);
  const mongodbSuccess = useAppStore((s) => s.mongodbSuccess);

  const setMongodbUri = useAppStore((s) => s.setMongodbUri);
  const setMongodbDatabases = useAppStore((s) => s.setMongodbDatabases);
  const setMongodbCollections = useAppStore((s) => s.setMongodbCollections);
  const setMongodbIndexes = useAppStore((s) => s.setMongodbIndexes);
  const setMongodbFieldMapping = useAppStore((s) => s.setMongodbFieldMapping);
  const setIsUploading = useAppStore((s) => s.setIsUploadingMongodb);
  const setMongodbError = useAppStore((s) => s.setMongodbError);
  const setMongodbSuccess = useAppStore((s) => s.setMongodbSuccess);

  const [creatingIndex, setCreatingIndex] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const hasEmbeddings =
    !!embeddingsData &&
    embeddingsData.length === editedChunks.length &&
    !!embeddingsForChunksHash &&
    embeddingsForChunksHash === chunksHash;

  const refreshResources = useCallback(async (db?: string, coll?: string) => {
    if (!mongodbUri) return;
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/mongodb/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          uri: mongodbUri, 
          database: db || mongodbFieldMapping.database,
          collection: coll || mongodbFieldMapping.collection
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMongodbDatabases(json.databases || []);
        setMongodbCollections(json.collections || []);
        setMongodbIndexes(json.indexes || []);
      }
    } catch (e) {
      console.error("Failed to refresh MongoDB resources", e);
    } finally {
      setIsRefreshing(false);
    }
  }, [mongodbUri, mongodbFieldMapping.database, mongodbFieldMapping.collection, setMongodbDatabases, setMongodbCollections, setMongodbIndexes]);

  // Initial fetch
  useEffect(() => {
    if (mongodbUri) {
      refreshResources();
    }
  }, [mongodbUri, refreshResources]);

  const handleGenerateScript = useCallback(async () => {
    setGeneratingScript(true);
    try {
      const { generatePipelineScript } = await import("@/app/lib/script-generator");
      const { downloadZip } = await import("@/app/lib/downloads");

      const isSpreadsheet = pipeline === PIPELINE.EXCEL_SPREADSHEET || pipeline === PIPELINE.CSV_SPREADSHEET;

      const config: ScriptConfig = {
        pipeline,
        chunkingParams,
        filename: parsedFilename,
        openrouterModel,
        openrouterPrompt,
        pdfEngine,
        excelColumn: isSpreadsheet ? excelColumn : undefined,
        excelSheet: isSpreadsheet ? excelSheet : undefined,
        embeddingProvider,
        voyageModel,
        cohereModel,
        openrouterEmbeddingModel,
        embeddingDimensions,
        mongodbDatabase: mongodbFieldMapping.database,
        mongodbCollection: mongodbFieldMapping.collection,
        mongodbIndexName: mongodbFieldMapping.indexName,
        mongodbVectorField: mongodbFieldMapping.vectorField,
        mongodbTextField: mongodbFieldMapping.textField,
      };

      const files = generatePipelineScript("mongodb", config);
      const stem = parsedFilename.replace(/\.[^.]+$/, "") || "document";
      await downloadZip(files as unknown as Record<string, string>, `${stem}_mongodb_pipeline.zip`);
    } finally {
      setGeneratingScript(false);
    }
  }, [
    pipeline, chunkingParams, parsedFilename, openrouterModel, openrouterPrompt,
    pdfEngine, excelColumn, excelSheet, embeddingProvider, voyageModel, cohereModel,
    openrouterEmbeddingModel, embeddingDimensions, mongodbFieldMapping
  ]);

  const handleCreateIndex = async () => {
    if (!mongodbUri || !mongodbFieldMapping.indexName) return;
    setCreatingIndex(true);
    setMongodbError(null);
    setMongodbSuccess(null);

    try {
      const res = await fetch("/api/mongodb/create-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: mongodbUri,
          database: mongodbFieldMapping.database,
          collection: mongodbFieldMapping.collection,
          indexName: mongodbFieldMapping.indexName,
          vectorField: mongodbFieldMapping.vectorField,
          dimensions: mongodbFieldMapping.dimensions,
          similarity: mongodbFieldMapping.similarity,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to create index");
      setMongodbSuccess(json.message);
      refreshResources();
    } catch (err) {
      setMongodbError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingIndex(false);
    }
  };

  const handleUpload = async () => {
    if (!mongodbUri || editedChunks.length === 0 || !hasEmbeddings || !embeddingsData) return;
    setIsUploading(true);
    setMongodbError(null);
    setMongodbSuccess(null);

    try {
      const metadatas = editedChunks.map((_, i) => ({
        filename: chunkSourceFiles[i] || parsedFilename,
        chunk_index: i,
      }));

      const res = await fetch("/api/mongodb/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri: mongodbUri,
          database: mongodbFieldMapping.database,
          collection: mongodbFieldMapping.collection,
          documents: editedChunks,
          embeddings: embeddingsData,
          metadatas: metadatas,
          vectorField: mongodbFieldMapping.vectorField,
          textField: mongodbFieldMapping.textField,
          metadataField: mongodbFieldMapping.metadataField,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to upload chunks");
      setMongodbSuccess(json.message);
    } catch (err) {
      setMongodbError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUploading(false);
    }
  };

  const selectedIndex = mongodbIndexes.find(idx => idx.name === mongodbFieldMapping.indexName);
  const indexExists = !!selectedIndex;

  // Extract info from index definition if available
  const getIndexDetails = (idx: import("@/app/lib/types").MongodbIndex | undefined) => {
    if (!idx || !idx.latestDefinition) return null;
    const def = idx.latestDefinition;
    const vectorField = def.fields?.find((f) => f.type === "vector");
    if (!vectorField) return null;
    return {
      dimensions: vectorField.numDimensions,
      similarity: vectorField.similarity,
      path: vectorField.path
    };
  };

  const indexDetails = getIndexDetails(selectedIndex);

  const actualDimensions = embeddingsData?.[0]?.length || 0;
  const dimensionMismatch = !!(indexExists && indexDetails && actualDimensions > 0 && actualDimensions !== indexDetails.dimensions);
  const configDimensionMismatch = actualDimensions > 0 && mongodbFieldMapping.dimensions !== actualDimensions;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gunmetal mb-1">
            MongoDB Atlas Connection String (URI)
          </label>
          <input
            type="password"
            value={mongodbUri}
            onChange={(e) => setMongodbUri(e.target.value)}
            placeholder="mongodb+srv://<user>:<password>@cluster.mongodb.net/..."
            className="w-full rounded-lg border border-silver px-3 py-2 text-sm focus:ring-2 focus:ring-sandy/50 focus:border-sandy outline-none font-mono"
          />
          <p className="text-[10px] text-silver-dark mt-1">
            Database and collections must be created via <a href="https://cloud.mongodb.com" target="_blank" rel="noopener noreferrer" className="text-sandy hover:underline">MongoDB Atlas dashboard</a>.
          </p>
        </div>

        {/* Database Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-gunmetal-light">Select Database</label>
            <button
              onClick={() => refreshResources()}
              disabled={isRefreshing || !mongodbUri}
              className="text-[10px] text-sandy hover:underline disabled:opacity-50"
            >
              {isRefreshing ? "Refreshing..." : "Refresh list"}
            </button>
          </div>

          {mongodbDatabases.length === 0 ? (
            <div className="p-3 border border-dashed border-silver rounded-lg text-center">
              <p className="text-[10px] text-silver-dark italic">No databases found or URI not provided.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mongodbDatabases.map((db) => {
                const isSelected = mongodbFieldMapping.database === db;
                return (
                  <button
                    key={db}
                    onClick={() => {
                      setMongodbFieldMapping({ database: db });
                      refreshResources(db);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${isSelected
                      ? "border-sandy bg-sandy/10 text-gunmetal ring-2 ring-sandy/30"
                      : "border-silver-light hover:border-sandy/50 hover:bg-sandy/4 text-gunmetal-light"
                    }`}
                  >
                    {db}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Collection Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-gunmetal-light">Select Collection</label>
          </div>

          {mongodbCollections.length === 0 ? (
            <div className="p-3 border border-dashed border-silver rounded-lg text-center">
              <p className="text-[10px] text-silver-dark italic">Select a database to see collections.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mongodbCollections.map((coll) => {
                const isSelected = mongodbFieldMapping.collection === coll;
                return (
                  <button
                    key={coll}
                    onClick={() => {
                      setMongodbFieldMapping({ collection: coll });
                      refreshResources(mongodbFieldMapping.database, coll);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${isSelected
                      ? "border-sandy bg-sandy/10 text-gunmetal ring-2 ring-sandy/30"
                      : "border-silver-light hover:border-sandy/50 hover:bg-sandy/4 text-gunmetal-light"
                    }`}
                  >
                    {coll}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Index Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gunmetal-light">Select Atlas Vector Search Index</label>
          {mongodbIndexes.length === 0 ? (
             <div className="p-3 border border-dashed border-silver rounded-lg text-center">
               <p className="text-[10px] text-silver-dark italic">No vector search indexes found on this collection.</p>
             </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mongodbIndexes.map((idx) => {
                const isSelected = mongodbFieldMapping.indexName === idx.name;
                return (
                  <button
                    key={idx.name}
                    onClick={() => setMongodbFieldMapping({ indexName: idx.name })}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${isSelected
                      ? "border-sandy bg-sandy/10 text-gunmetal ring-2 ring-sandy/30"
                      : "border-silver-light hover:border-sandy/50 hover:bg-sandy/4 text-gunmetal-light"
                    }`}
                  >
                    {idx.name}
                  </button>
                );
              })}
            </div>
          )}

          {indexExists && indexDetails && (
            <div className={`p-3 rounded-lg space-y-2 animate-in fade-in slide-in-from-top-1 border ${dimensionMismatch ? 'bg-amber-50/50 border-amber-200' : 'bg-green-50/50 border-green-200'}`}>
               <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${dimensionMismatch ? 'text-amber-700' : 'text-green-700'}`}>Index Details</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${selectedIndex.status === 'READY' ? (dimensionMismatch ? 'bg-amber-200 text-amber-800' : 'bg-green-200 text-green-800') : 'bg-yellow-200 text-yellow-800'}`}>
                    {selectedIndex.status}
                  </span>
               </div>
               <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-0.5">
                    <p className={`text-[9px] font-medium ${dimensionMismatch ? 'text-amber-600' : 'text-green-600'}`}>Metric</p>
                    <p className={`text-xs font-semibold font-mono capitalize ${dimensionMismatch ? 'text-amber-800' : 'text-green-800'}`}>{indexDetails.similarity}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className={`text-[9px] font-medium ${dimensionMismatch ? 'text-amber-600' : 'text-green-600'}`}>Dimensions</p>
                    <p className={`text-xs font-semibold font-mono ${dimensionMismatch ? 'text-red-600' : 'text-green-800'}`}>{indexDetails.dimensions}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className={`text-[9px] font-medium ${dimensionMismatch ? 'text-amber-600' : 'text-green-600'}`}>Vector Path</p>
                    <p className={`text-xs font-semibold font-mono truncate ${dimensionMismatch ? 'text-amber-800' : 'text-green-800'}`}>{indexDetails.path}</p>
                  </div>
               </div>
               {dimensionMismatch && (
                 <div className="pt-2 border-t border-amber-200 mt-1">
                   <p className="text-[10px] text-amber-800 leading-tight">
                     <span className="font-bold">Dimension Mismatch:</span> The selected index has {indexDetails.dimensions} dimensions, but your generated embeddings have {actualDimensions} dimensions.
                   </p>
                 </div>
               )}
            </div>
          )}
        </div>

        <details className="group rounded-lg border border-silver-light overflow-hidden">
          <summary className="cursor-pointer list-none flex items-center gap-2 bg-card px-4 py-3 hover:bg-sandy/4 transition-colors">
            <svg className="h-4 w-4 text-sandy flex-shrink-0 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-medium text-gunmetal">Configuration & Manual Mapping</span>
          </summary>
          <div className="border-t border-silver-light bg-gray-50 dark:bg-white/5 px-4 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gunmetal-light mb-1">
                  Vector Index Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={mongodbFieldMapping.indexName}
                    onChange={(e) => setMongodbFieldMapping({ indexName: e.target.value })}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-sandy/50 focus:border-sandy outline-none ${indexExists ? "border-green-500 bg-green-50/30" : "border-silver"}`}
                  />
                  {indexExists && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-green-600">
                      FOUND
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gunmetal-light mb-1">
                  Vector Field Name
                </label>
                <input
                  type="text"
                  value={mongodbFieldMapping.vectorField}
                  onChange={(e) => setMongodbFieldMapping({ vectorField: e.target.value })}
                  className="w-full rounded-lg border border-silver px-3 py-2 text-sm focus:ring-2 focus:ring-sandy/50 focus:border-sandy outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gunmetal-light mb-1">
                  Text Field Name
                </label>
                <input
                  type="text"
                  value={mongodbFieldMapping.textField}
                  onChange={(e) => setMongodbFieldMapping({ textField: e.target.value })}
                  className="w-full rounded-lg border border-silver px-3 py-2 text-sm focus:ring-2 focus:ring-sandy/50 focus:border-sandy outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gunmetal-light mb-1">
                  Metadata Field Name
                </label>
                <input
                  type="text"
                  value={mongodbFieldMapping.metadataField}
                  onChange={(e) => setMongodbFieldMapping({ metadataField: e.target.value })}
                  className="w-full rounded-lg border border-silver px-3 py-2 text-sm focus:ring-2 focus:ring-sandy/50 focus:border-sandy outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gunmetal-light mb-1">
                  Dimensions
                </label>
                <input
                  type="number"
                  value={mongodbFieldMapping.dimensions}
                  onChange={(e) => setMongodbFieldMapping({ dimensions: Number(e.target.value) })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-sandy/50 focus:border-sandy outline-none ${configDimensionMismatch ? 'border-amber-500 bg-amber-50/30' : 'border-silver'}`}
                />
                {configDimensionMismatch && (
                  <p className="text-[10px] text-amber-600 mt-1 font-medium italic">
                    Note: Embeddings have {actualDimensions}d.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gunmetal-light mb-1">
                  Similarity
                </label>
                <select
                  value={mongodbFieldMapping.similarity}
                  onChange={(e) => setMongodbFieldMapping({ similarity: e.target.value as "cosine" | "euclidean" | "dotProduct" })}
                  className="w-full rounded-lg border border-silver px-3 py-2 text-sm focus:ring-2 focus:ring-sandy/50 focus:border-sandy outline-none bg-white"
                >
                  <option value="cosine">Cosine</option>
                  <option value="euclidean">Euclidean</option>
                  <option value="dotProduct">Dot Product</option>
                </select>
              </div>
            </div>
            
            {!indexExists && (
              <button
                onClick={handleCreateIndex}
                disabled={!mongodbUri || creatingIndex || !mongodbFieldMapping.database || !mongodbFieldMapping.collection}
                className={`w-full rounded-lg px-3 py-2.5 text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 bg-sandy text-white hover:bg-sandy-dark active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {creatingIndex ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating Index...
                  </>
                ) : (
                  "Create Atlas Vector Search Index"
                )}
              </button>
            )}
          </div>
        </details>
      </div>

      {!hasEmbeddings && (
        <StatusMessage type="warning" label="Note:">
          You must generate embeddings in the Embeddings step above before uploading.
        </StatusMessage>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleUpload}
          disabled={!mongodbUri || !hasEmbeddings || isUploading || editedChunks.length === 0 || !mongodbFieldMapping.database || !mongodbFieldMapping.collection || dimensionMismatch}
          className="flex items-center justify-center gap-2 rounded-lg bg-sandy px-4 py-3 text-sm font-medium text-white hover:bg-sandy-light active:bg-sandy-dark disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
        >
          {isUploading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Chunks to MongoDB
            </>
          )}
        </button>

        {/* Script download */}
        <ActionRow
          onGenerateScript={handleGenerateScript}
          scriptLabel="Generate Script"
          isGeneratingScript={generatingScript}
          scriptOnly={true}
        />
      </div>

      {mongodbError && (
        <StatusMessage type="error" label="Error:">
          {mongodbError}
        </StatusMessage>
      )}
      {mongodbSuccess && (
        <StatusMessage type="success" label="Success:">
          {mongodbSuccess}
        </StatusMessage>
      )}
    </div>
  );
}
