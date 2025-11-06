#!/usr/bin/env node

/**
 * 🧪 Create Test Users in Firebase Auth
 *
 * This script creates Firebase Auth users for each mock student
 * and links them in the user_profiles collection.
 *
 * Usage:
 *   node create-test-users.js
 *
 * This will create 5 test users with passwords: TestPassword123!
 */

const admin = require("firebase-admin");

// Test user credentials (linked to mock students)
const TEST_USERS = [
  {
    email: "alex.chen@example.com",
    password: "TestPassword123!",
    student_id: "STU001",
    name: "Alex Chen",
  },
  {
    email: "jordan.patel@example.com",
    password: "TestPassword123!",
    student_id: "STU002",
    name: "Jordan Patel",
  },
  {
    email: "samantha.kim@example.com",
    password: "TestPassword123!",
    student_id: "STU003",
    name: "Samantha Kim",
  },
  {
    email: "marcus.johnson@example.com",
    password: "TestPassword123!",
    student_id: "STU004",
    name: "Marcus Johnson",
  },
  {
    email: "priya.sharma@example.com",
    password: "TestPassword123!",
    student_id: "STU005",
    name: "Priya Sharma",
  },
];

console.log("🔥 Initializing Firebase Admin SDK...\n");

try {
  // Try to load service account key
  let credentials;
  try {
    credentials = require("./firebase-key.json");
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
const db = admin.firestore();

/**
 * Create test users and link to student profiles
 */
async function createTestUsers() {
  console.log("🚀 Creating test users...\n");

  const results = [];

  for (const testUser of TEST_USERS) {
    try {
      // 1. Create Firebase Auth user
      const userRecord = await auth.createUser({
        email: testUser.email,
        password: testUser.password,
        displayName: testUser.name,
      });

      console.log(
        `✅ Created Auth user: ${testUser.email} (UID: ${userRecord.uid})`
      );

      // 2. Create user_profiles document linking Auth UID to student_id
      await db.collection("user_profiles").doc(userRecord.uid).set({
        auth_uid: userRecord.uid,
        student_id: testUser.student_id,
        email: testUser.email,
        name: testUser.name,
        created_at: new Date(),
      });

      console.log(`   ✅ Linked to student profile: ${testUser.student_id}\n`);

      results.push({
        email: testUser.email,
        password: testUser.password,
        uid: userRecord.uid,
        student_id: testUser.student_id,
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
    console.log("Password for all: TestPassword123!\n");

    users.forEach((user) => {
      console.log(`${user.email}`);
      console.log(`  → Student ID: ${user.student_id}`);
      console.log(`  → Auth UID: ${user.uid}\n`);
    });

    console.log("🎯 Next Steps:");
    console.log("1. Update frontend AuthContext to query user_profiles");
    console.log("2. When user logs in, fetch their student profile");
    console.log("3. Store student_id in React context for dashboard\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed:", error);
    process.exit(1);
  }
}

main();
