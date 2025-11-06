const { OpenAI } = require("openai");
const { queryPinecone } = require("./pineconeService");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate a quiz for a specific goal
 * Retrieves context from student transcripts and weak areas
 *
 * @param {string} studentId - Firebase UID
 * @param {string} goalId - Goal document ID
 * @param {number} numQuestions - Number of questions (default 5)
 * @param {Object} db - Firestore database instance
 * @returns {Object} Generated quiz with questions and metadata
 */
async function generateQuiz(studentId, goalId, numQuestions = 5, db) {
  try {
    if (!db) {
      throw new Error("Firestore database instance is required");
    }

    // Get goal details
    const goalDoc = await db.collection("goals").doc(goalId).get();
    if (!goalDoc.exists) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    const goal = goalDoc.data();
    let subject = goal.subject;
    const title = goal.title || goal.goal;

    // If subject is not in goal, extract from title (e.g., "SAT Math: Algebra" → "SAT Math")
    if (!subject && title) {
      const parts = title.split(":");
      subject = parts[0].trim();
    }

    if (!subject) {
      throw new Error(
        `Cannot determine subject from goal: ${JSON.stringify(goal)}`
      );
    }

    console.log(`Generating quiz for ${subject}: ${title}`);

    // Get recent transcripts for this subject
    const transcriptsRef = db.collection("session_transcripts");
    const transcriptQuery = transcriptsRef
      .where("student_id", "==", studentId)
      .where("subject", "==", subject)
      .orderBy("date", "desc")
      .limit(3); // Get last 3 sessions for context

    const transcriptSnapshots = await transcriptQuery.get();
    let transcriptContent = "";

    if (transcriptSnapshots.empty) {
      console.warn(`No transcripts found for ${subject}, using fallback`);
      transcriptContent = `Topic: ${subject}\n${title}`;
    } else {
      transcriptSnapshots.forEach((doc) => {
        const data = doc.data();
        transcriptContent += `\n\nSession Date: ${data.date}\n`;
        transcriptContent += `Content: ${data.content}\n`;
      });
    }

    // Get weak concepts from past quiz results
    const quizResultsRef = db.collection("quiz_results");
    const resultsQuery = quizResultsRef
      .where("student_id", "==", studentId)
      .where("subject", "==", subject)
      .orderBy("created_at", "desc")
      .limit(5);

    const resultSnapshots = await resultsQuery.get();
    let weakConcepts = [];
    let avgScore = 100;

    if (!resultSnapshots.empty) {
      let totalScore = 0;
      resultSnapshots.forEach((doc) => {
        const data = doc.data();
        totalScore += data.score || 100;
        if (data.incorrect_questions) {
          weakConcepts.push(...data.incorrect_questions);
        }
      });
      avgScore = totalScore / resultSnapshots.size;
    }

    // Determine difficulty based on average score
    let difficulty = "medium";
    if (avgScore >= 85) {
      difficulty = "hard";
    } else if (avgScore < 60) {
      difficulty = "easy";
    }

    console.log(`Difficulty: ${difficulty}, Avg Score: ${avgScore}%`);

    // Prioritize weak concepts if any
    let focusArea = title;
    if (weakConcepts.length > 0) {
      focusArea = `${title}, focusing on: ${weakConcepts
        .slice(0, 3)
        .join(", ")}`;
    }

    // Generate quiz via GPT-4o-mini
    const prompt = `You are an expert tutor creating a ${difficulty} multiple-choice quiz.

Subject: ${subject}
Topic: ${focusArea}
Number of Questions: ${numQuestions}

Context from tutoring sessions:
${transcriptContent}

Create a quiz with exactly ${numQuestions} multiple-choice questions. Each question should:
1. Be at ${difficulty} difficulty level
2. Test understanding of the material from the sessions above
3. Have 4 options (A, B, C, D)
4. Have exactly ONE correct answer

Return ONLY valid JSON in this format:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text?",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correct_answer": "B",
      "explanation": "Brief explanation of why B is correct"
    }
  ]
}

Do NOT include any text before or after the JSON.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Parse the response
    let quizData;
    const content = response.choices[0].message.content.trim();

    try {
      quizData = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse GPT response:", content);
      throw new Error("Failed to parse quiz from LLM response");
    }

    // Validate quiz data
    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      throw new Error("Invalid quiz format from LLM");
    }

    // Save quiz to Firestore
    const quizRef = db.collection("quizzes").doc();
    const quizId = quizRef.id;

    await quizRef.set({
      quiz_id: quizId,
      student_id: studentId,
      goal_id: goalId,
      subject,
      title,
      difficulty,
      num_questions: quizData.questions.length,
      questions: quizData.questions,
      created_at: new Date().toISOString(),
      status: "active", // Not yet submitted
    });

    console.log(`Quiz created: ${quizId}`);

    return {
      quiz_id: quizId,
      subject,
      title,
      difficulty,
      num_questions: quizData.questions.length,
      questions: quizData.questions,
    };
  } catch (error) {
    console.error("Quiz generation error:", error);
    throw error;
  }
}

module.exports = {
  generateQuiz,
};
