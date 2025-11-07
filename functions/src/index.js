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

// Cloud Function: Generate recommendations on goal completion
exports.generateRecommendations = functions.firestore
  .document("goals/{goalId}")
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();

      // Only trigger when goal transitions to completed
      if (before.status !== "completed" && after.status === "completed") {
        const goalId = context.params.goalId;
        const studentId = after.student_id;
        const completedSubject = after.subject;
        const completedGoal = after.goal;

        // Call Cloud Run to generate recommendations
        const fetch = require("node-fetch");
        const CLOUD_RUN_URL =
          process.env.CLOUD_RUN_URL || "http://localhost:8080";

        const response = await fetch(
          `${CLOUD_RUN_URL}/api/recommendations/generate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Use service account credentials for internal calls
              "X-Internal-Request": "true",
            },
            body: JSON.stringify({
              student_id: studentId,
              completed_goal_id: goalId,
              completed_subject: completedSubject,
              completed_goal: completedGoal,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to generate recommendations: ${response.statusText}`
          );
        }

        functions.logger.info(
          `Recommendations generated for goal ${goalId} by student ${studentId}`
        );
      }
    } catch (error) {
      functions.logger.error(`Error generating recommendations: ${error}`);
      // Don't throw - let the update succeed even if recommendations fail
    }
  });

// Health check endpoint (if using Cloud Run, this can be added to Cloud Run)
exports.healthCheck = functions.https.onRequest((request, response) => {
  response.json({ status: "ok", timestamp: new Date().toISOString() });
});
