#!/usr/bin/env node

/**
 * Transcript Embedding Pipeline
 *
 * Complete end-to-end pipeline:
 * 1. Load transcripts from Firestore
 * 2. Chunk each transcript
 * 3. Generate embeddings
 * 4. Upsert to Pinecone
 * 5. Update Firestore with Pinecone IDs
 *
 * Usage:
 *   node scripts/embedTranscripts.js              # All students
 *   node scripts/embedTranscripts.js --student STU001  # Single student
 *   node scripts/embedTranscripts.js --dry-run    # Preview only
 */

const admin = require("firebase-admin");
const chunkingService = require("../cloud-run/src/services/chunkingService.js");
const EmbeddingService = require("../cloud-run/src/services/embeddingService.js");
const PineconeService = require("../cloud-run/src/services/pineconeService.js");
require("dotenv").config();

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const studentFilter = args.includes("--student")
  ? args[args.indexOf("--student") + 1]
  : null;

// Initialize Firebase
if (!admin.apps.length) {
  const serviceAccountKey = require("../firebase-key.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey),
    storageBucket: "study-buddy-28043.appspot.com",
  });
}

const db = admin.firestore();
const storage = admin.storage().bucket();

async function main() {
  try {
    console.log(
      "\n╔════════════════════════════════════════════════════════════════╗"
    );
    console.log(
      "║          Transcript Embedding Pipeline                          ║"
    );
    console.log(
      "╚════════════════════════════════════════════════════════════════╝\n"
    );

    // Validate environment
    console.log("🔍 Validating environment...");
    const openaiKey = process.env.OPENAI_API_KEY;
    const pineconeKey = process.env.PINECONE_API_KEY;
    const pineconeIndex = process.env.PINECONE_INDEX || "study-buddy";

    if (!openaiKey) throw new Error("OPENAI_API_KEY not in .env.local");
    if (!pineconeKey) throw new Error("PINECONE_API_KEY not in .env.local");

    console.log("✓ OpenAI API key found");
    console.log("✓ Pinecone API key found");
    console.log("✓ Firebase configured\n");

    // Initialize services
    console.log("🚀 Initializing services...");
    const embeddingService = new EmbeddingService(openaiKey);
    const pineconeService = new PineconeService(pineconeKey, pineconeIndex);

    await pineconeService.initialize();
    console.log("✓ All services initialized\n");

    // Load transcripts
    console.log("📁 Loading transcripts from Firestore...");
    let query = db.collection("session_transcripts");

    if (studentFilter) {
      console.log(`   Filter: student_id = ${studentFilter}`);
      query = query.where("student_id", "==", studentFilter);
    }

    const transcriptDocs = await query.get();

    if (transcriptDocs.empty) {
      throw new Error("No transcripts found");
    }

    const transcripts = transcriptDocs.docs.map((doc) => ({
      ...doc.data(),
      docId: doc.id,
    }));

    console.log(`✓ Found ${transcripts.length} transcripts\n`);

    // Prepare chunks
    console.log("🔄 Chunking transcripts...");
    const chunks = chunkingService.prepareChunksForEmbedding(transcripts);
    console.log(`✓ Created ${chunks.length} chunks\n`);

    if (dryRun) {
      console.log("━━ DRY RUN MODE ━━");
      console.log(`Would embed ${chunks.length} chunks`);
      console.log(
        `Cost estimate: ${EmbeddingService.estimateCost(chunks.length).message}`
      );
      return;
    }

    // Generate embeddings
    console.log("🧠 Generating embeddings...");
    console.log(
      `Cost estimate: ${EmbeddingService.estimateCost(chunks.length).message}`
    );
    const embedded = await embeddingService.batchEmbed(chunks, 10);

    // Prepare vectors for Pinecone
    console.log("\n📦 Preparing vectors for Pinecone...");
    const vectors = embedded.map((item, idx) => {
      const chunkId = `${item.metadata.transcript_id}_chunk${item.metadata.chunk_index}`;
      return {
        id: chunkId,
        values: item.vector,
        metadata: item.metadata,
      };
    });

    console.log(`✓ Prepared ${vectors.length} vectors\n`);

    // Upsert to Pinecone
    console.log("⬆️  Upserting vectors to Pinecone...");
    const upsertedCount = await pineconeService.upsertVectors(vectors, 50);

    // Update Firestore with Pinecone IDs
    console.log("\n📝 Updating Firestore with Pinecone vector IDs...");
    const updates = {};

    // Group vectors by transcript
    embedded.forEach((item, idx) => {
      const vectorId = `${item.metadata.transcript_id}_chunk${item.metadata.chunk_index}`;
      const transcriptId = item.metadata.transcript_id;

      if (!updates[transcriptId]) {
        updates[transcriptId] = [];
      }
      updates[transcriptId].push(vectorId);
    });

    // Update Firestore batch
    let updateCount = 0;
    for (const [transcriptId, vectorIds] of Object.entries(updates)) {
      const docId = transcripts.find(
        (t) => t.transcript_id === transcriptId
      )?.docId;
      if (docId) {
        await db.collection("session_transcripts").doc(docId).update({
          pinecone_vector_ids: vectorIds,
          embedding_status: "complete",
          embedding_timestamp: new Date().toISOString(),
        });
        updateCount++;
        console.log(
          `   ✓ Updated ${transcriptId} (${vectorIds.length} vectors)`
        );
      }
    }

    console.log(`\n✅ Firestore updated: ${updateCount} transcripts\n`);

    // Summary
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✨ PIPELINE COMPLETE!\n");
    console.log("Summary:");
    console.log(`  • Transcripts processed: ${transcripts.length}`);
    console.log(`  • Total chunks created: ${chunks.length}`);
    console.log(`  • Vectors generated: ${embedded.length}`);
    console.log(`  • Vectors upserted: ${upsertedCount}`);
    console.log(`  • Firestore records updated: ${updateCount}`);
    console.log(`\n🎉 Ready for Phase 3: Chat Agent\n`);
  } catch (error) {
    console.error("\n❌ Pipeline failed:", error.message);
    if (error.message.includes(".env.local")) {
      console.error("\n💡 Make sure your .env.local has:");
      console.error("   - OPENAI_API_KEY");
      console.error("   - PINECONE_API_KEY");
      console.error("   - PINECONE_INDEX");
    }
    process.exit(1);
  } finally {
    // Cleanup
    if (admin.apps.length) {
      await admin.app().delete();
    }
  }
}

// Run
main();
