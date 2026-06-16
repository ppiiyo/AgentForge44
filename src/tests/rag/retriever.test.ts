import { describe, it, expect } from 'vitest';
import { indexLibraryDocument, searchIndexedLibrary } from '../../api/advancedPhase4.js';

describe('RAG Knowledge Library / Retriever Unit Suite', () => {
  it('should successfully index documents into overlapping chunks', async () => {
    const rawText = "This is a detailed article discussing standard visual low-code orchestrator development for multi-agent LLM systems. AgentForge44 relies on clean modular design principles to operate at super high performance benchmarks, resolving state dependencies with local SQLite in-memory tables.";
    
    const indexing = await indexLibraryDocument(rawText, "System Documentation Manual");
    
    expect(indexing.success).toBe(true);
    expect(indexing.chunkCount).toBeGreaterThan(0);
  });

  it('should search indexed documents and rank by Jaccard similarity', async () => {
    // Index specific documents
    await indexLibraryDocument("Rust language is loved for memory safety, concurrency, performance and low overhead compile restrictions.", "Rust Guide");
    await indexLibraryDocument("Deep neural network architectures require substantial hardware power and prompt caching techniques.", "AI Book");
    
    // Search with Rust keywords
    const searchRust = await searchIndexedLibrary("Rust safety performance", 1);
    expect(searchRust.chunks.length).toBe(1);
    expect(searchRust.chunks[0].source).toBe("Rust Guide");
    expect(searchRust.chunks[0].text).toContain("memory safety");

    // Search with AI / Hardware keywords
    const searchHardware = await searchIndexedLibrary("neural hardware architectures cached", 1);
    expect(searchHardware.chunks.length).toBe(1);
    expect(searchHardware.chunks[0].source).toBe("AI Book");
  });

  it('should respect top-K limit parameters on search outcomes', async () => {
    await indexLibraryDocument("Doc segment key one", "Source A");
    await indexLibraryDocument("Doc segment key two", "Source B");
    await indexLibraryDocument("Doc segment key three", "Source C");

    const searchLimit1 = await searchIndexedLibrary("key", 1);
    expect(searchLimit1.chunks.length).toBe(1);

    const searchLimit2 = await searchIndexedLibrary("key", 2);
    expect(searchLimit2.chunks.length).toBe(2);
  });

  it('should fall back gracefully to first documents if query intersects with nothing', async () => {
    const fallbackResults = await searchIndexedLibrary("totally-unrelated-random-word-xyz-123", 2);
    expect(fallbackResults.chunks).toBeDefined();
    expect(fallbackResults.chunks.length).toBeLessThanOrEqual(2);
  });
});
