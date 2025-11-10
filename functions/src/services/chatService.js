/**
 * Chat Service (Simplified)
 *
 * Handles RAG-powered conversational AI:
 * - Embeds user messages with OpenAI
 * - Retrieves relevant context from Pinecone
 * - Generates responses with GPT-4o-mini
 * - Detects handoff triggers (escalation to human tutor)
 *
 * NO conversation history persistence
 * (Dashboard & tutoring platform handle history)
 */

const { OpenAI } = require("openai");
const admin = require("firebase-admin");
const EmbeddingService = require("./embeddingService");
const PineconeService = require("./pineconeService");

class ChatService {
  constructor(openaiKey, pineconeKey, projectId) {
    this.openai = new OpenAI({ apiKey: openaiKey });
    this.embedding = new EmbeddingService(openaiKey);
    this.pinecone = new PineconeService(pineconeKey);
    this.projectId = projectId;
    this.db = admin.firestore();
    this.initialized = false;
  }

  /**
   * Initialize Pinecone connection
   */
  async initialize() {
    if (!this.initialized) {
      await this.pinecone.initialize();
      this.initialized = true;
      console.log("✅ ChatService initialized");
    }
  }

  /**
   * Get student profile information for context
   */
  async getStudentProfile(studentId) {
    try {
      const doc = await this.db.collection("students").doc(studentId).get();

      if (!doc.exists) {
        console.warn(`Student ${studentId} not found in Firestore`);
        return null;
      }

      return doc.data();
    } catch (error) {
      console.warn(`Failed to get student profile: ${error.message}`);
      return null;
    }
  }

  /**
   * Get student's active goals for context
   */
  async getStudentGoals(studentId) {
    try {
      const snapshot = await this.db
        .collection("goals")
        .where("student_id", "==", studentId)
        .where("status", "!=", "completed")
        .limit(3)
        .get();

      return snapshot.docs.map((doc) => ({
        subject: doc.data().subject,
        goal: doc.data().goal,
        progress: doc.data().progress || 0,
      }));
    } catch (error) {
      console.warn(`Failed to get student goals: ${error.message}`);
      return [];
    }
  }

  /**
   * Retrieve RAG context from Pinecone
   * @param {string} studentId - Student ID
   * @param {string} userMessage - User message to embed
   * @param {object} goalContext - Optional goal context with subject/goal_ids for filtering
   */
  async retrieveContext(studentId, userMessage, goalContext = null) {
    try {
      let contextMsg = `"${userMessage.substring(0, 50)}..."`;
      if (goalContext) {
        if (goalContext.mode === "single") {
          contextMsg += ` [Focus: ${goalContext.subject}]`;
        } else if (goalContext.mode === "all") {
          contextMsg += ` [Context: ${goalContext.subjects.join(", ")}]`;
        }
      }
      console.log(`   🔍 Retrieving context for: ${contextMsg}`);

      // Embed user message
      const embedding = await this.embedding.embedText(userMessage);

      // Query Pinecone with student isolation and optional subject filtering
      const results = await this.pinecone.queryByStudent(
        embedding,
        studentId,
        5, // top 5 results
        goalContext // Pass goal context for optional filtering
      );

      // Format context from results - use lower threshold initially
      const relevantResults = results.filter((r) => r.score >= 0.5); // Lowered from 0.6

      console.log(
        `   ℹ️  Filtering ${results.length} results by score >= 0.5: ${relevantResults.length} kept`
      );

      // Fetch full transcripts from Firestore
      console.log(`   📚 Fetching full transcripts from Firestore...`);
      const transcriptMap = new Map();

      // Get unique transcript IDs
      const uniqueTranscriptIds = [
        ...new Set(relevantResults.map((r) => r.metadata.transcript_id)),
      ];

      // Fetch each transcript
      for (const transcriptId of uniqueTranscriptIds) {
        try {
          const docs = await this.db
            .collection("session_transcripts")
            .where("transcript_id", "==", transcriptId)
            .where("student_id", "==", studentId)
            .limit(1)
            .get();

          if (!docs.empty) {
            const transcriptData = docs.docs[0].data();
            transcriptMap.set(transcriptId, transcriptData);
            console.log(
              `   ✅ Fetched: ${transcriptId} (${
                transcriptData.transcript_body?.length || 0
              } chars)`
            );
          }
        } catch (error) {
          console.log(
            `   ⚠️  Could not fetch ${transcriptId}: ${error.message}`
          );
        }
      }

      const context = relevantResults
        .map((r) => {
          const subject = r.metadata.subject || "Unknown";
          const transcriptId = r.metadata.transcript_id || "unknown";

          // Try to get actual transcript content from Firestore first
          let content = null;
          const fullTranscript = transcriptMap.get(transcriptId);

          if (fullTranscript?.transcript_body) {
            content = fullTranscript.transcript_body;
            console.log(
              `   ✅ Using transcript body (${content.length} chars)`
            );
          } else {
            // Try different fields from Firestore document
            content =
              fullTranscript?.content ||
              fullTranscript?.text ||
              r.metadata.chunk_text ||
              r.metadata.content ||
              r.metadata.transcript ||
              r.metadata.text ||
              "";
          }

          if (!content) {
            console.warn(
              `   ⚠️  No content for ${transcriptId}. Available Firestore keys:`,
              fullTranscript
                ? Object.keys(fullTranscript)
                : "document not found"
            );
          }

          return `[${subject} - ${transcriptId}]\n${content}`;
        })
        .join("\n\n");

      if (context) {
        console.log(
          `   ✅ Formatted context: ${relevantResults.length} chunks (${content.length} chars)`
        );
      } else {
        console.log(`   ⚠️  No content extracted from metadata`);
      }

      return context;
    } catch (error) {
      console.warn(`   ⚠️  RAG retrieval failed: ${error.message}`);
      return ""; // Continue without context if retrieval fails
    }
  }

