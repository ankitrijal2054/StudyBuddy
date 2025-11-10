/**
 * Embedding Service
 *
 * Generates OpenAI embeddings for text chunks.
 * Uses text-embedding-3-small for efficiency and cost.
 */

const { OpenAI } = require("openai");

class EmbeddingService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.openai = new OpenAI({ apiKey });
    this.model = "text-embedding-3-small";
    this.retryAttempts = 3;
    this.retryDelay = 1000; // ms
  }

  /**
   * Embed a single text string
   *
   * @param {string} text - Text to embed
   * @returns {Promise<Array<number>>} 1536-dimensional embedding vector
   */
  async embedText(text) {
    if (!text || typeof text !== "string") {
      throw new Error("Invalid text input");
    }

    // Truncate to reasonable length for embedding
    const truncatedText = text.substring(0, 8192); // OpenAI's limit for embeddings

    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: truncatedText,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("No embedding returned from OpenAI");
      }

      return response.data[0].embedding;
    } catch (error) {
      throw new Error(`Embedding failed: ${error.message}`);
    }
  }

  /**
   * Embed multiple texts with retry logic and batching
   *
   * @param {Array<Object>} chunks - Chunks with {chunkText, metadata}
   * @param {number} batchSize - Number of embeddings per request
   * @returns {Promise<Array<Object>>} Chunks with embeddings
   */
  async batchEmbed(chunks, batchSize = 10) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      throw new Error("Chunks must be a non-empty array");
    }

    console.log(
      `\n🚀 Starting batch embedding (${chunks.length} chunks, batch size: ${batchSize})...`
    );

    const results = [];
    let processedCount = 0;

    // Process in batches
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map((c) => c.chunkText);

      let embedded = false;
      let lastError = null;

      // Retry logic
      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          console.log(
            `   Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
              chunks.length / batchSize
            )}...`
          );

          const response = await this.openai.embeddings.create({
            model: this.model,
            input: texts,
          });

          if (!response.data || response.data.length !== texts.length) {
            throw new Error(
              `Expected ${texts.length} embeddings, got ${response.data.length}`
            );
          }

          // Match embeddings back to chunks
          batch.forEach((chunk, idx) => {
            results.push({
              vector: response.data[idx].embedding,
              metadata: chunk.metadata,
              chunkText: chunk.chunkText,
            });
            processedCount++;
          });

          embedded = true;
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error;
          if (attempt < this.retryAttempts) {
            console.warn(
              `   ⚠️  Attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`
            );
            await this.delay(this.retryDelay);
          }
        }
      }

      if (!embedded) {
        throw new Error(
          `Failed to embed batch after ${this.retryAttempts} attempts: ${lastError.message}`
        );
      }

      // Show progress
      const progress = Math.round((processedCount / chunks.length) * 100);
      console.log(
        `   Progress: ${processedCount}/${chunks.length} (${progress}%)`
      );
    }

    console.log(
      `✅ Batch embedding complete: ${results.length} vectors generated\n`
    );
    return results;
  }

  /**
   * Embed a query for searching
   *
   * @param {string} query - Search query text
   * @returns {Promise<Array<number>>} Query embedding vector
   */
  async embedQuery(query) {
    if (!query || typeof query !== "string") {
      throw new Error("Invalid query input");
    }

    console.log(`   Embedding query: "${query.substring(0, 50)}..."`);
    return await this.embedText(query);
  }

  /**
   * Utility: Sleep/delay function
   *
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Verify embedding dimensions
   *
   * @param {Array<number>} embedding - Embedding vector
   * @returns {boolean} True if dimensions are correct
   */
  static verifyEmbedding(embedding) {
    return Array.isArray(embedding) && embedding.length === 1536;
  }

  /**
   * Estimate costs
   *
   * @param {number} numChunks - Number of chunks to embed
   * @returns {Object} Cost estimation
   */
  static estimateCost(numChunks) {
    // text-embedding-3-small pricing: $0.02 per 1M tokens
    // Average chunk: ~200 tokens (rough estimate)
    const estimatedTokens = numChunks * 200;
    const costPer1MTokens = 0.02;
    const estimatedCost = (estimatedTokens / 1000000) * costPer1MTokens;

    return {
      estimatedChunks: numChunks,
      estimatedTokens,
      costPer1MTokens,
      estimatedCostUSD: estimatedCost.toFixed(4),
      message: `Estimated cost for ${numChunks} chunks: $${estimatedCost.toFixed(
        4
      )}`,
    };
  }
}

module.exports = EmbeddingService;
