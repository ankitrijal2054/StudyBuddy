import React from "react";
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

export default function Dashboard() {
  const { currentUser, logout, studentProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
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
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
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
      </div>
    </div>
  );
}
