#!/usr/bin/env node

/**
 * 🧪 Create Test Users in Firebase Auth
 *
 * This script creates Firebase Auth users for each mock student
 * and returns their UIDs to be used as student_id in Firestore.
 *
 * Usage:
 *   node create-test-users.js
 *
 * This will create 6 test users with passwords: TestPassword123!
 */

const admin = require("firebase-admin");

// Test user credentials
const TEST_USERS = [
  {
    email: "alex.chen@example.com",
    password: "test123",
    name: "Alex Chen",
  },
  {
    email: "jordan.patel@example.com",
    password: "test123",
    name: "Jordan Patel",
  },
  {
    email: "samantha.kim@example.com",
    password: "test123",
    name: "Samantha Kim",
  },
  {
    email: "marcus.johnson@example.com",
    password: "test123",
    name: "Marcus Johnson",
  },
  {
    email: "priya.sharma@example.com",
    password: "test123",
    name: "Priya Sharma",
  },
  {
    email: "ankitrijal2054@gmail.com",
    password: "test123",
    name: "Ankit Rijal",
  },
];

console.log("🔥 Initializing Firebase Admin SDK...\n");

try {
  // Try to load service account key
  let credentials;
  try {
    credentials = require("../firebase-key.json");
  } catch (e) {
    console.warn("⚠️  firebase-key.json not found, using default credentials");
  }

  const initConfig = {
    projectId: "study-buddy-28043",
    storageBucket: "study-buddy-28043.firebasestorage.app",
  };

  if (credentials) {
    initConfig.credential = admin.credential.cert(credentials);
  }

  admin.initializeApp(initConfig);
} catch (error) {
  if (error.code !== "app/duplicate-app") {
    throw error;
  }
}

const auth = admin.auth();

/**
 * Create test users and return their UIDs
 */
async function createTestUsers() {
  console.log("🚀 Creating test users...\n");

  const results = [];

  for (const testUser of TEST_USERS) {
    try {
      // Create Firebase Auth user
      const userRecord = await auth.createUser({
        email: testUser.email,
        password: testUser.password,
        displayName: testUser.name,
      });

      console.log(`✅ Created Auth user: ${testUser.email}`);
      console.log(`   UID: ${userRecord.uid}\n`);

      results.push({
        email: testUser.email,
        password: testUser.password,
        uid: userRecord.uid,
        name: testUser.name,
      });
    } catch (error) {
      console.error(
        `❌ Failed to create user ${testUser.email}:`,
        error.message
      );
    }
  }

  return results;
}

/**
 * Main execution
 */
async function main() {
  try {
    const users = await createTestUsers();

    console.log("\n✨ Test users created!\n");
    console.log("📝 Login Credentials:\n");
    console.log("Password for all: test123\n");

    users.forEach((user) => {
      console.log(`Email: ${user.email}`);
      console.log(`UID (use as student_id): ${user.uid}\n`);
    });

    console.log("🎯 Next Steps:");
    console.log("1. Use the UIDs above as student_id when uploading mock data");
    console.log("2. Run: node scripts/upload-mock-data.js");
    console.log("3. Run: node scripts/embedTranscripts.js\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed:", error);
    process.exit(1);
  }
}

main();
