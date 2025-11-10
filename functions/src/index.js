const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Try to load .env for local development
try {
  require("dotenv").config();
} catch (e) {
  // .env not required - use Firebase config in production
}

// Initialize Firebase Admin SDK
admin.initializeApp();

// Helper to get config values (supports both .env and Firebase config)
const getConfig = () => ({
  openaiKey: process.env.OPENAI_API_KEY,
  pineconeKey: process.env.PINECONE_API_KEY,
  sendgridKey: process.env.SENDGRID_API_KEY,
  manualSecret: process.env.MANUAL_TRIGGER_SECRET,
});

// ============================================================================
// SERVICES & UTILITIES
// ============================================================================

const ChatService = require("./services/chatService");
const { generateQuiz } = require("./services/quizService");
const { submitQuiz } = require("./services/quizGradingService");
const { generateRecommendations } = require("./services/recommendationService");

/**
 * Validate Firebase ID token from Authorization header
 * Returns { uid, email, name } if valid
 */
async function validateToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const idToken = authHeader.split("Bearer ")[1];
  const decodedToken = await admin.auth().verifyIdToken(idToken);

  return {
    uid: decodedToken.uid,
    email: decodedToken.email,
    name: decodedToken.name || decodedToken.email.split("@")[0],
  };
}

// ============================================================================
// LIFECYCLE FUNCTIONS
// ============================================================================

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

// ============================================================================
// RECOMMENDATIONS & GOALS
// ============================================================================

// Cloud Function: Generate recommendations on goal completion
exports.generateRecommendationsOnGoalComplete = functions.firestore
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
        const completedGoal = after.goal || after.title;

        console.log(
          `🎉 Goal completed! Generating recommendations for ${studentId}`
        );

        const db = admin.firestore();

        // Generate recommendations
        const recommendations = await generateRecommendations(
          studentId,
          goalId,
          completedSubject,
          completedGoal,
          db
        );

        console.log(
          `   ✅ Recommendations generated (${recommendations.length} suggestions)`
        );
      }
    } catch (error) {
      functions.logger.error(
        `Error generating recommendations: ${error.message}`
      );
      // Don't throw - let the update succeed even if recommendations fail
    }
  });

// ============================================================================
// NUDGE SYSTEM (Phase 7)
// ============================================================================

const {
  checkAndSendDay7Nudge,
  checkAndSendInactivityNudge,
  checkAndSendGoalNearCompletionNudge,
} = require("./services/nudgeService");

// Cloud Function: Scheduled nudge checker (runs every hour)
exports.checkAndSendNudges = functions.pubsub
  .schedule("every 1 hours")
  .timeZone("America/New_York")
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
      return null;
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
      const MANUAL_TRIGGER_SECRET =
        process.env.MANUAL_TRIGGER_SECRET || "test-secret";
      if (token !== MANUAL_TRIGGER_SECRET) {
        return response.status(401).json({ error: "Invalid token" });
      }

      // Parse query parameter to determine which nudge to trigger
      const nudgeType = request.query.type || "all";

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

// ============================================================================
// HTTP ENDPOINTS: CHAT
// ============================================================================

/**
 * POST /api/chat
 * Send a message and get AI response with RAG context
 */
