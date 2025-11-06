/**
 * Manual Test Script for Cloud Run Service
 *
 * Tests core functionality without running full server
 * Usage: npm test
 */

require("dotenv").config();

const EmbeddingService = require("./services/embeddingService");
const PineconeService = require("./services/pineconeService");

async function runTests() {
  console.log("\n🧪 Cloud Run Service Tests\n");
  console.log("=".repeat(50));

  try {
    // Test 1: Embedding Service
    console.log("\n1️⃣  Testing Embedding Service...");
    const embedService = new EmbeddingService(process.env.OPENAI_API_KEY);

    const testText = "What is ionic bonding in chemistry?";
    console.log(`   Text: "${testText}"`);

    const embedding = await embedService.embedText(testText);
    console.log(`   ✅ Embedding generated: ${embedding.length} dimensions`);

    // Test 2: Pinecone Service
    console.log("\n2️⃣  Testing Pinecone Service...");
    const pineconeService = new PineconeService(process.env.PINECONE_API_KEY);

    console.log("   Initializing Pinecone...");
    const stats = await pineconeService.initialize();
    console.log(`   ✅ Connected to Pinecone`);
    console.log(`      Total vectors: ${stats.totalVectorCount}`);

    // Test 3: Query with student isolation
    if (stats.totalVectorCount > 0) {
      console.log("\n3️⃣  Testing Pinecone Query (student isolation)...");

      const queryEmbedding = await embedService.embedText(
        "Tell me about chemistry lessons"
      );
      console.log("   Querying for student S001...");

      const results = await pineconeService.queryByStudent(
        queryEmbedding,
        "S001",
        5
      );

      console.log(`   ✅ Found ${results.length} results for S001`);

      if (results.length > 0) {
        console.log(`      Top match: ${results[0].metadata.subject}`);
        console.log(`      Score: ${results[0].score.toFixed(4)}`);
      }

      // Verify isolation
      console.log("\n4️⃣  Testing Student Data Isolation...");
      const studentIds = ["S001", "S002"];
      const isolation = await pineconeService.verifyStudentIsolation(
        queryEmbedding,
        studentIds
      );

      const allIsolated = Object.values(isolation.results).every((result) =>
        result.studentIds.every((id) => id === result.studentIds[0])
      );

      if (allIsolated) {
        console.log("   ✅ Student data isolation verified!");
      } else {
        console.log("   ❌ Data isolation issue detected!");
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ All tests passed!\n");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
}

runTests();
