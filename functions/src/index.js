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

// Import nudge service
const {
  checkAndSendDay7Nudge,
  checkAndSendInactivityNudge,
  checkAndSendGoalNearCompletionNudge,
} = require("./services/nudgeService");

// Cloud Function: Scheduled nudge checker (runs every hour)
exports.checkAndSendNudges = functions.pubsub
  .schedule("every 1 hours")
  .timeZone("America/New_York") // Set timezone for consistency
  .onRun(async (context) => {
    try {
      functions.logger.info("Starting nudge check cycle");

      // Run all 3 nudge checks in parallel
      await Promise.all([
        checkAndSendDay7Nudge(),
        checkAndSendInactivityNudge(),
        checkAndSendGoalNearCompletionNudge(),
      ]);

      functions.logger.info("Nudge check cycle completed successfully");
      return null;
    } catch (error) {
      functions.logger.error(`Error in nudge check cycle: ${error}`);
      return null; // Don't throw - let Cloud Scheduler retry if needed
    }
  });

// Cloud Function: Manual nudge trigger (for testing)
exports.triggerNudgesManual = functions.https.onRequest(
  async (request, response) => {
    try {
      // Security: Check for authorization header
      const authHeader = request.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return response.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.substring(7);
      // In production, validate this token against a service account
      // For MVP, we'll just require a specific secret
      const MANUAL_TRIGGER_SECRET =
        process.env.MANUAL_TRIGGER_SECRET || "test-secret";
      if (token !== MANUAL_TRIGGER_SECRET) {
        return response.status(401).json({ error: "Invalid token" });
      }

      // Parse query parameter to determine which nudge to trigger
      const nudgeType = request.query.type || "all"; // all | day7 | inactivity | near_completion

      const results = {};

      if (nudgeType === "all" || nudgeType === "day7") {
        results.day7 = "Checking Day 7 nudges...";
        await checkAndSendDay7Nudge();
      }

      if (nudgeType === "all" || nudgeType === "inactivity") {
        results.inactivity = "Checking inactivity nudges...";
        await checkAndSendInactivityNudge();
      }

      if (nudgeType === "all" || nudgeType === "near_completion") {
        results.near_completion = "Checking goal near-completion nudges...";
        await checkAndSendGoalNearCompletionNudge();
      }

      return response.json({
        success: true,
        message: "Nudge trigger completed",
        results,
      });
    } catch (error) {
      functions.logger.error(`Error in manual nudge trigger: ${error}`);
      return response.status(500).json({
        error: "Failed to trigger nudges",
        details: error.message,
      });
    }
  }
);