exports.chat = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const user = await validateToken(req);
    const { message, context_goals = [], context_mode = "all" } = req.body;
    const studentId = user.uid;

    console.log(`\n📨 Chat request from student: ${studentId}`);
    console.log(
      `   Context: mode=${context_mode}, goals=${context_goals.length}`
    );

    // Validate input
    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return res.status(400).json({
        error: "Invalid Request",
        message: "Message is required",
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({
        error: "Invalid Request",
        message: "Message too long (max 5000 characters)",
      });
    }

    // Extract subject/context information from goals for RAG filtering
    let ragContext = null;
    if (context_goals && context_goals.length > 0) {
      console.log(`   📋 Goal context received:`);
      context_goals.forEach((g, idx) => {
        console.log(
          `      ${idx + 1}. subject=${g.subject}, id=${g.id}, title=${g.title}`
        );
      });

      if (context_mode === "single" && context_goals.length === 1) {
        // Single goal mode - focus RAG on that subject
        ragContext = {
          subject: context_goals[0].subject,
          goal_id: context_goals[0].id,
          goal_title: context_goals[0].title || context_goals[0].goal,
          mode: "single",
        };
        console.log(
          `   ✅ RAG Context: Single goal - subject="${ragContext.subject}"`
        );
      } else if (context_mode === "all" && context_goals.length > 1) {
        // Multiple goals mode - use all subjects for RAG
        const subjects = context_goals.map((g) => g.subject).filter(Boolean);
        ragContext = {
          subjects: subjects,
          goal_ids: context_goals.map((g) => g.id),
          mode: "all",
        };
        console.log(
          `   ✅ RAG Context: Multiple goals - ${subjects.join(", ")}`
        );
      } else if (context_goals.length === 1) {
        // Single goal even if not explicitly in single mode
        ragContext = {
          subject: context_goals[0].subject,
          goal_id: context_goals[0].id,
          goal_title: context_goals[0].title || context_goals[0].goal,
          mode: "single",
        };
        console.log(
          `   ✅ RAG Context: Single goal - subject="${ragContext.subject}"`
        );
      }
    } else {
      console.log(`   ⚠️  No goal context provided`);
    }

    // Initialize chat service
    const config = getConfig();
    const chatService = new ChatService(
      config.openaiKey,
      config.pineconeKey,
      "study-buddy-28043"
    );

    // Process chat with RAG context
    const result = await chatService.chat(studentId, message, ragContext);

    res.status(200).json({
      success: true,
      response: result.response,
      metadata: {
        handoff_suggested: result.handoff,
        confidence: result.confidence,
        rag_enabled: result.context_retrieved,
        chunks_retrieved: result.chunk_count,
      },
    });
  } catch (error) {
    console.error("❌ Chat Error:", error.message);

    if (error.message.includes("Missing or invalid Authorization header")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: error.message,
      });
    }

    res.status(500).json({
      error: "Chat Failed",
      message: error.message,
    });
  }
});

/**
 * GET /api/chat/initial-context
 * Get student context for greeting message on chat open
 */
