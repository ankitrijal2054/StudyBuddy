import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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

export default function Quiz() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const auth = getAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAllQuestions, setShowAllQuestions] = useState(false);

  const goalId = location.state?.goalId;
  const goal = location.state?.goal;

  // Validate that we have a goal selected
  useEffect(() => {
    if (!goalId) {
      toast.error("Please select a topic first");
      navigate("/");
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

        const response = await fetch(
          `${
            import.meta.env.VITE_CLOUD_RUN_URL || "http://localhost:8080"
          }/api/quiz/generate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              goal_id: goalId,
              num_questions: 5,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to generate quiz");
        }

        const data = await response.json();
        setQuiz(data.quiz);
        toast.success("Quiz generated! Let's get started 🎯");
      } catch (error) {
        console.error("Quiz generation error:", error);
        toast.error("Failed to generate quiz: " + error.message);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    generateQuiz();
  }, [currentUser, goalId, navigate]);

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

      const response = await fetch(
        `${
          import.meta.env.VITE_CLOUD_RUN_URL || "http://localhost:8080"
        }/api/quiz/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            quiz_id: quiz.quiz_id,
            answers: answerMap,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit quiz");
      }

      const data = await response.json();
      setResult(data.result);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>📝 Generating Your Quiz...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin text-2xl">⏳</div>
            </div>
            <p className="text-center text-muted-foreground">
              We're creating a personalized quiz based on your lessons...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state - no quiz generated
  if (!quiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>❌ Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to generate quiz. Please try again.</p>
            <Button className="w-full mt-4" onClick={() => navigate("/")}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results view
  if (result) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="container mx-auto max-w-4xl">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="mb-6"
          >
            ← Back to Dashboard
          </Button>

          <Card
            className={`mb-6 ${
              result.score >= 85
                ? "border-green-500 bg-green-50"
                : "border-yellow-500 bg-yellow-50"
            }`}
          >
            <CardHeader>
              <CardTitle className="text-3xl">📊 Quiz Results</CardTitle>
              <CardDescription>
                {result.subject}: {result.title}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Score</p>
                  <p className="text-4xl font-bold">{result.score}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Questions
                  </p>
                  <p className="text-4xl font-bold">
                    {result.correct_count}/{result.total_count}
                  </p>
                </div>
              </div>

              {result.goal_completed && (
                <div className="mt-6 p-4 bg-green-100 border-2 border-green-500 rounded-lg">
                  <p className="text-green-800 font-bold text-lg">
                    ✅ Goal Completed! You scored {result.score}%!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-xl font-bold">Question Review</h3>
            {result.question_results.map((q, idx) => (
              <Card
                key={idx}
                className={`${
                  q.is_correct
                    ? "border-green-500 bg-green-50"
                    : "border-red-500 bg-red-50"
                }`}
              >
                <CardHeader>
                  <CardTitle className="text-base">
                    {q.is_correct ? "✅" : "❌"} {q.question_text}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold">Your answer:</p>
                    <p
                      className={
                        q.is_correct ? "text-green-700" : "text-red-700"
                      }
                    >
                      {q.student_answer}
                    </p>
                  </div>
                  {!q.is_correct && (
                    <div>
                      <p className="text-sm font-semibold">Correct answer:</p>
                      <p className="text-green-700">{q.correct_answer}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">Explanation:</p>
                    <p className="text-muted-foreground text-sm">
                      {q.explanation}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-4 mt-8">
            <Button className="flex-1" onClick={() => navigate("/")}>
              Back to Dashboard
            </Button>
            {result.goal_completed && (
              <Button
                className="flex-1"
                variant="default"
                onClick={() => navigate("/recommendations")}
              >
                See Recommendations →
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
    );
  }

  // Quiz taking view
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{quiz.subject}</h1>
            <p className="text-muted-foreground">{quiz.title}</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            Exit Quiz
          </Button>
        </div>

        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Difficulty</p>
                <p className="font-semibold capitalize">{quiz.difficulty}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="font-semibold">{quiz.num_questions}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Answered</p>
                <p className="font-semibold">
                  {Object.keys(answers).length}/{quiz.num_questions}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllQuestions(!showAllQuestions)}
              >
                {showAllQuestions ? "Single View" : "All Questions"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {showAllQuestions ? (
          // All questions at once
          <div className="space-y-6">
            {quiz.questions.map((q, idx) => (
              <QuestionCard
                key={idx}
                question={q}
                questionNumber={idx + 1}
                selected={answers[q.id] || answers[idx]}
                onSelect={(option) => handleSelectAnswer(q.id, option)}
              />
            ))}
          </div>
        ) : (
          // Single question view
          <div className="mb-8">
            <div className="mb-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">
                  Question {currentQuestionIndex + 1} of {quiz.num_questions}
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
                  >
                    ← Previous
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
                    disabled={
                      currentQuestionIndex === quiz.questions.length - 1
                    }
                  >
                    Next →
                  </Button>
                </div>
              </div>
            </div>
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
        )}

        <Button
          className="w-full py-6 text-lg"
          onClick={handleSubmitQuiz}
          disabled={!allAnswered || submitting}
        >
          {submitting ? "Submitting..." : "Submit Quiz"}
        </Button>

        {!allAnswered && (
          <p className="text-center text-muted-foreground mt-4">
            Answer all questions to submit
          </p>
        )}
      </div>
    </div>
  );
}

// Question Card Component
function QuestionCard({ question, questionNumber, selected, onSelect }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{question.question}</CardTitle>
        <CardDescription>Question {questionNumber}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(question.options).map(([key, option]) => (
          <label
            key={key}
            className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selected === key
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => onSelect(key)}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={key}
              checked={selected === key}
              onChange={() => onSelect(key)}
              className="mr-3"
            />
            <span className="font-semibold mr-3">{key}.</span>
            <span className="flex-1">{option}</span>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
