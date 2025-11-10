/**
 * Chat Page - Modern AI Study Companion
 *
 * Beautiful, engaging chat interface for students to:
 * - Ask questions about their lessons
 * - Get AI-powered responses with RAG context
 * - Discuss progress with the AI tutor
 *
 * Modern Nerdy-inspired design with smooth animations
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Navbar } from "../components/Navbar";
import { BookTutor } from "../components/BookTutor";
import { useNavigate, useLocation } from "react-router-dom";
import { chatAPI } from "../services/apiService";
import {
  Loader2,
  Send,
  MessageCircle,
  Bot,
  Sparkles,
  BookOpen,
  ArrowLeft,
  Users,
} from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function Chat() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);

  // Get goal context from navigation state
  const contextMode = location.state?.contextMode || "all"; // "all" or "single"
  const contextGoals = useMemo(
    () => location.state?.contextGoals || [],
    [location.state?.contextGoals]
  );

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contextLoading, setContextLoading] = useState(true);
  const [isBookTutorOpen, setIsBookTutorOpen] = useState(false);
  const [goals, setGoals] = useState([]);
  const [showBookTutorSuggestion, setShowBookTutorSuggestion] = useState(false);

  /**
   * Load initial context and display greeting
   */
  const loadInitialGreeting = useCallback(async () => {
    if (!currentUser) return;
    try {
      console.log("loadInitialGreeting called - fetching from backend", {
        contextMode,
        contextGoalsCount: contextGoals.length,
      });
      setContextLoading(true);
      const idToken = await currentUser.getIdToken();

      // Pass context goals to initial context endpoint
      const data = await chatAPI.getInitialContext(
        idToken,
        contextGoals,
        contextMode
      );

      // Add greeting as first message
      const greetingMessage = {
        role: "assistant",
        content: data.greeting,
        timestamp: new Date(),
        isGreeting: true,
      };

      console.log("Setting greeting message:", greetingMessage);
      setMessages([greetingMessage]);
    } catch (err) {
      console.error("Failed to load greeting:", err);
      // Fallback greeting if context loading fails
      const fallbackMessage = {
        role: "assistant",
        content: "👋 Hey there! What would you like to work on today?",
        timestamp: new Date(),
        isGreeting: true,
      };
      console.log("Setting fallback greeting:", fallbackMessage);
      setMessages([fallbackMessage]);
    } finally {
      setContextLoading(false);
    }
  }, [currentUser, contextGoals, contextMode]);

  // Reset chat when component mounts or when navigating to chat
  useEffect(() => {
    // Clear any previous chat session when returning to chat
    setMessages([]);
    setInput("");
    setError("");

    // Also clear any old localStorage entries just in case
    try {
      localStorage.removeItem("chat_messages");
      localStorage.removeItem("chat_input");
    } catch (e) {
      console.warn("Could not clear localStorage:", e);
    }

    // Clear entire localStorage keys that might contain chat data
    const keysToCheck = Object.keys(localStorage);
    keysToCheck.forEach((key) => {
      if (
        key.toLowerCase().includes("chat") ||
        key.toLowerCase().includes("message")
      ) {
        localStorage.removeItem(key);
      }
    });
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

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

  // Load initial greeting on mount (only if no messages)
  useEffect(() => {
    console.log(
      "Greeting effect triggered - messages.length:",
      messages.length
    );
    if (currentUser) {
      // Only load greeting if there are no messages
      if (messages.length === 0) {
        console.log("Loading initial greeting...");
        loadInitialGreeting();
      } else {
        console.log("Messages exist, not loading greeting");
        setContextLoading(false);
      }
    }
  }, [currentUser, messages.length, loadInitialGreeting]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
   * Send message and get AI response
   */
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userInput = input;

    try {
      setError("");
      setLoading(true);

      // Add user message to display immediately
      const userMessage = {
        role: "user",
        content: userInput,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      // Get ID token
      const idToken = await currentUser.getIdToken();

      // Call chat endpoint with context goals
      const data = await chatAPI.sendMessage(
        userInput,
        idToken,
        contextGoals,
        contextMode
      );

      // Add AI response
      const aiMessage = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        metadata: data.metadata,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Show handoff suggestion if needed
      if (data.metadata.handoff_suggested) {
        setShowBookTutorSuggestion(true);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setError(err.message || "Failed to send message");

      // Remove the last user message if there was an error
      setMessages((prev) => prev.slice(0, -1));
      setInput(userInput);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Enter key to send message
   */
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all messages? This cannot be undone."
      )
    ) {
      setMessages([]);
      setInput("");
      loadInitialGreeting();
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="h-[calc(100vh-64px)] bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col overflow-hidden">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between animate-slide-down flex-shrink-0">
            <div className="flex items-center">
              <button
                onClick={() => navigate("/dashboard")}
                className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors mr-4"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Study Companion
                    </h1>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearChat}
                className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Clear Chat
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto mb-6 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
            {contextLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                    Firing up the AI...
                  </p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Ready to Learn!
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-sm">
                  Ask me anything about your lessons, and I'll help you
                  understand the concepts better.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  } animate-slide-up`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div
                    className={`max-w-xl rounded-2xl px-5 py-3 ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-br-none shadow-md"
                        : msg.isGreeting
                        ? "bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 text-gray-900 dark:text-white rounded-bl-none border border-purple-200 dark:border-purple-700"
                        : "bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-bl-none"
                    }`}
                  >
                    <div className="flex items-start space-x-2 mb-2">
                      {msg.role === "assistant" && msg.isGreeting && (
                        <div className="w-6 h-6 flex-shrink-0 mt-0.5">
                          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                      )}
                      {msg.role === "assistant" && !msg.isGreeting && (
                        <div className="w-6 h-6 flex-shrink-0 mt-0.5">
                          <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                    {msg.metadata && (
                      <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600 border-opacity-50 flex gap-3 text-xs opacity-80 flex-wrap">
                        {msg.metadata.rag_enabled && (
                          <span className="flex items-center">
                            <BookOpen className="w-3 h-3 mr-1" />
                            {msg.metadata.chunks_retrieved} sources
                          </span>
                        )}
                        {msg.metadata.handoff_suggested && (
                          <span className="flex items-center">
                            <span className="text-yellow-500">✨</span>
                            Tutor recommended
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Book Tutor Suggestion Alert */}
          {showBookTutorSuggestion && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-700 rounded-xl text-sm animate-slide-down flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-start flex-1">
                  <span className="mr-3 text-lg">✨</span>
                  <div>
                    <p className="text-blue-800 dark:text-blue-200 font-medium">
                      I think a tutor could help you even better with this!
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                      Get personalized one-on-one help from our expert tutors.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsBookTutorOpen(true);
                    setShowBookTutorSuggestion(false);
                  }}
                  className="ml-4 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  Book Now
                </button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && !showBookTutorSuggestion && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-red-50 dark:from-red-900/30 dark:to-red-900/30 border border-red-200 dark:border-red-700 rounded-xl text-sm text-red-800 dark:text-red-200 animate-slide-down flex-shrink-0">
              <div className="flex items-start">
                <span className="mr-3 text-lg">❌</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="space-y-3 flex-shrink-0">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your lessons..."
                  disabled={loading || contextLoading}
                  className="w-full py-3 px-5 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-700 transition-colors placeholder:text-gray-500"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400">
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                </div>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={loading || contextLoading || !input.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 px-2">
              💡 Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        </div>

        {/* Book Tutor Modal */}
        <BookTutor
          isOpen={isBookTutorOpen}
          onClose={() => setIsBookTutorOpen(false)}
          userGoals={goals}
        />
      </div>
    </>
  );
}