exports.chatInitialContext = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const user = await validateToken(req);
    const studentId = user.uid;

    // Parse context parameters from query string
    const goalIdsParam = req.query.goal_ids || "";
    const contextMode = req.query.context_mode || "all";
    const contextGoalIds = goalIdsParam
      .split(",")
      .filter((id) => id.trim())
      .map((id) => id.trim());

    console.log(`📋 Loading initial context for student: ${studentId}`);
    console.log(
      `   Context: mode=${contextMode}, goal_ids=${contextGoalIds.join(", ")}`
    );

    const db = admin.firestore();
    const studentDoc = await db.collection("students").doc(studentId).get();

    if (!studentDoc.exists) {
      console.warn(`   ❌ Student not found: ${studentId}`);
      return res.status(404).json({
        error: "Student not found",
      });
    }

    const student = studentDoc.data();
    const name = student.name || "there";
    console.log(`   ✅ Found student: ${name}`);

    // Fetch context goals if provided
    let contextGoals = [];
    if (contextGoalIds.length > 0) {
      try {
        for (const goalId of contextGoalIds) {
          const goalDoc = await db.collection("goals").doc(goalId).get();
          if (goalDoc.exists) {
            contextGoals.push({ id: goalDoc.id, ...goalDoc.data() });
          }
        }
        console.log(`   ✅ Loaded ${contextGoals.length} context goals`);
      } catch (error) {
        console.warn(`   Could not fetch context goals: ${error.message}`);
      }
    }

    // Get current active goal (for fallback if no context goals provided)
    let currentGoal = null;
    let goalProgress = 0;
    try {
      const goalsSnapshot = await db
        .collection("goals")
        .where("student_id", "==", studentId)
        .get();

      console.log(`   Found ${goalsSnapshot.size} total goals for student`);

      const activeGoals = goalsSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((goal) => goal.status === "active" || !goal.status);

      if (activeGoals.length > 0) {
        // Use first context goal if provided, otherwise use first active goal
        if (contextGoals.length > 0) {
          currentGoal = contextGoals[0];
        } else {
          currentGoal = activeGoals[0];
        }

        goalProgress =
          currentGoal.progress ||
          currentGoal.completion_percentage ||
          currentGoal.percent_complete ||
          0;

        const goalName =
          currentGoal.title ||
          currentGoal.goal ||
          currentGoal.subject ||
          "your learning";
        console.log(`   ✅ Using goal: ${goalName} (${goalProgress}%)`);
      }
    } catch (error) {
      console.warn(`   Could not fetch goals: ${error.message}`);
    }

    // Get last session transcripts (filtered by context goals if provided)
    let recentSessions = [];
    try {
      let sessionsQuery = db
        .collection("session_transcripts")
        .where("student_id", "==", studentId);

      // Filter by goal_id if specific goals are provided
      if (contextGoalIds.length > 0) {
        // Note: Firestore doesn't support OR queries with where easily,
        // so we'll fetch all and filter in code
        const sessionsSnapshot = await sessionsQuery.get();
        const allSessions = sessionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        recentSessions = allSessions
          .filter((session) =>
            contextGoalIds.includes(session.goal_id || session.goalId)
          )
          .map((doc) => ({
            subject: doc.subject,
            topics: doc.topics || [],
            date: doc.date,
            goalId: doc.goal_id || doc.goalId,
          }));
      } else {
        const sessionsSnapshot = await sessionsQuery.get();
        recentSessions = sessionsSnapshot.docs.map((doc) => ({
          subject: doc.subject,
          topics: doc.topics || [],
          date: doc.date,
          goalId: doc.data().goal_id || doc.data().goalId,
        }));
      }

      // Sort and slice
      recentSessions = recentSessions
        .sort((a, b) => {
          const dateA = a.date?.toDate?.() || new Date(a.date);
          const dateB = b.date?.toDate?.() || new Date(b.date);
          return dateB - dateA;
        })
        .slice(0, 3);

      console.log(`   ✅ Using ${recentSessions.length} recent sessions`);
    } catch (error) {
      console.warn(`   Could not fetch sessions: ${error.message}`);
    }

    // Generate context-aware greeting
    let greeting = `Hey ${name}! 👋 `;

    if (contextMode === "single" && contextGoals.length === 1) {
      // Single goal mode - focus on that specific goal
      const goal = contextGoals[0];
      const goalName = goal.title || goal.goal || goal.subject || "Learning";
      const goalProgress =
        goal.progress ||
        goal.completion_percentage ||
        goal.percent_complete ||
        0;

      greeting += `Let's focus on ${goalName}. You're ${goalProgress}% complete. `;

      // Find related session
      const relatedSession = recentSessions.find((s) => s.goalId === goal.id);
      if (relatedSession) {
        const topics = relatedSession.topics?.slice(0, 2).join(", ");
        if (topics) {
          greeting += `What questions do you have about ${topics}?`;
        } else {
          greeting += `What would you like to work on?`;
        }
      } else {
        greeting += `What would you like to understand better?`;
      }
    } else if (contextMode === "all" && contextGoals.length > 1) {
      // All goals mode - mention multiple goals
      const goalNames = contextGoals
        .map((g) => g.subject || g.title || g.goal || "Learning")
        .join(", ");
      greeting += `I see you're working on ${contextGoals.length} active goals: ${goalNames}. `;
      greeting += `Which topic would you like to explore today?`;
    } else if (recentSessions.length > 0) {
      // Fallback: use recent session info
      const lastSession = recentSessions[0];
      greeting += `How was your recent session on ${lastSession.subject}? `;

      if (currentGoal) {
        const goalName =
          currentGoal.title ||
          currentGoal.goal ||
          currentGoal.subject ||
          "your learning";
        greeting += `You're making great progress on **${goalName}** (${goalProgress}% complete). `;
        greeting += `How can I help you today? `;

        const topics =
          lastSession.topics?.slice(0, 2).join(", ") || "the topics";
        greeting += `Want to dive deeper into ${topics}?`;
      }
    } else if (currentGoal) {
      // Fallback: use current goal info
      const goalName =
        currentGoal.title ||
        currentGoal.goal ||
        currentGoal.subject ||
        "your learning";
      greeting += `You're making great progress on **${goalName}** (${goalProgress}% complete). `;
      greeting += `How can I help you today?`;
    } else {
      greeting += `What would you like to work on today?`;
    }

    res.status(200).json({
      greeting,
      student: {
        name,
      },
      currentGoal: currentGoal
        ? {
            subject: currentGoal.subject,
            progress: goalProgress,
          }
        : null,
      recentSessions: recentSessions.map((s) => ({
        subject: s.subject,
        topics: s.topics,
      })),
    });
  } catch (error) {
    console.error("❌ Initial Context Error:", error.message);

    if (error.message.includes("Missing or invalid Authorization header")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: error.message,
      });
    }

    res.status(500).json({
      error: "Failed to load context",
      message: error.message,
    });
  }
});

