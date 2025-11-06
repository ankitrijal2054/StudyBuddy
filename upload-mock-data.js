#!/usr/bin/env node

/**
 * 📤 Upload Mock Data to Firebase
 *
 * This script populates Firestore with mock student data and transcripts.
 *
 * ⚠️  IMPORTANT: You must have Firebase credentials configured!
 *
 * Setup:
 * 1. Install dependencies:
 *    npm install firebase-admin
 *
 * 2. Set up authentication (choose ONE):
 *    Option A: Use Application Default Credentials
 *       gcloud auth application-default login
 *
 *    Option B: Set GOOGLE_APPLICATION_CREDENTIALS environment variable
 *       export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
 *
 *    Option C: Get key from Firebase Console > Project Settings > Service Accounts
 *
 * 3. Configure your Firebase project:
 *    Update the config object below with your values
 *
 * 4. Run the script:
 *    node upload-mock-data.js
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// ⚠️  UPDATE THESE WITH YOUR FIREBASE PROJECT DETAILS
const config = {
  projectId: "study-buddy-28043",
  storageBucket: "study-buddy-28043.firebasestorage.app",
};

console.log("🔥 Initializing Firebase Admin SDK...");
console.log(`   Project: ${config.projectId}`);
console.log(`   Storage: ${config.storageBucket}\n`);

try {
  // Try to load service account key
  let credentials;
  try {
    credentials = require("./firebase-key.json");
  } catch (e) {
    console.warn("⚠️  firebase-key.json not found, using default credentials");
  }

  const initConfig = {
    projectId: config.projectId,
    storageBucket: config.storageBucket,
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

const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * Read all JSON files from a directory
 */
function readJsonFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Directory not found: ${dir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const data = {};

  files.forEach((file) => {
    try {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, "utf8");
      data[file] = JSON.parse(content);
    } catch (error) {
      console.error(`⚠️  Failed to read ${file}:`, error.message);
    }
  });

  return data;
}

/**
 * Upload a file to Cloud Storage
 */
async function uploadToStorage(filePath, destinationPath) {
  try {
    await bucket.upload(filePath, {
      destination: destinationPath,
      metadata: {
        cacheControl: "public, max-age=86400",
      },
    });
    console.log(`   ✅ ${destinationPath}`);
    return destinationPath;
  } catch (error) {
    console.error(`   ❌ Failed to upload ${destinationPath}:`, error.message);
    throw error;
  }
}

/**
 * Create student document in Firestore
 */
async function createStudent(studentData) {
  try {
    const docRef = db.collection("students").doc(studentData.student_id);
    await docRef.set({
      ...studentData,
      created_at: new Date(studentData.created_at),
      enrollment_date: new Date(studentData.enrollment_date),
      last_session: new Date(studentData.last_session),
    });
    console.log(`   ✅ ${studentData.name} (${studentData.student_id})`);
  } catch (error) {
    console.error(
      `   ❌ Failed to create student ${studentData.student_id}:`,
      error.message
    );
    throw error;
  }
}

/**
 * Create transcript document in Firestore
 */
async function createTranscript(transcriptData, storageUrl) {
  try {
    const docRef = db
      .collection("session_transcripts")
      .doc(transcriptData.transcript_id);
    await docRef.set({
      transcript_id: transcriptData.transcript_id,
      student_id: transcriptData.student_id,
      subject: transcriptData.subject,
      topic: transcriptData.topic,
      session_date: new Date(transcriptData.session_date),
      duration_minutes: transcriptData.duration_minutes,
      key_topics: transcriptData.key_topics,
      storage_url: storageUrl,
      created_at: new Date(transcriptData.created_at),
    });
  } catch (error) {
    console.error(
      `   ❌ Failed to create transcript ${transcriptData.transcript_id}:`,
      error.message
    );
    throw error;
  }
}

/**
 * Create goal documents for a student
 */
async function createGoals(student) {
  try {
    for (const goal of student.goals) {
      const goalId = `${student.student_id}_${goal
        .replace(/\s+/g, "_")
        .toLowerCase()
        .substring(0, 30)}`;
      const docRef = db.collection("goals").doc(goalId);

      await docRef.set({
        goal_id: goalId,
        student_id: student.student_id,
        title: goal,
        status: "active",
        progress_percentage: Math.floor(Math.random() * 60) + 20, // Random 20-80% for testing
        quiz_scores: [],
        created_at: new Date(),
        target_completion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });
    }
  } catch (error) {
    console.error(
      `   ❌ Failed to create goals for ${student.student_id}:`,
      error.message
    );
    throw error;
  }
}

/**
 * Main upload function
 */
async function uploadAllData() {
  console.log("\n🚀 Starting mock data upload...\n");

  const startTime = Date.now();

  try {
    // Read data from disk
    console.log("📁 Reading mock data files...");
    const studentsDir = path.join(__dirname, "data/students");
    const transcriptsDir = path.join(__dirname, "data/transcripts");

    const students = readJsonFiles(studentsDir);
    const transcripts = readJsonFiles(transcriptsDir);

    console.log(`   Found ${Object.keys(students).length} student profiles`);
    console.log(`   Found ${Object.keys(transcripts).length} transcripts\n`);

    if (Object.keys(students).length === 0) {
      console.error("❌ No student files found in data/students/");
      process.exit(1);
    }

    // Upload students
    console.log("👥 Creating students...");
    for (const [, studentData] of Object.entries(students)) {
      await createStudent(studentData);
    }

    // Upload transcripts
    console.log("\n📚 Creating transcripts...");
    let transcriptCount = 0;
    for (const [fileName, transcriptData] of Object.entries(transcripts)) {
      const transcriptPath = path.join(transcriptsDir, fileName);

      // Upload to Cloud Storage
      const storageDestination = `transcripts/${transcriptData.student_id}/${fileName}`;
      const storageUrl = await uploadToStorage(
        transcriptPath,
        storageDestination
      );

      // Create Firestore document
      await createTranscript(transcriptData, storageUrl);
      transcriptCount++;
    }
    console.log(`   ✅ Created ${transcriptCount} transcripts`);

    // Create goals for each student
    console.log("\n🎯 Creating goals...");
    let totalGoals = 0;
    for (const [, studentData] of Object.entries(students)) {
      await createGoals(studentData);
      totalGoals += studentData.goals.length;
    }
    console.log(`   ✅ Created ${totalGoals} goals`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n✨ Upload complete!\n");
    console.log("📊 Summary:");
    console.log(`   • Students: ${Object.keys(students).length}`);
    console.log(`   • Transcripts: ${Object.keys(transcripts).length}`);
    console.log(`   • Goals: ${totalGoals}`);
    console.log(`   • Time: ${duration}s\n`);

    console.log("🎉 Data is now available in Firestore!\n");
    console.log("📝 Next steps:");
    console.log("   1. Verify data in Firebase Console: firestore.google.com");
    console.log("   2. Test querying from the frontend");
    console.log("   3. Proceed to Phase 2: Pinecone RAG Pipeline\n");
  } catch (error) {
    console.error("\n❌ Upload failed:", error);
    process.exit(1);
  }
}

// Run the upload
uploadAllData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
