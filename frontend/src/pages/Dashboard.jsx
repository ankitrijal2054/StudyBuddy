import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { TopicSelector } from "@/components/TopicSelector";
import {
  MessageCircle,
  BookOpen,
  TrendingUp,
  Zap,
  Target,
  Award,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle,
  Plus,
  Mail,
} from "lucide-react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";
import { testNudgeAPI } from "../services/apiService";

export default function Dashboard() {
  const { currentUser, studentProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showTopicSelector, setShowTopicSelector] = useState(
    location.state?.showTopicSelector || false
  );
  const [createGoalMode, setCreateGoalMode] = useState(false);
  const [testNudgeLoading, setTestNudgeLoading] = useState(false);

  // Real-time data state
  const [goals, setGoals] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);

  // Auto-open topic selector if navigated from navbar
  useEffect(() => {
    if (location.state?.showTopicSelector) {
      setShowTopicSelector(true);
    }
  }, [location.state?.showTopicSelector]);

  // Real-time listeners for goals
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    try {
      const goalsQuery = query(
        collection(db, "goals"),
        where("student_id", "==", currentUser.uid),
        orderBy("created_at", "desc")
      );

      const unsubscribe = onSnapshot(
        goalsQuery,
        (snapshot) => {
          const goalsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setGoals(goalsData);
          setLoading(false);
        },
        (error) => {
          console.error("Error loading goals:", error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up goals listener:", error);
      setLoading(false);
    }
  }, [currentUser]);

  // Real-time listeners for quiz results
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    try {
      const quizResultsQuery = query(
        collection(db, "quiz_results"),
        where("student_id", "==", currentUser.uid),
        orderBy("created_at", "desc"),
        limit(10)
      );

      const unsubscribe = onSnapshot(
        quizResultsQuery,
        (snapshot) => {
          const results = snapshot.docs.map((doc) => {
            const data = doc.data();

            // Handle both Timestamp and string formats for date
            let dateValue = "";
            const timestamp = data.completed_at || data.created_at;
            if (timestamp) {
              try {
                const dateObj =
                  typeof timestamp.toDate === "function"
                    ? timestamp.toDate()
                    : new Date(timestamp);
                dateValue = dateObj.toLocaleDateString();
              } catch (e) {
                console.error("Date parsing error:", e);
              }
            }

            // Ensure score is a number and add debug log
            const score =
              typeof data.score === "number"
                ? data.score
                : parseInt(data.score) || 0;
            console.log(
              `Quiz result: score=${score}, data.score=${
                data.score
              }, type=${typeof data.score}`
            );

            return {
              id: doc.id,
              ...data,
              date: dateValue,
              score: Math.round(score),
            };
          });

          console.log(
            "Quiz results loaded:",
            results.length,
            "Average:",
            results.length > 0
              ? Math.round(
                  results.reduce((sum, r) => sum + r.score, 0) / results.length
                )
              : 0
          );

          setQuizResults(results);
          setChartsLoading(false);
        },
        (error) => {
          console.error("Error loading quiz results:", error);
          setChartsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up quiz results listener:", error);
      setChartsLoading(false);
    }
  }, [currentUser]);

  // Build activity feed from multiple sources
  useEffect(() => {
    if (quizResults.length === 0) return;

    const feed = quizResults.slice(0, 5).map((result) => ({
      id: result.id,
      type: "quiz",
      title: `Completed ${result.subject || "Quiz"}`,
      description: `Scored ${result.score}%`,
      icon: Award,
      color: "text-purple-600",
      timestamp: result.completed_at?.toDate?.() || new Date(),
    }));

    setActivityFeed(feed);
  }, [quizResults]);

  const handleTopicSelected = (selectedGoal) => {
    setShowTopicSelector(false);
    navigate("/quiz", {
      state: { goalId: selectedGoal.id, goal: selectedGoal },
    });
  };

  // Handle loading state
  if (!studentProfile) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Loading Your Profile
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we fetch your student profile...
            </p>
          </div>
        </div>
      </>
    );
  }

  // Calculate stats from real-time data
  const activeGoals = goals.filter((g) => g.status !== "completed");
  const completedGoals = goals.filter((g) => g.status === "completed");
  const avgQuizScore =
    quizResults.length > 0
      ? Math.round(
          quizResults.reduce((sum, r) => sum + r.score, 0) / quizResults.length
        )
      : 0;

  const stats = [
    {
      label: "Active Goals",
      value: activeGoals.length,
      icon: Target,
      color: "from-blue-600 to-cyan-600",
    },
    {
      label: "Completed",
      value: completedGoals.length,
      icon: CheckCircle,
      color: "from-green-600 to-emerald-600",
    },
    {
      label: "Avg Score",
      value: `${avgQuizScore}%`,
      icon: TrendingUp,
      color: "from-purple-600 to-pink-600",
    },
  ];

  // Test nudge email function
  const handleTestNudge = async () => {
    try {
      setTestNudgeLoading(true);
      const idToken = await currentUser.getIdToken();

      // Call the test nudge API
      const response = await testNudgeAPI.sendTestNudge(idToken);

      if (response.success) {
        toast.success("✅ Test nudge email sent!");
      } else {
        toast.error(response.error || "Failed to send test nudge");
      }
    } catch (error) {
      console.error("Test nudge error:", error);
      toast.error(error.message || "Error sending test nudge");
    } finally {
      setTestNudgeLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          {/* Welcome Section with Profile Info */}
          <div className="mb-6 sm:mb-8 lg:mb-10 animate-slide-up w-full">
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-0.5 sm:p-1">
              <div className="rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent break-words leading-tight">
                      Welcome back, {studentProfile.name?.split(" ")[0]}! 👋
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs sm:text-sm md:text-base leading-snug">
                      Ready to continue? Choose an activity below.
                    </p>
                  </div>
                  <div className="hidden md:flex flex-shrink-0">
                    <div className="w-12 md:w-14 h-12 md:h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg md:rounded-xl flex items-center justify-center">
                      <Sparkles className="w-6 md:w-7 h-6 md:w-7 text-white" />
                    </div>
                  </div>
                </div>

                {/* Quick Profile Info */}
                <div className="pt-3 sm:pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="grid grid-cols-3 gap-1 sm:gap-3 md:gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5 truncate">
                        Grade
                      </p>
                      <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                        {studentProfile.grade || "N/A"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5 flex items-center gap-0.5 truncate">
                        <Zap className="w-2.5 h-2.5 flex-shrink-0 text-yellow-500" />
                        <span className="truncate">Subjects</span>
                      </p>
                      <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                        {studentProfile.subjects?.length || 0}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5 truncate">
                        Sessions
                      </p>
                      <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                        {studentProfile.sessions_count || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-10 lg:mb-12">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-all hover:scale-105 animate-slide-up"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="flex items-center justify-between gap-3 sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium truncate">
                        {stat.label}
                      </p>
                      <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mt-1 sm:mt-2 break-words">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-5 sm:w-6 md:w-7 h-5 sm:h-6 md:h-7 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Action Cards */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 mb-8 sm:mb-10 lg:mb-12">
            {/* Chat Card */}
            <div
              className="relative overflow-hidden rounded-lg sm:rounded-xl lg:rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 p-0.5 sm:p-1 cursor-pointer group hover:scale-105 transition-transform animate-slide-up"
              onClick={() => navigate("/chat")}
              style={{ animationDelay: "0.2s" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative rounded-lg sm:rounded-xl lg:rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800/80 dark:to-slate-800/60 px-5 sm:px-6 md:px-7 py-5 sm:py-6 md:py-7 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3 sm:gap-3 mb-4 sm:mb-5">
                  <div className="w-10 sm:w-11 md:w-12 h-10 sm:h-11 md:h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg sm:rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 sm:w-5 md:w-6 h-5 sm:h-5 md:h-6 text-white" />
                  </div>
                  <ArrowRight className="w-4 sm:w-4 h-4 sm:h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 flex-shrink-0" />
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2 break-words">
                  AI Study Companion
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4 sm:mb-5 text-xs sm:text-sm leading-relaxed">
                  Chat with our AI about your lessons, ask questions, and get
                  instant explanations powered by your lesson context.
                </p>
                <div className="flex items-center text-xs sm:text-sm font-medium text-blue-600 gap-1">
                  Start Chatting
                  <ArrowRight className="w-3 sm:w-4 h-3 sm:h-4" />
                </div>
              </div>
            </div>

            {/* Quiz Card */}
            <div
              className="relative overflow-hidden rounded-lg sm:rounded-xl lg:rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 p-0.5 sm:p-1 cursor-pointer group hover:scale-105 transition-transform animate-slide-up"
              onClick={() => setShowTopicSelector(true)}
              style={{ animationDelay: "0.3s" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative rounded-lg sm:rounded-xl lg:rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800/80 dark:to-slate-800/60 px-5 sm:px-6 md:px-7 py-5 sm:py-6 md:py-7 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3 sm:gap-3 mb-4 sm:mb-5">
                  <div className="w-10 sm:w-11 md:w-12 h-10 sm:h-11 md:h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg sm:rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 sm:w-5 md:w-6 h-5 sm:h-5 md:h-6 text-white" />
                  </div>
                  <ArrowRight className="w-4 sm:w-4 h-4 sm:h-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 flex-shrink-0" />
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2 break-words">
                  Adaptive Quizzes
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4 sm:mb-5 text-xs sm:text-sm leading-relaxed">
                  Test your knowledge with AI-generated quizzes that adapt to
                  your level. Complete goals and unlock achievements.
                </p>
                <div className="flex items-center text-xs sm:text-sm font-medium text-purple-600 gap-1">
                  Take a Quiz
                  <ArrowRight className="w-3 sm:w-4 h-3 sm:h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Goals Section */}
          <div
            className="w-full mb-8 sm:mb-10 lg:mb-12 animate-slide-up"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 break-words">
                <Target className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600 flex-shrink-0" />
                Your Learning Goals
              </h2>
              {activeGoals.length > 0 && (
                <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {activeGoals.length} active • {completedGoals.length}{" "}
                  completed
                </span>
              )}
            </div>

            {loading ? (
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-200 dark:border-slate-700 animate-pulse"
                  >
                    <div className="h-4 bg-gray-300 dark:bg-slate-600 rounded mb-4 w-3/4"></div>
                    <div className="h-2 bg-gray-300 dark:bg-slate-600 rounded w-full mb-4"></div>
                    <div className="h-2 bg-gray-300 dark:bg-slate-600 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : goals.length === 0 ? (
              <div className="w-full bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-200 dark:border-slate-700 p-6 sm:p-8 md:p-12 text-center">
                <div className="text-4xl sm:text-5xl mb-4">📚</div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2">
                  No goals yet
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
                  Start your learning journey by creating your first goal
                </p>
                <Button
                  onClick={() => setShowTopicSelector(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-sm sm:text-base"
                >
                  Create Your First Goal
                </Button>
              </div>
            ) : (
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {goals.map((goal, idx) => {
                  const progress = goal.progress || 0;
                  const isCompleted = goal.status === "completed";
                  return (
                    <div
                      key={goal.id}
                      className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow animate-slide-up"
                      style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                      <div className="h-0.5 sm:h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                      <div className="p-3 sm:p-4 md:p-5">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base break-words">
                              {goal.subject}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-xs break-words">
                              {goal.goal}
                            </p>
                          </div>
                          {isCompleted && (
                            <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-600" />
                          )}
                        </div>

                        {!isCompleted && (
                          <>
                            <div className="mb-3">
                              <div className="flex justify-between items-center gap-2 mb-1.5">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  Progress
                                </span>
                                <span className="text-xs font-bold text-blue-600 flex-shrink-0">
                                  {Math.round(progress)}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                onClick={() =>
                                  navigate("/chat", {
                                    state: {
                                      goalId: goal.id,
                                      goal: goal,
                                      subject: goal.subject,
                                    },
                                  })
                                }
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5"
                              >
                                Chat
                              </Button>
                              <Button
                                onClick={() =>
                                  navigate("/quiz", {
                                    state: {
                                      goalId: goal.id,
                                      goal: goal,
                                    },
                                  })
                                }
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs py-1.5"
                              >
                                Quiz
                              </Button>
                            </div>
                          </>
                        )}

                        {isCompleted && (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2.5 text-center">
                            <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                              ✨ Goal Completed!
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add New Learning Goal Button */}
                <div
                  className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl lg:rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-600 overflow-hidden hover:shadow-lg transition-shadow hover:border-blue-400 dark:hover:border-blue-400 cursor-pointer animate-slide-up"
                  style={{ animationDelay: `${goals.length * 0.1}s` }}
                  onClick={() => {
                    setShowTopicSelector(true);
                    setCreateGoalMode(true);
                  }}
                >
                  <div className="h-0.5 sm:h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                  <div className="p-3 sm:p-4 md:p-5 flex flex-col items-center justify-center">
                    <div className="w-10 sm:w-12 md:w-14 h-10 sm:h-12 md:h-14 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg sm:rounded-xl flex items-center justify-center mb-2">
                      <Plus className="w-5 sm:w-6 md:w-7 h-5 sm:h-6 md:h-7 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base mb-1 text-center break-words">
                      Add New Goal
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-xs text-center">
                      Start learning
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quiz Performance Chart */}
          {!chartsLoading && quizResults.length > 0 && (
            <div
              className="w-full mb-8 sm:mb-10 lg:mb-12 animate-slide-up overflow-x-hidden"
              style={{ animationDelay: "0.5s" }}
            >
              <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-200 dark:border-slate-700 p-4 sm:p-6 md:p-8">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6 break-words">
                  <TrendingUp className="w-4 sm:w-5 h-4 sm:h-5 text-purple-600 flex-shrink-0" />
                  Quiz Performance
                </h2>
                <div className="w-full overflow-x-auto">
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={quizResults.slice().reverse()}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e5e7eb"
                        opacity={0.3}
                      />
                      <XAxis dataKey="date" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #4b5563",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                        formatter={(value) => [`${value}%`, "Score"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#7c3aed"
                        strokeWidth={3}
                        dot={{ fill: "#7c3aed", r: 4 }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={true}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 sm:mt-6 w-full grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      Total Quizzes
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      {quizResults.length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      Average Score
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-purple-600">
                      {avgQuizScore}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      Best Score
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      {Math.max(...quizResults.map((r) => r.score))}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Feed */}
          {!chartsLoading && activityFeed.length > 0 && (
            <div
              className="w-full mb-8 sm:mb-10 lg:mb-12 animate-slide-up"
              style={{ animationDelay: "0.6s" }}
            >
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6 break-words">
                <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 flex-shrink-0" />
                Recent Activity
              </h2>
              <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {activityFeed.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-lg sm:rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 sm:w-5 h-4 sm:h-5 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                              {item.title}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                              {item.description}
                            </p>
                          </div>
                          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex-shrink-0 whitespace-nowrap">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <TopicSelector
        isOpen={showTopicSelector}
        onSelect={handleTopicSelected}
        onClose={() => {
          setShowTopicSelector(false);
          setCreateGoalMode(false);
        }}
        createGoalMode={createGoalMode}
        onCreateModeChange={(mode) => setCreateGoalMode(mode)}
      />

      {/* Test Nudge Email Button */}
      <button
        onClick={handleTestNudge}
        disabled={testNudgeLoading}
        className="fixed bottom-6 right-6 p-3 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-50 z-40 group"
        title="Send Test Nudge Email"
      >
        <Mail className="w-5 h-5" />
        {testNudgeLoading && (
          <div className="absolute inset-0 border-2 border-transparent border-t-white rounded-full animate-spin" />
        )}
      </button>
    </>
  );
}