/**
 * GET /api/chat/history
 * Get conversation history for current student
 */
exports.chatHistory = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const user = await validateToken(req);
    const studentId = user.uid;

    console.log(`📜 Fetching history for student: ${studentId}`);

    const db = admin.firestore();

    const conversationsRef = db
      .collection("conversations")
      .where("student_id", "==", studentId)
      .limit(1);

    const snapshot = await conversationsRef.get();
    console.log(`   Found ${snapshot.size} conversation(s)`);

    if (snapshot.empty) {
      console.log(`   Returning empty history for new student`);
      return res.status(200).json({
        messages: [],
        conversation_id: null,
      });
    }

    const conversationId = snapshot.docs[0].id;
    const messages = snapshot.docs[0].data().messages || [];
    console.log(`   Returning ${messages.length} messages`);

    res.status(200).json({
      messages,
      conversation_id: conversationId,
    });
  } catch (error) {
    console.error("❌ History Error:", error.message);

    if (error.message.includes("Missing or invalid Authorization header")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: error.message,
      });
    }

    res.status(500).json({
      error: "History Retrieval Failed",
      message: error.message,
    });
  }
});

// ============================================================================
// HTTP ENDPOINTS: QUIZ
// ============================================================================

/**
 * POST /api/quiz/generate
 * Generate adaptive quiz for a specific goal
 */
exports.quizGenerate = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const user = await validateToken(req);
    const { goal_id, num_questions = 5 } = req.body;
    const studentId = user.uid;

    console.log(`\n📝 Quiz generation request from student: ${studentId}`);

    if (!goal_id) {
      return res.status(400).json({
        error: "Invalid Request",
        message: "goal_id is required",
      });
    }

    if (num_questions < 1 || num_questions > 20) {
      return res.status(400).json({
        error: "Invalid Request",
        message: "num_questions must be between 1 and 20",
      });
    }

    const db = admin.firestore();
    const quiz = await generateQuiz(studentId, goal_id, num_questions, db);

    res.status(200).json({
      success: true,
      quiz: quiz,
    });
  } catch (error) {
    console.error("❌ Quiz Generation Error:", error.message);

    if (error.message.includes("Missing or invalid Authorization header")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: error.message,
      });
    }

    res.status(500).json({
      error: "Quiz Generation Failed",
      message: error.message,
    });
  }
});

/**
 * POST /api/quiz/submit
 * Submit quiz answers and get grade
 */
exports.quizSubmit = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const user = await validateToken(req);
    const { quiz_id, answers } = req.body;
    const studentId = user.uid;

    console.log(`\n✅ Quiz submission from student: ${studentId}`);

    if (!quiz_id) {
      return res.status(400).json({
        error: "Invalid Request",
        message: "quiz_id is required",
      });
    }

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({
        error: "Invalid Request",
        message: "answers object is required",
      });
    }

    const db = admin.firestore();
    const result = await submitQuiz(quiz_id, studentId, answers, db);

    res.status(200).json({
      success: true,
      result: result,
    });
  } catch (error) {
    console.error("❌ Quiz Submission Error:", error.message);

    if (error.message.includes("Missing or invalid Authorization header")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: error.message,
      });
    }

    res.status(500).json({
      error: "Quiz Submission Failed",
      message: error.message,
    });
  }
});

/**
 * GET /api/quiz/:quizId
 * Get a specific quiz by ID
 */
exports.quizGet = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const user = await validateToken(req);
    const studentId = user.uid;

    // Extract quiz ID from path: /api/quiz/:quizId
    const pathParts = req.path.split("/");
    const quizId = pathParts[pathParts.length - 1];

    const db = admin.firestore();
    const quizDoc = await db.collection("quizzes").doc(quizId).get();

    if (!quizDoc.exists) {
      return res.status(404).json({
        error: "Not Found",
        message: `Quiz not found: ${quizId}`,
      });
    }

    const quiz = quizDoc.data();

    if (quiz.student_id !== studentId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have access to this quiz",
      });
    }

    res.status(200).json({
      success: true,
      quiz: quiz,
    });
  } catch (error) {
    console.error("❌ Quiz Fetch Error:", error.message);

    if (error.message.includes("Missing or invalid Authorization header")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: error.message,
      });
    }

    res.status(500).json({
      error: "Failed to fetch quiz",
      message: error.message,
    });
  }
});

