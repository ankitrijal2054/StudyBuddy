#!/usr/bin/env node

/**
 * 📤 Upload Mock Data to Firebase
 *
 * This script populates Firestore with mock student data and transcripts.
 * Uses Firebase UIDs as the primary student_id (no mapping collection needed).
 *
 * Usage:
 *   node scripts/upload-mock-data.js <uid1> <uid2> <uid3> <uid4> <uid5> <uid6>
 *
 * The UIDs will be used as student_id in Firestore.
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Get UIDs from command line arguments
const uids = process.argv.slice(2);

if (uids.length !== 6) {
  console.error("❌ Error: Please provide exactly 6 Firebase UIDs");
  console.error(
    "Usage: node scripts/upload-mock-data.js <uid1> <uid2> <uid3> <uid4> <uid5> <uid6>"
  );
  console.error("\nGet UIDs by running: node scripts/create-test-users.js");
  process.exit(1);
}

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
    credentials = require("../firebase-key.json");
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
 * Create student document in Firestore using Firebase UID as student_id
 */
async function createStudent(studentData, uid) {
  try {
    // Use Firebase UID as the document ID
    const docRef = db.collection("students").doc(uid);
    await docRef.set({
      student_id: uid, // Also store as field for queries
      name: studentData.name,
      email: studentData.email,
      grade: studentData.grade,
      subjects: studentData.subjects,
      goals: studentData.goals,
      sessions_count: studentData.sessions_count || 0,
      created_at: new Date(studentData.created_at),
      enrollment_date: new Date(studentData.enrollment_date),
      last_session: new Date(studentData.last_session),
    });
    console.log(`   ✅ ${studentData.name} (${uid.substring(0, 8)}...)`);
  } catch (error) {
    console.error(
      `   ❌ Failed to create student ${studentData.name}:`,
      error.message
    );
    throw error;
  }
}

/**
 * Create transcript document in Firestore using Firebase UID as student_id
 */
async function createTranscript(transcriptData, storageUrl, uid) {
  try {
    const docRef = db
      .collection("session_transcripts")
      .doc(transcriptData.transcript_id);
    await docRef.set({
      transcript_id: transcriptData.transcript_id,
      student_id: uid, // Use Firebase UID
      subject: transcriptData.subject,
      topics: transcriptData.topics || [],
      session_date: new Date(transcriptData.session_date),
      duration_minutes: transcriptData.duration_minutes,
      tutor_notes: transcriptData.tutor_notes || "",
      storage_url: storageUrl,
      created_at: new Date(transcriptData.created_at),
      date: new Date(transcriptData.session_date), // For Pinecone metadata
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
 * Create goal documents for a student using Firebase UID as student_id
 */
async function createGoals(student, uid) {
  try {
    for (const goal of student.goals) {
      const goalId = `${uid}_${goal
        .replace(/\s+/g, "_")
        .toLowerCase()
        .substring(0, 30)}`;
      const docRef = db.collection("goals").doc(goalId);

      await docRef.set({
        goal_id: goalId,
        student_id: uid, // Use Firebase UID
        title: goal,
        goal: goal,
        status: "active",
        progress: Math.floor(Math.random() * 60) + 20, // Random 20-80% for testing
        progress_percentage: Math.floor(Math.random() * 60) + 20,
        quiz_scores: [],
        created_at: new Date(),
        target_completion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }
  } catch (error) {
    console.error(
      `   ❌ Failed to create goals for ${student.name}:`,
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
    const studentsDir = path.join(__dirname, "../data/students");
    const transcriptsDir = path.join(__dirname, "../data/transcripts");

    const students = readJsonFiles(studentsDir);
    const transcripts = readJsonFiles(transcriptsDir);

    console.log(`   Found ${Object.keys(students).length} student profiles`);
    console.log(`   Found ${Object.keys(transcripts).length} transcripts\n`);

    if (Object.keys(students).length === 0) {
      console.error("❌ No student files found in data/students/");
      process.exit(1);
    }

    // Upload students using provided UIDs
    console.log("👥 Creating students...");
    const studentArray = Object.entries(students);
    for (let i = 0; i < studentArray.length && i < uids.length; i++) {
      const [, studentData] = studentArray[i];
      await createStudent(studentData, uids[i]);
    }

    // Upload transcripts - map to correct UID based on original student_id
    console.log("\n📚 Creating transcripts...");
    let transcriptCount = 0;

    // Create mapping from original student_id to new UID
    const studentIdToUidMap = {};
    const originalStudentIds = Object.values(students).map((s, idx) => ({
      id: s.student_id,
      uid: uids[idx],
    }));

    originalStudentIds.forEach(({ id, uid }) => {
      studentIdToUidMap[id] = uid;
    });

    for (const [fileName, transcriptData] of Object.entries(transcripts)) {
      const originalStudentId = transcriptData.student_id;
      const uid = studentIdToUidMap[originalStudentId];

      if (!uid) {
        console.warn(
          `   ⚠️  No UID found for transcript with student_id ${originalStudentId}`
        );
        continue;
      }

      const transcriptPath = path.join(transcriptsDir, fileName);

      // Upload to Cloud Storage
      const storageDestination = `transcripts/${uid}/${fileName}`;
      const storageUrl = await uploadToStorage(
        transcriptPath,
        storageDestination
      );

      // Create Firestore document
      await createTranscript(transcriptData, storageUrl, uid);
      transcriptCount++;
    }
    console.log(`   ✅ Created ${transcriptCount} transcripts`);

    // Create goals for each student
    console.log("\n🎯 Creating goals...");
    let totalGoals = 0;
    for (let i = 0; i < studentArray.length && i < uids.length; i++) {
      const [, studentData] = studentArray[i];
      await createGoals(studentData, uids[i]);
      totalGoals += studentData.goals.length;
    }
    console.log(`   ✅ Created ${totalGoals} goals`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n✨ Upload complete!\n");
    console.log("📊 Summary:");
    console.log(`   • Students: ${studentArray.length}`);
    console.log(`   • Transcripts: ${Object.keys(transcripts).length}`);
    console.log(`   • Goals: ${totalGoals}`);
    console.log(`   • Time: ${duration}s\n`);

    console.log("🎉 Data is now available in Firestore!\n");
    console.log("📝 Next steps:");
    console.log("   1. Verify data in Firebase Console: firestore.google.com");
    console.log("   2. Run embeddings: node scripts/embedTranscripts.js");
    console.log("   3. Test chat with your app\n");
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
