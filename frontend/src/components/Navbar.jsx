import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookTutor } from "./BookTutor";
import {
  Menu,
  X,
  LogOut,
  Moon,
  Sun,
  Home,
  MessageCircle,
  BookOpen,
  Lightbulb,
  Users,
} from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export function Navbar() {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isBookTutorOpen, setIsBookTutorOpen] = useState(false);
  const [goals, setGoals] = useState([]);

  // Load user's goals for tutor booking
  useEffect(() => {
    if (!currentUser) return;

    try {
      const goalsQuery = query(
        collection(db, "goals"),
        where("student_id", "==", currentUser.uid),
        where("status", "!=", "completed")
      );

      const unsubscribe = onSnapshot(goalsQuery, (snapshot) => {
        const goalsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setGoals(goalsData);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error loading goals:", error);
    }
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 backdrop-blur-md bg-opacity-90 dark:bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer group"
            onClick={() => navigate("/dashboard")}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform">
              <span className="text-white font-bold text-lg">📚</span>
            </div>
            <span className="ml-3 font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              StudyBuddy
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => navigate("/dashboard")}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center"
            >
              <Home className="w-4 h-4 mr-1" /> Dashboard
            </button>
            <button
              onClick={() => navigate("/chat")}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center"
            >
              <MessageCircle className="w-4 h-4 mr-1" /> Chat
            </button>
            <button
              onClick={() =>
                navigate("/dashboard", { state: { showTopicSelector: true } })
              }
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center"
            >
              <BookOpen className="w-4 h-4 mr-1" /> Quiz
            </button>
            <button
              onClick={() => navigate("/recommendations")}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center"
            >
              <Lightbulb className="w-4 h-4 mr-1" /> Recommendations
            </button>
            {goals.length > 0 && (
              <button
                onClick={() => setIsBookTutorOpen(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 transition-opacity flex items-center ml-2 shadow-md"
              >
                <Users className="w-4 h-4 mr-1" /> Book Tutor
              </button>
            )}
          </div>

          {/* Right side items */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center text-sm font-medium"
            >
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden pb-4 animate-slide-down">
            <button
              onClick={() => {
                navigate("/dashboard");
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg mb-2"
            >
              <Home className="w-4 h-4 mr-2 inline" /> Dashboard
            </button>
            <button
              onClick={() => {
                navigate("/chat");
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg mb-2"
            >
              <MessageCircle className="w-4 h-4 mr-2 inline" /> Chat
            </button>
            <button
              onClick={() => {
                navigate("/dashboard", { state: { showTopicSelector: true } });
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg mb-2"
            >
              <BookOpen className="w-4 h-4 mr-2 inline" /> Quiz
            </button>
            <button
              onClick={() => {
                navigate("/recommendations");
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg mb-2"
            >
              <Lightbulb className="w-4 h-4 mr-2 inline" /> Recommendations
            </button>
            {goals.length > 0 && (
              <>
                <button
                  onClick={() => {
                    setIsBookTutorOpen(true);
                    setIsOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 rounded-lg mb-2"
                >
                  <Users className="w-4 h-4 mr-2 inline" /> Book Tutor
                </button>
              </>
            )}
            <hr className="my-2 dark:border-slate-700" />
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              <LogOut className="w-4 h-4 mr-2 inline" /> Logout
            </button>
          </div>
        )}

        {/* Book Tutor Modal */}
        <BookTutor
          isOpen={isBookTutorOpen}
          onClose={() => setIsBookTutorOpen(false)}
          userGoals={goals}
        />
      </div>
    </nav>
  );
}