  /**
   * Detect if message should trigger handoff to human tutor
   *
   * Triggers on:
   * 1. Frustration keywords (confusion, asking for help)
   * 2. Direct requests for tutor
   * 3. Complex problem indicators (excessive question marks, multiple unclear concepts)
   */
  detectHandoff(userMessage) {
    const messageLower = userMessage.toLowerCase();

    // Frustration indicators - student is confused or frustrated
    const frustrationKeywords = [
      "i don't understand",
      "confused",
      "confusing",
      "not making sense",
      "still don't get it",
      "help me",
      "need help",
      "stuck",
      "don't know",
      "lost",
      "what?",
      "huh?",
      "can't figure",
      "give up",
      "frustrated",
      "struggling",
      "this is hard",
      "too complicated",
      "makes no sense",
    ];

    // Direct tutor requests
    const tutorKeywords = [
      "talk to a tutor",
      "book a tutor",
      "need a tutor",
      "real tutor",
      "human teacher",
      "human tutor",
      "actual teacher",
      "one-on-one",
      "personal tutor",
      "professional help",
    ];

    // Check for frustration
    const hasFrustration = frustrationKeywords.some((keyword) =>
      messageLower.includes(keyword)
    );

    // Check for direct tutor request
    const hasTutorRequest = tutorKeywords.some((keyword) =>
      messageLower.includes(keyword)
    );

    // Check for complexity indicators
    const questionMarkCount = (messageLower.match(/\?/g) || []).length;
    const messageLength = userMessage.length;
    const hasComplexity =
      questionMarkCount >= 2 || (messageLength > 200 && questionMarkCount >= 1);

    // Determine if handoff should trigger
    const should_handoff = hasFrustration || hasTutorRequest || hasComplexity;

    // Confidence score
    let confidence = 0.2;
    if (hasTutorRequest) confidence = 0.95;
    else if (hasFrustration && hasComplexity) confidence = 0.85;
    else if (hasFrustration) confidence = 0.75;
    else if (hasComplexity) confidence = 0.65;

    return {
      should_handoff,
      confidence: should_handoff ? confidence : 0.1,
    };
  }

  /**
   * Main chat handler: Process message and generate response
   */
  async chat(studentId, userMessage, goalContext = null) {
    try {
      console.log(
        `\n💬 Chat: ${studentId} - "${userMessage.substring(0, 50)}..."`
      );
      if (goalContext) {
        if (goalContext.mode === "single") {
          console.log(`   Subject Focus: ${goalContext.subject}`);
        } else if (goalContext.mode === "all") {
          console.log(`   Subject Context: ${goalContext.subjects.join(", ")}`);
        }
      }

      // Initialize if needed
      await this.initialize();

      // Get context
      const student = await this.getStudentProfile(studentId);
      const goals = await this.getStudentGoals(studentId);

      // Retrieve context from RAG, filtering by goal context if provided
      let ragContext = await this.retrieveContext(
        studentId,
        userMessage,
        goalContext
      );

      // Format prompt with context awareness
      let goalsDisplay = "";
      if (goalContext && goalContext.mode === "single") {
        goalsDisplay = `Current Focus: ${goalContext.goal_title} (${goalContext.subject})`;
      } else if (
        goalContext &&
        goalContext.mode === "all" &&
        goals.length > 0
      ) {
        goalsDisplay = `Current Goals: ${goals
          .map((g) => `${g.subject} (${g.progress}%)`)
          .join(", ")}`;
      } else if (goals.length > 0) {
        goalsDisplay = `Current Goals: ${goals
          .map((g) => `${g.subject} (${g.progress}%)`)
          .join(", ")}`;
      }

      const systemPrompt = `You are an AI Study Companion helping students learn and prepare.
Your role is to:
1. Answer questions about previous lessons (using provided context)
2. Explain concepts in a clear, supportive way
3. Provide practice problems and examples
4. Encourage learning and growth mindset
5. Suggest booking a tutor when appropriate

${student ? `Student: ${student.name} (Grade ${student.grade})` : ""}
${goalsDisplay}

Guidelines:
- Be encouraging and supportive
- Use examples and analogies
- Keep responses concise (1-2 paragraphs max)
- If student seems frustrated, suggest tutoring
- Focus on helping them understand, not just giving answers`;

      let contextSection = "";
      if (ragContext && ragContext.length > 0) {
        contextSection = `\n\nContext from Previous Lessons:\n${ragContext}`;
        console.log(`   📚 RAG Context (${ragContext.length} chars):`);
        console.log(`      ${ragContext.substring(0, 100)}...`);
      } else {
        console.log(`   ⚠️  No RAG context available`);
      }

      // Build full prompt
      const fullSystemPrompt = systemPrompt + contextSection;
      console.log(
        `   🤖 Calling GPT-4o-mini with prompt (${fullSystemPrompt.length} chars)...`
      );

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: fullSystemPrompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const aiResponse =
        response.choices[0]?.message?.content ||
        "I couldn't generate a response.";

      console.log(`   ✅ Response generated (${aiResponse.length} chars)`);

      // Detect handoff
      const handoff = this.detectHandoff(userMessage);

      return {
        response: aiResponse,
        handoff: handoff.should_handoff,
        confidence: handoff.confidence,
        context_retrieved: ragContext.length > 0,
        chunk_count: ragContext.split("\n\n").filter((x) => x.trim()).length,
      };
    } catch (error) {
      console.error(`   ❌ Chat error: ${error.message}`);
      throw new Error(`Chat failed: ${error.message}`);
    }
  }
}

module.exports = ChatService;
