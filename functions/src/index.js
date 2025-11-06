const functions = require("firebase-functions");
const admin = require("firebase-admin");
require("dotenv").config();

// Initialize Firebase Admin SDK
admin.initializeApp();

// Cloud Function: Create user profile on new user registration
exports.createUserProfile = functions.auth.user().onCreate(async (user) => {
  try {
    const { uid, email, displayName } = user;

    // Create user document in 'users' collection
    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .set({
        uid,
        email,
        displayName: displayName || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        role: "student",
      });

    // Create student profile document
    await admin
      .firestore()
      .collection("students")
      .doc(uid)
      .set({
        uid,
        email,
        name: displayName || "Student",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        grade: "unspecified",
        enrollmentDate: new Date().toISOString(),
        totalSessions: 0,
        averageScore: 0,
      });

    functions.logger.info(`User profile created for ${uid}`);
  } catch (error) {
    functions.logger.error(`Error creating user profile: ${error}`);
  }
});

// Cloud Function: Delete user data on user deletion
exports.deleteUserProfile = functions.auth.user().onDelete(async (user) => {
  try {
    const { uid } = user;

    // Delete user document
    await admin.firestore().collection("users").doc(uid).delete();

    // Delete student profile
    await admin.firestore().collection("students").doc(uid).delete();

    functions.logger.info(`User profile deleted for ${uid}`);
  } catch (error) {
    functions.logger.error(`Error deleting user profile: ${error}`);
  }
});

// Health check endpoint (if using Cloud Run, this can be added to Cloud Run)
exports.healthCheck = functions.https.onRequest((request, response) => {
  response.json({ status: "ok", timestamp: new Date().toISOString() });
});
