/**
 * API Service
 *
 * Centralized API endpoint management using Firebase Functions
 * All endpoints now use Firebase Cloud Functions instead of Cloud Run
 */

// Get Firebase Functions base URL
// For local testing: http://localhost:5001/PROJECT_ID/us-central1
// For production: https://us-central1-PROJECT_ID.cloudfunctions.net
const getFunctionsUrl = () => {
  const isDev = import.meta.env.DEV;
  const projectId =
    import.meta.env.VITE_FIREBASE_PROJECT_ID || "study-buddy-ai";

  if (isDev) {
    return "http://localhost:5001/" + projectId + "/us-central1";
  } else {
    return `https://us-central1-${projectId}.cloudfunctions.net`;
  }
};

const FUNCTIONS_URL = getFunctionsUrl();

/**
 * Wrap API calls with common error handling
 */
const apiCall = async (functionName, method = "GET", body = null, token) => {
  const url = `${FUNCTIONS_URL}/${functionName}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message ||
        errorData.error ||
        `API call failed: ${response.statusText}`
    );
  }

  return await response.json();
};

// ============================================================================
// CHAT ENDPOINTS
// ============================================================================

export const chatAPI = {
  /**
   * Get initial greeting and student context
   */
  async getInitialContext(token) {
    return apiCall("chatInitialContext", "GET", null, token);
  },

  /**
   * Send a message and get AI response
   */
  async sendMessage(message, token) {
    return apiCall("chat", "POST", { message }, token);
  },

  /**
   * Get chat history
   */
  async getHistory(token) {
    return apiCall("chatHistory", "GET", null, token);
  },
};

// ============================================================================
// QUIZ ENDPOINTS
// ============================================================================

export const quizAPI = {
  /**
   * Generate a quiz for a goal
   */
  async generateQuiz(goalId, numQuestions = 5, token) {
    return apiCall(
      "quizGenerate",
      "POST",
      { goal_id: goalId, num_questions: numQuestions },
      token
    );
  },

  /**
   * Submit quiz answers and get grade
   */
  async submitQuiz(quizId, answers, token) {
    return apiCall("quizSubmit", "POST", { quiz_id: quizId, answers }, token);
  },

  /**
   * Get a specific quiz
   */
  async getQuiz(quizId, token) {
    // Note: This uses a generic HTTP function that extracts the quiz ID from the path
    // For simplicity, we can create a direct endpoint in Firebase Functions
    return apiCall(`quizGet?id=${quizId}`, "GET", null, token);
  },
};

// ============================================================================
// RECOMMENDATIONS ENDPOINTS
// ============================================================================

export const recommendationsAPI = {
  /**
   * Generate recommendations for a completed goal
   * Note: This can be called with or without authentication
   * (internally called by Cloud Functions, but can also be called from frontend)
   */
  async generateRecommendations(
    studentId,
    completedGoalId,
    completedSubject,
    completedGoal,
    token = null
  ) {
    return apiCall(
      "recommendationsGenerate",
      "POST",
      {
        student_id: studentId,
        completed_goal_id: completedGoalId,
        completed_subject: completedSubject,
        completed_goal: completedGoal,
      },
      token
    );
  },
};

// ============================================================================
// TEST NUDGE ENDPOINTS
// ============================================================================

export const testNudgeAPI = {
  /**
   * Send a test nudge email
   */
  async sendTestNudge(token) {
    return apiCall("testNudge", "POST", {}, token);
  },
};

// ============================================================================
// UTILITIES
// ============================================================================

export const apiService = {
  /**
   * Get the base Functions URL (useful for debugging)
   */
  getBasUrl: () => FUNCTIONS_URL,

  /**
   * Health check
   */
  async healthCheck() {
    return apiCall("health", "GET");
  },
};

export default {
  chat: chatAPI,
  quiz: quizAPI,
  recommendations: recommendationsAPI,
  testNudge: testNudgeAPI,
  service: apiService,
};