// ============================================================================
// HTTP ENDPOINTS: RECOMMENDATIONS
// ============================================================================

/**
 * POST /api/recommendations/generate
 * Generate recommendations for a completed goal using GPT-4o-mini
 * Internal endpoint (can be called by frontend or Cloud Functions)
 */
exports.recommendationsGenerate = functions.https.onRequest(
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const {
        student_id,
        completed_goal_id,
        completed_subject,
        completed_goal,
      } = req.body;

      console.log(
        `\n💡 Generating recommendations for student: ${student_id}, completed: ${completed_subject}`
      );

      if (
        !student_id ||
        !completed_goal_id ||
        !completed_subject ||
        !completed_goal
      ) {
        return res.status(400).json({
          error: "Invalid Request",
          message:
            "student_id, completed_goal_id, completed_subject, and completed_goal are required",
        });
      }

      const db = admin.firestore();
      const recommendations = await generateRecommendations(
        student_id,
        completed_goal_id,
        completed_subject,
        completed_goal,
        db
      );

      console.log(
        `   ✅ Recommendations generated (${recommendations.length} suggestions)`
      );

      res.status(200).json({
        success: true,
        recommendations_count: recommendations.length,
        recommendations: recommendations,
      });
    } catch (error) {
      console.error("❌ Recommendations Error:", error.message);

      res.status(500).json({
        error: "Recommendations Generation Failed",
        message: error.message,
      });
    }
  }
);

// ============================================================================
// HTTP ENDPOINTS: TEST NUDGE EMAIL
// ============================================================================

/**
 * POST /api/test-nudge
 * Send a test nudge email to the current user
 * Used for testing the nudge system during development
 */
exports.testNudge = functions.https.onRequest(async (req, res) => {
  // Set CORS headers FIRST before any other response
  const origin = req.headers.origin;
  res.set("Access-Control-Allow-Origin", origin || "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Validate token
    const user = await validateToken(req);
    console.log(`\n📧 Test nudge requested by user: ${user.uid}`);

    // Get student profile
    const db = admin.firestore();
    const studentDoc = await db.collection("students").doc(user.uid).get();

    if (!studentDoc.exists) {
      console.error(`   ❌ Student profile not found for UID: ${user.uid}`);
      return res.status(404).json({ error: "Student profile not found" });
    }

    const student = studentDoc.data();
    const config = getConfig();

    if (!config.sendgridKey) {
      console.error("   ❌ SendGrid API key not configured");
      return res.status(500).json({
        error: "SendGrid not configured",
        message:
          "Email service is not available. Please set SENDGRID_API_KEY in Firebase config.",
      });
    }

    try {
      // Import SendGrid
      const sgMail = require("@sendgrid/mail");
      sgMail.setApiKey(config.sendgridKey);

      // Send test email
      const msg = {
        to: student.email,
        from: "ankitrijal2054@gmail.com",
        subject: "[TEST] Time to Study! 🚀",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937; margin-bottom: 16px;">Time to Study! 🚀</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 12px;">
              Hi ${student.name},
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 12px;">
              This is a <strong>test nudge email</strong> to verify the nudge system is working correctly.
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 12px;">
              Keep up the great learning! 💪
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              This is a test email. If you did not request this, please ignore it.
            </p>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log(`   ✅ Test nudge email sent to: ${student.email}`);

      res.status(200).json({
        success: true,
        message: "Test nudge email sent successfully",
        recipient: student.email,
      });
    } catch (sendgridError) {
      console.error(`❌ SendGrid Error: ${sendgridError.message}`);

      // Return specific SendGrid error
      res.status(500).json({
        error: "Failed to send email via SendGrid",
        message: sendgridError.message,
        details:
          "Check your SendGrid API key configuration and ensure it's valid.",
      });
    }
  } catch (error) {
    console.error(`❌ Test Nudge Error: ${error.message}`);

    res.status(500).json({
      error: "Test nudge request failed",
      message: error.message,
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

exports.health = functions.https.onRequest((req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "study-buddy-ai-functions",
  });
});
