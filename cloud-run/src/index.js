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

    console.log(`\n📨 Chat request from ${studentId}`);

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

    // Process chat (no history, no persistence)
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
// QUIZ ENDPOINTS (Placeholder for Phase 4)
// ============================================================================

/**
 * POST /api/quiz/generate
 * Generate adaptive quiz for a subject
 * [PHASE 4 - Not yet implemented]
 */
app.post("/api/quiz/generate", validateFirebaseToken, async (req, res) => {
  res.status(501).json({
    error: "Not Implemented",
    message: "Quiz generation coming in Phase 4",
  });
});

/**
 * POST /api/quiz/submit
 * Submit quiz answers and get grade
 * [PHASE 4 - Not yet implemented]
 */
app.post("/api/quiz/submit", validateFirebaseToken, async (req, res) => {
  res.status(501).json({
    error: "Not Implemented",
    message: "Quiz submission coming in Phase 4",
  });
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
