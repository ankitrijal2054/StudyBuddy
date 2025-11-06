/**
 * Pinecone Service
 *
 * Handles vector storage and retrieval from Pinecone
 * Includes student-level data isolation for security
 */

const { Pinecone } = require("@pinecone-database/pinecone");

class PineconeService {
  constructor(
    apiKey,
    indexName = "study-buddy",
    environment = "us-east-1-aws"
  ) {
    if (!apiKey) {
      throw new Error("Pinecone API key is required");
    }
    if (!indexName) {
      throw new Error("Pinecone index name is required");
    }

    this.apiKey = apiKey;
    this.indexName = indexName;
    this.environment = environment;
    this.client = null;
    this.index = null;
  }

  /**
   * Initialize Pinecone client and get index
   * Must be called before any operations
   *
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      console.log(`🔌 Initializing Pinecone...`);
      console.log(`   Index: ${this.indexName}`);
      console.log(`   Environment: ${this.environment}\n`);

      this.client = new Pinecone({ apiKey: this.apiKey });
      this.index = this.client.Index(this.indexName);

      // Test connection by getting index stats
      const indexStats = await this.index.describeIndexStats();
      console.log(`✅ Connected to Pinecone`);
      console.log(`   Total vectors: ${indexStats.totalVectorCount}`);
      console.log(
        `   Total namespaces: ${
          Object.keys(indexStats.namespaces || {}).length
        }\n`
      );

      return indexStats;
    } catch (error) {
      throw new Error(`Failed to initialize Pinecone: ${error.message}`);
    }
  }

  /**
   * Upsert vectors to Pinecone
   * Creates or updates vectors with metadata
   *
   * @param {Array<Object>} vectors - Array of {id, values, metadata}
   * @param {number} batchSize - Size of upsert batches (default: 100)
   * @returns {Promise<number>} Number of vectors upserted
   */
  async upsertVectors(vectors, batchSize = 100) {
    if (!this.index) {
      throw new Error("Pinecone not initialized. Call initialize() first.");
    }

    if (!Array.isArray(vectors) || vectors.length === 0) {
      throw new Error("Vectors must be a non-empty array");
    }

    console.log(`\n⬆️  Upserting ${vectors.length} vectors to Pinecone...`);

    let upsertedCount = 0;
    let failedCount = 0;

    // Validate and clean vectors
    vectors.forEach((v, idx) => {
      if (!v.id) throw new Error(`Vector ${idx}: Missing id`);
      if (!Array.isArray(v.values))
        throw new Error(`Vector ${idx}: Missing or invalid values`);
      if (v.values.length !== 1536) {
        throw new Error(
          `Vector ${idx}: Expected 1536 dimensions, got ${v.values.length}`
        );
      }

      // Convert Firestore Timestamps to ISO strings for Pinecone
      if (v.metadata && typeof v.metadata === "object") {
        if (
          v.metadata.date &&
          typeof v.metadata.date === "object" &&
          v.metadata.date.toDate
        ) {
          // Firestore Timestamp object
          v.metadata.date = v.metadata.date.toDate().toISOString();
        } else if (v.metadata.date && typeof v.metadata.date !== "string") {
          // Convert other date objects
          v.metadata.date = new Date(v.metadata.date).toISOString();
        }
      }
    });

    // Upsert in batches
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);

