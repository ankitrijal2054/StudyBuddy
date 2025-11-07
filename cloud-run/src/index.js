/**
 * Cloud Run Express Server
 *
 * Main entry point for AI Study Companion backend
 * Handles chat, quiz, and RAG endpoints
 */

// Load .env if it exists (optional for Cloud Run)
try {
  require("dotenv").config();
} catch (error) {
  // .env not required - Cloud Run uses environment variables
}

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// Middleware
const { validateFirebaseToken } = require("./middleware/auth");

// Services
const ChatService = require("./services/chatService");
const { generateQuiz } = require("./services/quizService");
const { submitQuiz } = require("./services/quizGradingService");

// Initialize Firebase Admin SDK
try {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT || "{}"
  );

  if (Object.keys(serviceAccount).length > 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    console.log("✅ Firebase Admin SDK initialized with service account");
  } else if (process.env.FIREBASE_PROJECT_ID) {
    // If no service account, assume running in Cloud Run environment
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    console.log("✅ Firebase Admin SDK initialized (Cloud Run environment)");
  } else {
    console.warn("⚠️  FIREBASE_PROJECT_ID not set");
  }
} catch (error) {
  console.error("❌ Firebase initialization error:", error.message);
}

// Initialize services
const chatService = new ChatService(
  process.env.OPENAI_API_KEY,
  process.env.PINECONE_API_KEY,
  process.env.FIREBASE_PROJECT_ID
);

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "study-buddy-ai",
  });
});

// ============================================================================
// DEBUG ENDPOINTS
// ============================================================================

/**
 * GET /api/debug/student-data
 * Debug endpoint: Show what student data exists in Firestore
 */
