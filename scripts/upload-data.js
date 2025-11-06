#!/usr/bin/env node

/**
 * Upload Mock Data to Firestore and Cloud Storage
 *
 * This script:
 * 1. Reads mock student profiles and transcripts from /data/
 * 2. Uploads transcripts to Cloud Storage
 * 3. Populates Firestore collections:
 *    - students: Student profiles
 *    - session_transcripts: Transcript metadata + storage URLs
 *    - goals: Student goals (derived from profiles)
 *
 * Usage:
 *   node scripts/upload-data.js
 *
 * Requirements:
 *   - Firebase credentials configured (via .env or gcloud)
 *   - Firestore database initialized
 *   - Cloud Storage bucket created
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin SDK
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  : require("../firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * Read all JSON files from a directory
 */
function readJsonFiles(dir) {
  const files = fs.readdirSync(dir);
  const data = {};

  files.forEach((file) => {
    if (file.endsWith(".json")) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, "utf8");
      data[file] = JSON.parse(content);
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
    console.log(`✅ Uploaded ${destinationPath}`);
    return destinationPath;
  } catch (error) {
    console.error(`❌ Failed to upload ${destinationPath}:`, error.message);
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
    console.log(
      `✅ Created student: ${studentData.name} (${studentData.student_id})`
    );
  } catch (error) {
    console.error(
      `❌ Failed to create student ${studentData.student_id}:`,
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
    console.log(`✅ Created transcript: ${transcriptData.transcript_id}`);
  } catch (error) {
    console.error(
      `❌ Failed to create transcript ${transcriptData.transcript_id}:`,
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
        .toLowerCase()}`;
      const docRef = db.collection("goals").doc(goalId);

      await docRef.set({
        goal_id: goalId,
        student_id: student.student_id,
        title: goal,
        status: "active",
        progress_percentage: Math.floor(Math.random() * 60) + 20, // Random 20-80% for testing
        created_at: new Date(),
        target_completion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });
    }
    console.log(
      `✅ Created ${student.goals.length} goals for ${student.student_id}`
    );
  } catch (error) {
    console.error(
      `❌ Failed to create goals for ${student.student_id}:`,
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

  try {
    // Read data from disk
    console.log("📁 Reading mock data files...");
    const studentsDir = path.join(__dirname, "../data/students");
    const transcriptsDir = path.join(__dirname, "../data/transcripts");

    const students = readJsonFiles(studentsDir);
    const transcripts = readJsonFiles(transcriptsDir);

    console.log(`Found ${Object.keys(students).length} student profiles`);
    console.log(`Found ${Object.keys(transcripts).length} transcripts\n`);

    // Upload students
    console.log("📤 Uploading students to Firestore...");
    for (const [, studentData] of Object.entries(students)) {
      await createStudent(studentData);
    }

    // Upload transcripts
    console.log("\n📤 Uploading transcripts to Cloud Storage and Firestore...");
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
    }

    // Create goals for each student
    console.log("\n📤 Creating goals for students...");
    for (const [, studentData] of Object.entries(students)) {
      await createGoals(studentData);
    }

    console.log(
      "\n✨ Upload complete! All data is now in Firestore and Cloud Storage."
    );
    console.log("\n📊 Summary:");
    console.log(`   • Students: ${Object.keys(students).length}`);
    console.log(`   • Transcripts: ${Object.keys(transcripts).length}`);
    console.log(
      `   • Goals: ${Object.keys(students).reduce(
        (sum, key) => sum + students[key].goals.length,
        0
      )}`
    );
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