      try {
        await this.index.upsert(batch);
        upsertedCount += batch.length;

        const progress = Math.round((upsertedCount / vectors.length) * 100);
        console.log(
          `   Progress: ${upsertedCount}/${vectors.length} (${progress}%)`
        );
      } catch (error) {
        console.error(
          `   ❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${
            error.message
          }`
        );
        failedCount += batch.length;
      }
    }

    console.log(`\n✅ Upsert complete:`);
    console.log(`   Successful: ${upsertedCount}`);
    if (failedCount > 0) {
      console.log(`   Failed: ${failedCount}`);
    }
    console.log();

    return upsertedCount;
  }

  /**
   * Query Pinecone for similar vectors (semantic search)
   * Filters by student_id to prevent cross-student data access
   *
   * @param {Array<number>} embedding - Query vector (1536 dimensions)
   * @param {string} studentId - Student ID for filtering
   * @param {number} topK - Number of results (default: 5)
   * @param {number} minScore - Minimum similarity score (default: 0.0)
   * @returns {Promise<Array<Object>>} Top K matching results with metadata
   */
  async queryByStudent(embedding, studentId, topK = 5, minScore = 0.0) {
    if (!this.index) {
      throw new Error("Pinecone not initialized. Call initialize() first.");
    }

    if (!Array.isArray(embedding) || embedding.length !== 1536) {
      throw new Error("Embedding must be a 1536-dimensional array");
    }

    if (!studentId || typeof studentId !== "string") {
      throw new Error("Student ID is required");
    }

    if (topK < 1 || topK > 10000) {
      throw new Error("TopK must be between 1 and 10000");
    }

    try {
      // Query with metadata filter for student isolation
      const results = await this.index.query({
        vector: embedding,
        topK,
        includeMetadata: true,
        filter: {
          student_id: { $eq: studentId },
        },
      });

      // Filter by minimum score and format results
      const formattedResults = results.matches
        .filter((match) => match.score >= minScore)
        .map((match, idx) => ({
          rank: idx + 1,
          id: match.id,
          score: match.score,
          metadata: match.metadata,
        }));

      return formattedResults;
    } catch (error) {
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  /**
   * Query by student with detailed logging (for debugging)
   *
   * @param {Array<number>} embedding - Query vector
   * @param {string} studentId - Student ID
   * @param {number} topK - Number of results
   * @returns {Promise<Array<Object>>} Results with logging
   */
  async queryByStudentVerbose(embedding, studentId, topK = 5) {
    console.log(`\n🔍 Querying Pinecone for student: ${studentId}`);
    console.log(`   Top K: ${topK}`);

    const results = await this.queryByStudent(embedding, studentId, topK);

    console.log(`\n✅ Query complete: ${results.length} results found\n`);

    results.forEach((result) => {
      console.log(
        `   ${result.rank}. ${result.metadata.subject} - ${result.metadata.transcript_id}`
      );
      console.log(`      Score: ${result.score.toFixed(4)}`);
      console.log(
        `      Topics: ${result.metadata.topics?.join(", ") || "N/A"}`
      );
    });
    console.log();

    return results;
  }

  /**
   * Verify student data isolation
   * Query across two students to ensure filtering works
   *
   * @param {Array<number>} embedding - Query vector
   * @param {Array<string>} studentIds - Student IDs to test
   * @returns {Promise<Object>} Isolation verification results
   */
  async verifyStudentIsolation(embedding, studentIds) {
    if (!Array.isArray(studentIds) || studentIds.length < 2) {
      throw new Error("Need at least 2 student IDs for isolation test");
    }

    console.log(`\n🔐 Verifying student data isolation...\n`);

    const results = {};

    for (const studentId of studentIds) {
      const queryResults = await this.queryByStudent(embedding, studentId, 5);
      results[studentId] = {
        count: queryResults.length,
        ids: queryResults.map((r) => r.id),
        studentIds: queryResults.map((r) => r.metadata.student_id),
      };

      console.log(`   ${studentId}: ${queryResults.length} vectors`);
      console.log(
        `      All from ${studentId}? ${
          queryResults.every((r) => r.metadata.student_id === studentId)
            ? "✓ YES"
            : "✗ NO"
        }`
      );
    }

    // Check isolation
    const isolated = !Object.values(results)
      .map((r) => r.ids)
      .reduce((a, b) => a.concat(b), [])
      .some((id, idx, arr) => arr.indexOf(id) !== idx);

    console.log(`\n✅ Isolation verified: ${isolated ? "PASS ✓" : "FAIL ✗"}\n`);

    return { results, isolated };
  }

  /**
   * Delete vectors by student ID (cleanup function)
   *
   * @param {string} studentId - Student ID to delete
   * @returns {Promise<number>} Number of vectors deleted
   */
  async deleteByStudentId(studentId) {
    if (!this.index) {
      throw new Error("Pinecone not initialized. Call initialize() first.");
    }

    if (!studentId || typeof studentId !== "string") {
      throw new Error("Student ID is required");
    }

    try {
      console.log(`\n🗑️  Deleting vectors for student: ${studentId}...`);

      // Query first to get vector IDs
      const queryResults = await this.index.query({
        vector: new Array(1536).fill(0), // Dummy vector
        topK: 10000,
        filter: { student_id: { $eq: studentId } },
        includeMetadata: false,
      });

      const vectorIds = queryResults.matches.map((m) => m.id);

      if (vectorIds.length === 0) {
        console.log(`   No vectors found for ${studentId}`);
        return 0;
      }

      // Delete in batches
      const batchSize = 100;
      let deletedCount = 0;

      for (let i = 0; i < vectorIds.length; i += batchSize) {
        const batch = vectorIds.slice(i, i + batchSize);
        await this.index.deleteMany(batch);
        deletedCount += batch.length;
      }

      console.log(`✅ Deleted ${deletedCount} vectors\n`);
      return deletedCount;
    } catch (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Get index statistics
   *
   * @returns {Promise<Object>} Index statistics
   */
  async getIndexStats() {
    if (!this.index) {
      throw new Error("Pinecone not initialized. Call initialize() first.");
    }

    try {
      const stats = await this.index.describeIndexStats();
      return stats;
    } catch (error) {
      throw new Error(`Failed to get index stats: ${error.message}`);
    }
  }
}

module.exports = PineconeService;