app.get("/api/debug/student-data", validateFirebaseToken, async (req, res) => {
  try {
    const studentId = req.user.uid;
    console.log(`\n🔍 DEBUG: Checking data for student: ${studentId}`);

    const db = admin.firestore();

    // Check students collection
    const studentDoc = await db.collection("students").doc(studentId).get();
    console.log(
      `   students/${studentId}:`,
      studentDoc.exists ? "✅ EXISTS" : "❌ NOT FOUND"
    );

    // List ALL goals for this student
    const goalsSnapshot = await db
      .collection("goals")
      .where("student_id", "==", studentId)
      .get();
    console.log(`   goals for ${studentId}:`, goalsSnapshot.size);

    // List FIRST 5 goals in entire collection to see what student_ids exist
    const allGoalsSnapshot = await db.collection("goals").limit(5).get();
    console.log(`   \n   Sample goals in collection:`);
    allGoalsSnapshot.docs.forEach((doc) => {
      console.log(
        `     - student_id: "${doc.data().student_id}", subject: "${
          doc.data().subject
        }"`
      );
    });

    // List ALL session transcripts for this student
    const sessionsSnapshot = await db
      .collection("session_transcripts")
      .where("student_id", "==", studentId)
      .get();
    console.log(
      `   \n   session_transcripts for ${studentId}:`,
      sessionsSnapshot.size
    );

    // List FIRST 5 sessions to see what student_ids exist
    const allSessionsSnapshot = await db
      .collection("session_transcripts")
      .limit(5)
      .get();
    console.log(`   \n   Sample sessions in collection:`);
    allSessionsSnapshot.docs.forEach((doc) => {
      console.log(
        `     - student_id: "${doc.data().student_id}", subject: "${
          doc.data().subject
        }"`
      );
    });

    res.status(200).json({
      currentUserId: studentId,
      studentDocExists: studentDoc.exists,
      goalsCount: goalsSnapshot.size,
      sessionsCount: sessionsSnapshot.size,
      message: "Check terminal for debug output",
    });
  } catch (error) {
    console.error("❌ Debug error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CHAT ENDPOINTS
// ============================================================================

/**
 * POST /api/chat
 * Send a message and get AI response with RAG context
 * No history persistence - fresh conversation each time
 */
app.post("/api/chat", validateFirebaseToken, async (req, res) => {
  try {
    const { message } = req.body;
    const studentId = req.user.uid;

    console.log(`\n📨 Chat request from student: ${studentId}`);

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

    // Process chat using Firebase UID as student_id
    const result = await chatService.chat(studentId, message);

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

    res.status(500).json({
      error: "Chat Failed",
      message: error.message,
    });
  }
});

/**
 * GET /api/chat/initial-context
 * Get student context for greeting message on chat open
 * Returns: name, current goal, progress, last session info
 */
app.get(
  "/api/chat/initial-context",
  validateFirebaseToken,
  async (req, res) => {
    try {
      const studentId = req.user.uid;
      console.log(`📋 Loading initial context for student: ${studentId}`);

      const db = admin.firestore();

      // Get student info using Firebase UID as primary ID
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

      // Get current active goal (query all goals and filter client-side to avoid index requirement)
      let currentGoal = null;
      let goalProgress = 0;
      try {
        const goalsSnapshot = await db
          .collection("goals")
          .where("student_id", "==", studentId)
          .get();

        console.log(`   Found ${goalsSnapshot.size} goals for student`);

        // Filter for active goals client-side
        const activeGoals = goalsSnapshot.docs
          .map((doc) => doc.data())
          .filter((goal) => goal.status === "active" || !goal.status);

        if (activeGoals.length > 0) {
          currentGoal = activeGoals[0];

          // Log all fields to see what's available
          console.log(`   Goal fields:`, Object.keys(currentGoal));

          // Try different progress field names
          goalProgress =
            currentGoal.progress ||
            currentGoal.completion_percentage ||
            currentGoal.percent_complete ||
            0;

          // Use correct field names: title, goal, subject (fallback order)
          const goalName =
            currentGoal.title ||
            currentGoal.goal ||
            currentGoal.subject ||
            "your learning";
          console.log(`   ✅ Using goal: ${goalName} (${goalProgress}%)`);
        } else {
          console.warn(`   No active goals found`);
        }
      } catch (error) {
        console.warn(`   Could not fetch goals: ${error.message}`);
      }

      // Get last session transcripts (top 3 most recent)
      let recentSessions = [];
      try {
        const sessionsSnapshot = await db
          .collection("session_transcripts")
          .where("student_id", "==", studentId)
          .get();

        console.log(`   Found ${sessionsSnapshot.size} session transcripts`);

        // Sort by date client-side and take top 3
        recentSessions = sessionsSnapshot.docs
          .map((doc) => ({
            subject: doc.data().subject,
            topics: doc.data().topics || [],
            date: doc.data().date,
          }))
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

      // Generate greeting message
      let greeting = `Hey ${name}! 👋 `;

      if (recentSessions.length > 0) {
        const lastSession = recentSessions[0];
        greeting += `How was your recent session on ${lastSession.subject}? `;
      }

      if (currentGoal) {
        // Use correct field names: title, goal, subject
        const goalName =
          currentGoal.title ||
          currentGoal.goal ||
          currentGoal.subject ||
          "your learning";
        greeting += `You're making great progress on **${goalName}** (${goalProgress}% complete). `;
        greeting += `How can I help you today? `;

        if (recentSessions.length > 0) {
          const lastSession = recentSessions[0];
          const topics =
            lastSession.topics?.slice(0, 2).join(", ") || "the topics";
          greeting += `Want to dive deeper into ${topics}?`;
        }
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

      res.status(500).json({
        error: "Failed to load context",
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/chat/history
 * Get conversation history for current student
 */
app.get("/api/chat/history", validateFirebaseToken, async (req, res) => {
  try {
    const studentId = req.user.uid;
    console.log(`📜 Fetching history for student: ${studentId}`);

    const db = admin.firestore();
    if (!db) {
      throw new Error("Firestore not initialized. Check FIREBASE_PROJECT_ID.");
    }

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
    console.error("   Stack:", error.stack);

    res.status(500).json({
      error: "History Retrieval Failed",
      message: error.message,
      debug: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// ============================================================================
// QUIZ ENDPOINTS (Phase 4)
// ============================================================================

/**
 * POST /api/quiz/generate
 * Generate adaptive quiz for a specific goal
 * Body: { goal_id, num_questions? }
 */
app.post("/api/quiz/generate", validateFirebaseToken, async (req, res) => {
  try {
    const { goal_id, num_questions = 5 } = req.body;
    const studentId = req.user.uid;

    console.log(`\n📝 Quiz generation request from student: ${studentId}`);

    // Validate input
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

    // Generate quiz
    const db = admin.firestore();
    const quiz = await generateQuiz(studentId, goal_id, num_questions, db);

    res.status(200).json({
      success: true,
      quiz: quiz,
    });
  } catch (error) {
    console.error("❌ Quiz Generation Error:", error.message);

    res.status(500).json({
      error: "Quiz Generation Failed",
      message: error.message,
    });
  }
});

/**
 * POST /api/quiz/submit
 * Submit quiz answers and get grade
 * Body: { quiz_id, answers: { question_id: "selected_answer" } }
 */
app.post("/api/quiz/submit", validateFirebaseToken, async (req, res) => {
  try {
    const { quiz_id, answers } = req.body;
    const studentId = req.user.uid;

    console.log(`\n✅ Quiz submission from student: ${studentId}`);

    // Validate input
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

    // Submit and grade quiz
    const db = admin.firestore();
    const result = await submitQuiz(quiz_id, studentId, answers, db);

    res.status(200).json({
      success: true,
      result: result,
    });
  } catch (error) {
    console.error("❌ Quiz Submission Error:", error.message);

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
app.get("/api/quiz/:quizId", validateFirebaseToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const studentId = req.user.uid;

    const db = admin.firestore();
    const quizDoc = await db.collection("quizzes").doc(quizId).get();

    if (!quizDoc.exists) {
      return res.status(404).json({
        error: "Not Found",
        message: `Quiz not found: ${quizId}`,
      });
    }

    const quiz = quizDoc.data();

    // Verify student owns this quiz
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

    res.status(500).json({
      error: "Failed to fetch quiz",
      message: error.message,
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Unhandled Error:", err);

  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development" ? err.message : "Server error",
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`\n🚀 Study Buddy AI Service started on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Firebase Project: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`   Health Check: http://localhost:${PORT}/health\n`);
});

module.exports = app;
