"use client";

import { useEffect } from "react";
import { useAppStore } from "@/app/lib/store";

/**
 * Reads NEXT_PUBLIC_* env vars and injects them into the Zustand store.
 * Must be rendered once in the app tree (layout or page).
 */
export default function EnvLoader() {
  const setEnvKeys = useAppStore((s) => s.setEnvKeys);
  const setOpenrouterApiKey = useAppStore((s) => s.setOpenrouterApiKey);
  const setVoyageApiKey = useAppStore((s) => s.setVoyageApiKey);
  const setCohereApiKey = useAppStore((s) => s.setCohereApiKey);
  const setPineconeApiKey = useAppStore((s) => s.setPineconeApiKey);
  const setChromaApiKey = useAppStore((s) => s.setChromaApiKey);
  const setChromaTenant = useAppStore((s) => s.setChromaTenant);
  const setChromaDatabase = useAppStore((s) => s.setChromaDatabase);

  useEffect(() => {
    const or = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ?? "";
    const va = process.env.NEXT_PUBLIC_VOYAGEAI_API_KEY ?? "";
    const co = process.env.NEXT_PUBLIC_COHERE_API_KEY ?? "";
    const pc = process.env.NEXT_PUBLIC_PINECONE_API_KEY ?? "";
    const ck = process.env.NEXT_PUBLIC_CHROMA_API_KEY ?? "";
    const ct = process.env.NEXT_PUBLIC_CHROMA_TENANT ?? "";
    const cd = process.env.NEXT_PUBLIC_CHROMA_DATABASE ?? "";

    setEnvKeys({ openrouter: or, voyage: va, cohere: co, pinecone: pc });

    // Pre-fill if not already set
    if (or) setOpenrouterApiKey(or);
    if (va) setVoyageApiKey(va);
    if (co) setCohereApiKey(co);
    if (pc) setPineconeApiKey(pc);
    if (ck) setChromaApiKey(ck);
    if (ct) setChromaTenant(ct);
    if (cd) setChromaDatabase(cd);
  }, [
    setEnvKeys,
    setOpenrouterApiKey,
    setVoyageApiKey,
    setCohereApiKey,
    setPineconeApiKey,
    setChromaApiKey,
    setChromaTenant,
    setChromaDatabase,
  ]);

  return null;
}
