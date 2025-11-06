import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TopicSelector } from "@/components/TopicSelector";

export default function Dashboard() {
  const { currentUser, logout, studentProfile } = useAuth();
  const navigate = useNavigate();
  const [showTopicSelector, setShowTopicSelector] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleTopicSelected = (selectedGoal) => {
    setShowTopicSelector(false);
    // Navigate to quiz page with goal_id
    navigate("/quiz", {
      state: { goalId: selectedGoal.id, goal: selectedGoal },
    });
  };

  // Handle loading state
  if (!studentProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Loading Your Profile...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please wait while we fetch your student profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex gap-4">
            <Button onClick={() => navigate("/chat")} variant="default">
              💬 Chat with AI
            </Button>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card
            className="bg-blue-50 border-blue-200 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/chat")}
          >
            <CardHeader>
              <CardTitle className="text-2xl">
                💬 Study Companion Chat
              </CardTitle>
              <CardDescription>
                Ask questions about your lessons with AI-powered answers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Start Chatting</Button>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200 cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-2xl">📝 Take a Quiz</CardTitle>
              <CardDescription>
                Test your knowledge and complete goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => setShowTopicSelector(true)}
              >
                Start Quiz
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle>📊 Your Progress</CardTitle>
              <CardDescription>Track your learning journey</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Coming soon...</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Welcome,{" "}
              {studentProfile.name ||
                currentUser?.displayName ||
                currentUser?.email}
              !
            </CardTitle>
            <CardDescription>
              You're successfully logged in to StudyBuddy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-6 bg-white p-4 rounded shadow">
              <p>
                <strong>Grade:</strong> {studentProfile.grade}
              </p>
              <p>
                <strong>Email:</strong> {studentProfile.email}
              </p>
              <p>
                <strong>Subjects:</strong>{" "}
                {studentProfile.subjects?.join(", ") || "N/A"}
              </p>
              <p>
                <strong>Sessions:</strong> {studentProfile.sessions_count}
              </p>

              <h2 className="mt-4 font-bold">Goals:</h2>
              <ul>
                {studentProfile.goals?.map((goal) => (
                  <li key={goal}>• {goal}</li>
                )) || <li>No goals yet</li>}
              </ul>
            </div>
          </CardContent>
        </Card>

        <TopicSelector
          isOpen={showTopicSelector}
          onSelect={handleTopicSelected}
          onClose={() => setShowTopicSelector(false)}
        />
      </div>
    </div>
  );
}
