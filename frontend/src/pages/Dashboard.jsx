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
} from "lucide-react";

export default function Dashboard() {
  const { currentUser, logout, studentProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showTopicSelector, setShowTopicSelector] = useState(
    location.state?.showTopicSelector || false
  );

  // Auto-open topic selector if navigated from navbar
  useEffect(() => {
    if (location.state?.showTopicSelector) {
      setShowTopicSelector(true);
    }
  }, [location.state?.showTopicSelector]);

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

  const stats = [
    {
      label: "Active Goals",
      value: studentProfile.goals?.length || 0,
      icon: Target,
      color: "from-blue-600 to-cyan-600",
    },
    {
      label: "Sessions",
      value: studentProfile.sessions_count || 0,
      icon: Award,
      color: "from-purple-600 to-pink-600",
    },
    {
      label: "Subjects",
      value: studentProfile.subjects?.length || 0,
      icon: BookOpen,
      color: "from-green-600 to-emerald-600",
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
