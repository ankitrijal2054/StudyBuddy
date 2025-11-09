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
   */
  async retrieveContext(studentId, userMessage) {
    try {
      console.log(
        `   🔍 Retrieving context for: "${userMessage.substring(0, 50)}..."`
      );

      // Embed user message
      const embedding = await this.embedding.embedText(userMessage);

      // Query Pinecone with student isolation
      const results = await this.pinecone.queryByStudent(
        embedding,
        studentId,
        5 // top 5 results
      );

      // Format context from results
      const context = results
        .filter((r) => r.score >= 0.6) // Only include high-relevance results
        .map((r) => {
          return `[${r.metadata.subject} - ${r.metadata.transcript_id}]\n${r.metadata.chunk_text}`;
        })
        .join("\n\n");

      console.log(`   ✅ Found ${results.length} relevant transcript chunks`);
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
  async chat(studentId, userMessage) {
    try {
      console.log(
        `\n💬 Chat: ${studentId} - "${userMessage.substring(0, 50)}..."`
      );

      // Initialize if needed
      await this.initialize();

      // Get context
      const student = await this.getStudentProfile(studentId);
      const goals = await this.getStudentGoals(studentId);
      const ragContext = await this.retrieveContext(studentId, userMessage);

      // Format prompt
      const systemPrompt = `You are an AI Study Companion helping students learn and prepare.
Your role is to:
1. Answer questions about previous lessons (using provided context)
2. Explain concepts in a clear, supportive way
3. Provide practice problems and examples
4. Encourage learning and growth mindset
5. Suggest booking a tutor when appropriate

${student ? `Student: ${student.name} (Grade ${student.grade})` : ""}
${
  goals.length > 0
    ? `Current Goals: ${goals
        .map((g) => `${g.subject} (${g.progress}%)`)
        .join(", ")}`
    : ""
}

Guidelines:
- Be encouraging and supportive
- Use examples and analogies
- Keep responses concise (2-3 paragraphs max)
- If student seems frustrated, suggest tutoring
- Focus on helping them understand, not just giving answers`;

      let contextSection = "";
      if (ragContext) {
        contextSection = `\n\nContext from Previous Lessons:\n${ragContext}`;
      }

      // Call GPT-4o-mini
      console.log(`   🤖 Calling GPT-4o-mini...`);
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt + contextSection,
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
