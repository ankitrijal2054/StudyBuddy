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
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
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

export default function Dashboard() {
  const { currentUser, logout, studentProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showTopicSelector, setShowTopicSelector] = useState(
    location.state?.showTopicSelector || false
  );

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
      console.log("Dashboard: No current user, skipping goals listener");
      return;
    }

    console.log(
      "Dashboard: Setting up goals listener for UID:",
      currentUser.uid
    );

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
          console.log(
            "Dashboard: Goals loaded from Firestore:",
            goalsData.length,
            "documents"
          );
          setGoals(goalsData);
          setLoading(false);
        },
        (error) => {
          console.error("Dashboard: Error in goals listener:", error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("Dashboard: Error setting up goals listener:", error);
      setLoading(false);
    }
  }, [currentUser]);

  // Real-time listeners for quiz results
  useEffect(() => {
    if (!currentUser) {
      console.log("Dashboard: No current user, skipping quiz results listener");
      return;
    }

    console.log(
      "Dashboard: Setting up quiz results listener for UID:",
      currentUser.uid
    );

    try {
      const quizResultsQuery = query(
        collection(db, "quiz_results"),
        where("student_id", "==", currentUser.uid),
        orderBy("completed_at", "desc"),
        limit(10)
      );

      const unsubscribe = onSnapshot(
        quizResultsQuery,
        (snapshot) => {
          const results = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              date: data.completed_at
                ? new Date(data.completed_at.toDate()).toLocaleDateString()
                : "",
              score: Math.round(data.score || 0),
            };
          });
          console.log(
            "Dashboard: Quiz results loaded from Firestore:",
            results.length,
            "documents"
          );
          setQuizResults(results);
          setChartsLoading(false);
        },
        (error) => {
          console.error("Dashboard: Error in quiz results listener:", error);
          setChartsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error(
        "Dashboard: Error setting up quiz results listener:",
        error
      );
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Welcome Section */}
          <div className="mb-12 animate-slide-up">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-1">
              <div className="rounded-2xl bg-white dark:bg-slate-900 px-8 py-8 sm:px-12 sm:py-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Welcome back, {studentProfile.name?.split(" ")[0]}! 👋
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                      Ready to continue your learning journey? Choose an
                      activity below.
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 hover:shadow-lg transition-all hover:scale-105 animate-slide-up"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                        {stat.label}
                      </p>
                      <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Action Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            {/* Chat Card */}
            <div
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 p-1 cursor-pointer group hover:scale-105 transition-transform animate-slide-up"
              onClick={() => navigate("/chat")}
              style={{ animationDelay: "0.2s" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800/80 dark:to-slate-800/60 px-8 py-10 backdrop-blur-sm">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  AI Study Companion
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  Chat with our AI about your lessons, ask questions, and get
                  instant explanations powered by your lesson context.
                </p>
                <div className="flex items-center text-sm font-medium text-blue-600">
                  Start Chatting
                  <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>
            </div>

            {/* Quiz Card */}
            <div
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 p-1 cursor-pointer group hover:scale-105 transition-transform animate-slide-up"
              onClick={() => setShowTopicSelector(true)}
              style={{ animationDelay: "0.3s" }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800/80 dark:to-slate-800/60 px-8 py-10 backdrop-blur-sm">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Adaptive Quizzes
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  Test your knowledge with AI-generated quizzes that adapt to
                  your level. Complete goals and unlock achievements.
                </p>
                <div className="flex items-center text-sm font-medium text-purple-600">
                  Take a Quiz
                  <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Goals Section */}
          <div
            className="mb-12 animate-slide-up"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <Target className="w-6 h-6 mr-2 text-blue-600" />
                Your Learning Goals
              </h2>
              {activeGoals.length > 0 && (
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {activeGoals.length} active • {completedGoals.length}{" "}
                  completed
                </span>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 animate-pulse"
                  >
                    <div className="h-4 bg-gray-300 dark:bg-slate-600 rounded mb-4 w-3/4"></div>
                    <div className="h-2 bg-gray-300 dark:bg-slate-600 rounded w-full mb-4"></div>
                    <div className="h-2 bg-gray-300 dark:bg-slate-600 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : goals.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-12 text-center">
                <div className="text-5xl mb-4">📚</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  No goals yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Start your learning journey by creating your first goal
                </p>
                <Button
                  onClick={() => setShowTopicSelector(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold"
                >
                  Create Your First Goal
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map((goal, idx) => {
                  const progress = goal.progress || 0;
                  const isCompleted = goal.status === "completed";
                  return (
                    <div
                      key={goal.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow animate-slide-up"
                      style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                      <div className="h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                              {goal.subject}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                              {goal.goal}
                            </p>
                          </div>
                          {isCompleted && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                        </div>

                        {!isCompleted && (
                          <>
                            <div className="mb-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Progress
                                </span>
                                <span className="text-sm font-bold text-blue-600">
                                  {Math.round(progress)}%
                                </span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
                                    state: { goalId: goal.id },
                                  })
                                }
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                              >
                                Chat
                              </Button>
                              <Button
                                onClick={() => setShowTopicSelector(true)}
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm"
                              >
                                Quiz
                              </Button>
                            </div>
                          </>
                        )}

                        {isCompleted && (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
                            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                              ✨ Goal Completed!
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quiz Performance Chart */}
          {!chartsLoading && quizResults.length > 0 && (
            <div
              className="mb-12 animate-slide-up"
              style={{ animationDelay: "0.5s" }}
            >
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center mb-6">
                  <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                  Quiz Performance
                </h2>
                <ResponsiveContainer width="100%" height={300}>
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
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total Quizzes
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {quizResults.length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Average Score
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {avgQuizScore}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Best Score
                    </p>
                    <p className="text-2xl font-bold text-green-600">
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
              className="mb-12 animate-slide-up"
              style={{ animationDelay: "0.6s" }}
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center mb-6">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Recent Activity
              </h2>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {activityFeed.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="px-8 py-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {item.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {item.description}
                            </p>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
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

          {/* Profile Information */}
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-slide-up"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="px-8 py-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                Your Profile
              </h2>
            </div>
            <div className="px-8 py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      Grade Level
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {studentProfile.grade || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      Email
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {studentProfile.email}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      Tutoring Sessions
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {studentProfile.sessions_count || 0}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center mb-4">
                    <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                    Your Subjects
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {studentProfile.subjects &&
                    studentProfile.subjects.length > 0 ? (
                      studentProfile.subjects.map((subject, idx) => (
                        <span
                          key={idx}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm font-medium"
                        >
                          {subject}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400">
                        No subjects yet
                      </p>
                    )}
                  </div>

                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center mb-4">
                      <Target className="w-4 h-4 mr-2 text-blue-600" />
                      Current Goals
                    </h3>
                    {studentProfile.goals && studentProfile.goals.length > 0 ? (
                      <ul className="space-y-2">
                        {studentProfile.goals.map((goal, idx) => (
                          <li
                            key={idx}
                            className="flex items-center text-gray-700 dark:text-gray-300"
                          >
                            <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
                            {goal}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400">
                        No active goals
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TopicSelector
        isOpen={showTopicSelector}
        onSelect={handleTopicSelected}
        onClose={() => setShowTopicSelector(false)}
      />
    </>
  );
}
