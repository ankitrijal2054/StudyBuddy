const { Timestamp } = require("firebase-admin/firestore");

/**
 * Submit quiz answers and grade the quiz
 *
 * @param {string} quizId - Quiz document ID
 * @param {string} studentId - Firebase UID
 * @param {Object} answers - { questionId: "selected_answer" }
 * @param {Object} db - Firestore database instance
 * @returns {Object} Grade results with score, feedback, and goal completion status
 */
async function submitQuiz(quizId, studentId, answers, db) {
  try {
    if (!db) {
      throw new Error("Firestore database instance is required");
    }

    // Get quiz from Firestore
    const quizDoc = await db.collection("quizzes").doc(quizId).get();
    if (!quizDoc.exists) {
      throw new Error(`Quiz not found: ${quizId}`);
    }

    const quiz = quizDoc.data();

    // Verify student owns this quiz
    if (quiz.student_id !== studentId) {
      throw new Error("Unauthorized: Student does not own this quiz");
    }

    // Grade the quiz
    let correctCount = 0;
    let totalCount = quiz.questions.length;
    const questionResults = [];

    quiz.questions.forEach((question, index) => {
      const studentAnswer = answers[question.id] || answers[index] || null;
      const isCorrect = studentAnswer === question.correct_answer;

      if (isCorrect) {
        correctCount++;
      }

      questionResults.push({
        question_id: question.id,
        question_text: question.question,
        student_answer: studentAnswer,
        correct_answer: question.correct_answer,
        is_correct: isCorrect,
        explanation: question.explanation,
      });
    });

    const score = Math.round((correctCount / totalCount) * 100);
    const goalCompleted = score >= 85; // Auto-complete at 85%

    console.log(`Quiz graded: ${score}% (${correctCount}/${totalCount})`);

    // Save quiz result to Firestore
    const resultRef = db.collection("quiz_results").doc();
    const resultId = resultRef.id;

    await resultRef.set({
      result_id: resultId,
      quiz_id: quizId,
      student_id: studentId,
      goal_id: quiz.goal_id,
      subject: quiz.subject,
      title: quiz.title,
      score,
      correct_count: correctCount,
      total_count: totalCount,
      question_results: questionResults,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    console.log(`Quiz result saved: ${resultId}`);

    // If score >= 85%, auto-complete the goal
    let goalCompletionData = null;
    if (goalCompleted) {
      goalCompletionData = await completeGoal(
        studentId,
        quiz.goal_id,
        quiz.subject,
        score,
        db
      );
    }

    return {
      result_id: resultId,
      quiz_id: quizId,
      goal_id: quiz.goal_id,
      subject: quiz.subject,
      title: quiz.title,
      score,
      correct_count: correctCount,
      total_count: totalCount,
      goal_completed: goalCompleted,
      question_results: questionResults,
      completion_data: goalCompletionData,
    };
  } catch (error) {
    console.error("Quiz submission error:", error);
    throw error;
  }
}

/**
 * Auto-complete a goal when quiz score >= 85%
 *
 * @param {string} studentId - Firebase UID
 * @param {string} goalId - Goal document ID
 * @param {string} subject - Subject name
 * @param {number} score - Quiz score
 * @param {Object} db - Firestore database instance
 * @returns {Object} Goal completion data
 */
async function completeGoal(studentId, goalId, subject, score, db) {
  try {
    if (!db) {
      throw new Error("Firestore database instance is required");
    }

    // Get goal
    const goalDoc = await db.collection("goals").doc(goalId).get();
    if (!goalDoc.exists) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    const goal = goalDoc.data();

    // Update goal to completed
    await db.collection("goals").doc(goalId).update({
      status: "completed",
      progress: 1.0,
      completed_at: new Date().toISOString(),
      final_score: score,
    });

    console.log(`Goal completed: ${goalId} with score ${score}%`);

    // Create event to trigger recommendations (Phase 6)
    const eventRef = db.collection("events").doc();
    await eventRef.set({
      event_type: "goal_completed",
      student_id: studentId,
      goal_id: goalId,
      subject,
      score,
      created_at: new Date().toISOString(),
      processed: false, // For async recommendation processing
    });

    return {
      goal_id: goalId,
      status: "completed",
      message: `🎉 Congratulations! You completed "${goal.title}" with a score of ${score}%!`,
      next_action: "recommendations",
    };
  } catch (error) {
    console.error("Goal completion error:", error);
    throw error;
  }
}

module.exports = {
  submitQuiz,
  completeGoal,
};
