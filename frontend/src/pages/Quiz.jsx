import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoalCompletionModal } from "@/components/GoalCompletionModal";
import { getAuth } from "firebase/auth";
import toast from "react-hot-toast";
import { quizAPI } from "@/services/apiService";
import {
  ArrowLeft,
  BookOpen,
  Zap,
  Award,
  CheckCircle,
  XCircle,
  Target,
  BarChart3,
} from "lucide-react";

export default function Quiz() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const auth = getAuth();

  // State with localStorage persistence
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quiz, setQuiz] = useState(() => {
    try {
      const saved = localStorage.getItem("quiz_data");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to load quiz data:", e);
      return null;
    }
  });
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem("quiz_answers");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to load quiz answers:", e);
      return {};
    }
  });
  const [result, setResult] = useState(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
    try {
      const saved = localStorage.getItem("quiz_question_index");
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      console.error("Failed to load quiz question index:", e);
      return 0;
    }
  });

  const goalId = location.state?.goalId;
  const goal = location.state?.goal;

  // Validate that we have a goal selected
  useEffect(() => {
    if (!goalId) {
      toast.error("Please select a topic first");
      navigate("/dashboard");
      return;
    }
  }, [goalId, navigate]);

  // Generate quiz on mount
  useEffect(() => {
    if (!currentUser || !goalId) return;

    const generateQuiz = async () => {
      try {
        setLoading(true);
        const token = await currentUser.getIdToken();

        const data = await quizAPI.generateQuiz(goalId, 5, token);
        setQuiz(data.quiz);

        // Log all quiz results with correct answers
        console.log("\n📋 QUIZ LOADED - All Questions & Answers:");
        console.log("=".repeat(60));
        console.log(`📚 Subject: ${data.quiz.subject}`);
        console.log(`📖 Title: ${data.quiz.title}`);
        console.log(`⚡ Difficulty: ${data.quiz.difficulty}`);
        console.log(`📝 Total Questions: ${data.quiz.num_questions}`);
        console.log("=".repeat(60));

        data.quiz.questions.forEach((q, idx) => {
          console.log(`\n❓ Question ${idx + 1}: ${q.question}`);
          console.log(`   Options:`);
          Object.entries(q.options).forEach(([key, value]) => {
            const isCorrect = key === q.correct_answer ? " ✅ CORRECT" : "";
            console.log(`   ${key.toUpperCase()}) ${value}${isCorrect}`);
          });
          console.log(`   Answer Key: ${q.correct_answer.toUpperCase()}`);
        });

        console.log("\n" + "=".repeat(60));
        console.log("✅ Quiz ready to take!\n");

        toast.success("Quiz generated! Let's get started 🎯");
      } catch (error) {
        console.error("Quiz generation error:", error);
        toast.error("Failed to generate quiz: " + error.message);
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    // Only generate if we don't have a saved quiz
    if (!quiz) {
      generateQuiz();
    } else {
      setLoading(false);

      // Also log when loading from localStorage
      console.log("\n📋 QUIZ LOADED FROM CACHE - All Questions & Answers:");
      console.log("=".repeat(60));
      console.log(`📚 Subject: ${quiz.subject}`);
      console.log(`📖 Title: ${quiz.title}`);
      console.log(`⚡ Difficulty: ${quiz.difficulty}`);
      console.log(`📝 Total Questions: ${quiz.num_questions}`);
      console.log("=".repeat(60));

      quiz.questions.forEach((q, idx) => {
        console.log(`\n❓ Question ${idx + 1}: ${q.question}`);
        console.log(`   Options:`);
        Object.entries(q.options).forEach(([key, value]) => {
          const isCorrect = key === q.correct_answer ? " ✅ CORRECT" : "";
          console.log(`   ${key.toUpperCase()}) ${value}${isCorrect}`);
        });
        console.log(`   Answer Key: ${q.correct_answer.toUpperCase()}`);
      });

      console.log("\n" + "=".repeat(60));
      console.log("✅ Quiz ready to take!\n");
    }
  }, [currentUser, goalId, navigate, quiz]);

  // Save quiz data to localStorage whenever it changes
  useEffect(() => {
    if (quiz) {
      try {
        localStorage.setItem("quiz_data", JSON.stringify(quiz));
      } catch (e) {
        console.error("Failed to save quiz data:", e);
      }
    }
  }, [quiz]);

  // Save answers to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("quiz_answers", JSON.stringify(answers));
    } catch (e) {
      console.error("Failed to save quiz answers:", e);
    }
  }, [answers]);

  // Save current question index to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        "quiz_question_index",
        currentQuestionIndex.toString()
      );
    } catch (e) {
      console.error("Failed to save quiz question index:", e);
    }
  }, [currentQuestionIndex]);

  // Handle exit quiz
  const handleExitQuiz = () => {
    try {
      // Clear quiz data from localStorage
      localStorage.removeItem("quiz_data");
      localStorage.removeItem("quiz_answers");
      localStorage.removeItem("quiz_question_index");
    } catch (e) {
      console.error("Failed to clear quiz data:", e);
    }
    navigate("/dashboard");
  };

  // Handle restart quiz
  const handleRestartQuiz = () => {
    if (
      window.confirm(
        "Are you sure you want to restart the quiz? You will get a new set of questions and lose your current progress."
      )
    ) {
      try {
        // Clear quiz data
        localStorage.removeItem("quiz_data");
        localStorage.removeItem("quiz_answers");
        localStorage.removeItem("quiz_question_index");

        // Reset state
        setQuiz(null);
        setAnswers({});
        setResult(null);
        setCurrentQuestionIndex(0);
        setLoading(true);

        // Regenerate quiz
        if (currentUser && goalId) {
          const generateNewQuiz = async () => {
            try {
              const token = await currentUser.getIdToken();
              const data = await quizAPI.generateQuiz(goalId, 5, token);
              setQuiz(data.quiz);
              toast.success("New quiz generated! 🎯");
            } catch (error) {
              console.error("Quiz regeneration error:", error);
              toast.error("Failed to generate new quiz");
            } finally {
              setLoading(false);
            }
          };
          generateNewQuiz();
        }
      } catch (e) {
        console.error("Failed to restart quiz:", e);
      }
    }
  };

  // Handle answer selection
  const handleSelectAnswer = (questionId, option) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  // Check if all questions answered
  const allAnswered =
    quiz &&
    quiz.questions.length > 0 &&
    quiz.questions.every(
      (q, idx) => answers[q.id] !== undefined || answers[idx] !== undefined
    );

  // Submit quiz
  const handleSubmitQuiz = async () => {
    if (!allAnswered) {
      toast.error("Please answer all questions");
      return;
    }

    try {
      setSubmitting(true);
      const token = await currentUser.getIdToken();

      // Map questions to answers (handle both id and index-based lookups)
      const answerMap = {};
      quiz.questions.forEach((q, idx) => {
        answerMap[q.id] = answers[q.id] || answers[idx];
      });

      const data = await quizAPI.submitQuiz(quiz.quiz_id, answerMap, token);
      setResult(data.result);

      // Clear localStorage after successful submission
      try {
        localStorage.removeItem("quiz_data");
        localStorage.removeItem("quiz_answers");
        localStorage.removeItem("quiz_question_index");
      } catch (e) {
        console.error("Failed to clear quiz data:", e);
      }

      // Show completion modal if goal was completed
      if (data.result.goal_completed) {
        setShowCompletion(true);
        toast.success("🎉 Goal Completed!");
      } else {
        toast.success(`Quiz submitted! Score: ${data.result.score}%`);
      }
    } catch (error) {
      console.error("Quiz submission error:", error);
      toast.error("Failed to submit quiz: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Generating Your Quiz
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Creating a personalized quiz based on your lessons...
            </p>
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-pink-600 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error state - no quiz generated
  if (!quiz) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Oops! Quiz Generation Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We couldn't create a quiz for you. Please try again or select a
              different topic.
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Results view
  if (result) {
    const passed = result.score >= 85;

    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950 p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="mb-6 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>

            {/* Score Card */}
            <div
              className={`mb-8 rounded-2xl overflow-hidden border-2 ${
                passed
                  ? "border-green-200 dark:border-green-700 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
                  : "border-yellow-200 dark:border-yellow-700 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20"
              }`}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      Quiz Results
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {result.subject}: {result.title}
                    </p>
                  </div>
                  <div
                    className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
                      passed
                        ? "bg-gradient-to-br from-green-600 to-emerald-600"
                        : "bg-gradient-to-br from-yellow-600 to-amber-600"
                    }`}
                  >
                    <span className="text-4xl font-bold text-white">
                      {result.score}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Correct Answers
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {result.correct_count}/{result.total_count}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Passing Score
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {passed ? "✅ Passed" : "⚠️ Try Again"}
                    </p>
                  </div>
                </div>

                {result.goal_completed && (
                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-400 dark:border-green-600 rounded-xl p-4">
                    <p className="text-green-800 dark:text-green-200 font-bold text-lg flex items-center gap-2">
                      <CheckCircle className="w-6 h-6" />
                      🎉 Goal Completed! Excellent work!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Question Review */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                Question Review
              </h3>
              <div className="space-y-4">
                {result.question_results.map((q, idx) => (
                  <Card
                    key={idx}
                    className={`border-2 ${
                      q.is_correct
                        ? "border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/10"
                        : "border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/10"
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            {q.is_correct ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                            {q.question_text}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Your Answer:
                        </p>
                        <p
                          className={
                            q.is_correct
                              ? "text-green-700 dark:text-green-400 font-medium"
                              : "text-red-700 dark:text-red-400 font-medium"
                          }
                        >
                          {q.student_answer}
                        </p>
                      </div>

                      {!q.is_correct && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Correct Answer:
                          </p>
                          <p className="text-green-700 dark:text-green-400 font-medium">
                            {q.correct_answer}
                          </p>
                        </div>
                      )}

                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-blue-600" />
                          Explanation
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                          {q.explanation}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={() => navigate("/dashboard")}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3"
              >
                Back to Dashboard
              </Button>
              {result.goal_completed && (
                <Button
                  onClick={() =>
                    navigate("/recommendations", {
                      state: {
                        goalId: goalId,
                        goalInfo: {
                          subject: result.subject,
                          goal: result.title,
                        },
                      },
                    })
                  }
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3"
                >
                  View Recommendations →
                </Button>
              )}
            </div>
          </div>

          <GoalCompletionModal
            isOpen={showCompletion}
            score={result.score}
            goalTitle={result.title}
            subject={result.subject}
            onClose={() => setShowCompletion(false)}
            onViewRecommendations={() => {
              setShowCompletion(false);
              navigate("/recommendations");
            }}
          />
        </div>
      </>
    );
  }

  // Quiz taking view
  return (
    <>
      <Navbar />
      <div className="h-[calc(100vh-64px)] bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950 flex flex-col overflow-hidden p-4 md:p-6">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handleExitQuiz}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                  {quiz.subject}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {quiz.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestartQuiz}
                className="text-xs h-8"
              >
                Restart Quiz
              </Button>
              <Button
                variant="outline"
                onClick={handleExitQuiz}
                className="hidden sm:flex"
              >
                Exit Quiz
              </Button>
            </div>
          </div>

          {/* Progress Bar & Info */}
          <Card className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 border-2 border-blue-200 dark:border-blue-700 flex-shrink-0">
            <CardContent className="pt-4 pb-4">
              <div className="space-y-2">
                <div className="flex gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      Difficulty
                    </p>
                    <p className="font-bold text-gray-900 dark:text-white capitalize flex items-center gap-1 mt-0.5">
                      <Zap className="w-3 h-3 text-yellow-500" />
                      {quiz.difficulty}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      Questions
                    </p>
                    <p className="font-bold text-gray-900 dark:text-white mt-0.5">
                      {quiz.num_questions}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      Progress
                    </p>
                    <p className="font-bold text-gray-900 dark:text-white mt-0.5">
                      {Object.keys(answers).length}/{quiz.num_questions}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-300 dark:bg-slate-600 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
                    style={{
                      width: `${
                        (Object.keys(answers).length / quiz.num_questions) * 100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Single Question View */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-3 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Q{currentQuestionIndex + 1}/{quiz.num_questions}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentQuestionIndex(
                      Math.max(0, currentQuestionIndex - 1)
                    )
                  }
                  disabled={currentQuestionIndex === 0}
                  className="text-xs h-8 px-2"
                >
                  ← Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentQuestionIndex(
                      Math.min(
                        quiz.questions.length - 1,
                        currentQuestionIndex + 1
                      )
                    )
                  }
                  disabled={currentQuestionIndex === quiz.questions.length - 1}
                  className="text-xs h-8 px-2"
                >
                  Next →
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <QuestionCard
                question={quiz.questions[currentQuestionIndex]}
                questionNumber={currentQuestionIndex + 1}
                selected={
                  answers[quiz.questions[currentQuestionIndex].id] ||
                  answers[currentQuestionIndex]
                }
                onSelect={(option) =>
                  handleSelectAnswer(
                    quiz.questions[currentQuestionIndex].id,
                    option
                  )
                }
              />
            </div>
          </div>

          {/* Submit Button Area */}
          <div className="flex-shrink-0 space-y-1">
            <Button
              className="w-full py-3 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
              onClick={handleSubmitQuiz}
              disabled={!allAnswered || submitting}
            >
              {submitting ? "Submitting..." : "Submit Quiz"}
            </Button>

            {!allAnswered && (
              <p className="text-center text-xs text-gray-600 dark:text-gray-400">
                Answer all questions to submit
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Question Card Component
function QuestionCard({ question, questionNumber, selected, onSelect }) {
  return (
    <Card className="overflow-hidden border-2 border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 py-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base text-gray-900 dark:text-white">
              {question.question}
            </CardTitle>
          </div>
          <span className="text-xs font-semibold bg-white dark:bg-slate-800 text-blue-600 px-2 py-1 rounded-full ml-4 flex-shrink-0">
            Q{questionNumber}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-4 space-y-2">
        {Object.entries(question.options).map(([key, option]) => (
          <label
            key={key}
            className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selected === key
                ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-500"
            }`}
            onClick={() => onSelect(key)}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={key}
              checked={selected === key}
              onChange={() => onSelect(key)}
              className="mt-0.5 mr-3 w-4 h-4 cursor-pointer flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="font-bold text-blue-600 dark:text-blue-400 mr-2">
                {key}.
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                {option}
              </span>
            </div>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
