/**
 * Chat Page - Simple Learning Companion
 *
 * Clean, modern chat interface for students to:
 * - Ask questions about their lessons
 * - Get AI-powered responses with RAG context
 * - Discuss progress with the AI tutor
 *
 * Shows personalized greeting on load with goal & session context
 */

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { useNavigate } from "react-router-dom";

export default function Chat() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contextLoading, setContextLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  // Load initial greeting on mount
  useEffect(() => {
    if (currentUser) {
      loadInitialGreeting();
    }
  }, [currentUser]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
   * Load initial context and display greeting
   */
  const loadInitialGreeting = async () => {
    try {
      setContextLoading(true);
      const idToken = await currentUser.getIdToken();

      const response = await fetch(
        `${import.meta.env.VITE_CLOUD_RUN_URL}/api/chat/initial-context`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load context");
      }

      const data = await response.json();

      // Add greeting as first message
      const greetingMessage = {
        role: "assistant",
        content: data.greeting,
        timestamp: new Date(),
        isGreeting: true,
      };

      setMessages([greetingMessage]);
    } catch (err) {
      console.error("❌ Greeting error:", err);
      // Fallback greeting if context loading fails
      setMessages([
        {
          role: "assistant",
          content: "👋 Hey there! What would you like to work on today?",
          timestamp: new Date(),
          isGreeting: true,
        },
      ]);
    } finally {
      setContextLoading(false);
    }
  };

  /**
   * Send message and get AI response
   */
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    try {
      setError("");
      setLoading(true);

      // Add user message to display immediately
      const userMessage = {
        role: "user",
        content: input,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      const userInput = input;
      setInput("");

      // Get ID token
      const idToken = await currentUser.getIdToken();

      // Call chat endpoint
      const response = await fetch(
        `${import.meta.env.VITE_CLOUD_RUN_URL}/api/chat`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userInput,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Chat failed: ${response.statusText}`
        );
      }

      const data = await response.json();

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
        setError(
          "💡 Tip: I think a tutor could help you better with this. Consider booking a session!"
        );
      }
    } catch (err) {
      console.error("❌ Chat error:", err);
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

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto p-4 max-w-2xl h-screen flex flex-col">
        {/* Header */}
        <div className="mb-4 pt-4">
          <h1 className="text-3xl font-bold text-gray-800">
            💬 Study Companion
          </h1>
          <p className="text-gray-600 text-sm">
            Personalized learning help powered by AI
          </p>
        </div>

        {/* Messages Container */}
        <Card className="flex-1 flex flex-col overflow-hidden shadow-lg">
          <CardHeader className="border-b bg-white">
            <CardTitle className="text-lg">
              {contextLoading ? "Loading your session..." : "Ready to help"}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {contextLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl mb-4">⏳</div>
                  <p className="text-gray-600">
                    Loading your personalized greeting...
                  </p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-6xl mb-4">🤖</div>
                <p className="text-lg font-semibold">
                  Ready to help you learn!
                </p>
                <p className="text-sm text-gray-400">
                  Ask me anything about your lessons
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-md rounded-lg px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white rounded-br-none"
                        : msg.isGreeting
                        ? "bg-gradient-to-r from-purple-100 to-blue-100 text-gray-900 rounded-bl-none border border-purple-200"
                        : "bg-gray-100 text-gray-900 rounded-bl-none"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    {msg.metadata && (
                      <div className="text-xs mt-2 opacity-70 flex gap-2">
                        {msg.metadata.rag_enabled && (
                          <span>
                            📚 {msg.metadata.chunks_retrieved} sources
                          </span>
                        )}
                        {msg.metadata.handoff_suggested && (
                          <span>🤝 Tutor recommended</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            {error}
          </div>
        )}

        {/* Input Area */}
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              disabled={loading || contextLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={loading || contextLoading || !input.trim()}
              className="min-w-[100px]"
            >
              {loading ? "..." : "Send"}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
