import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const TopicSelector = ({ isOpen, onSelect, onClose }) => {
  const [activeGoals, setActiveGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!isOpen || !currentUser) {
      setLoading(true);
      return;
    }

    // Query Firestore for active goals
    const goalsRef = collection(db, "goals");
    const q = query(
      goalsRef,
      where("student_id", "==", currentUser.uid),
      where("status", "==", "active")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActiveGoals(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
      setLoading(false);
    });

    return unsubscribe;
  }, [isOpen, currentUser]);

  const handleSelectTopic = () => {
    if (selectedGoalId) {
      const selectedGoal = activeGoals.find((g) => g.id === selectedGoalId);
      onSelect(selectedGoal);
      setSelectedGoalId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>📚 Choose a Topic</DialogTitle>
          <DialogDescription>
            Which topic would you like to quiz on?
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin">⏳</div>
            </div>
          ) : activeGoals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active goals yet.</p>
              <p className="text-sm">Create a goal to get started!</p>
            </div>
          ) : (
            activeGoals.map((goal) => (
              <Card
                key={goal.id}
                className={`cursor-pointer transition-all ${
                  selectedGoalId === goal.id
                    ? "ring-2 ring-primary bg-accent"
                    : "hover:shadow-md"
                }`}
                onClick={() => setSelectedGoalId(goal.id)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{goal.subject}</CardTitle>
                  <p className="text-sm text-muted-foreground">{goal.title}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{Math.round(goal.progress || 0)}%</span>
                  </div>
                  <Progress value={goal.progress || 0} />
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelectTopic}
            disabled={!selectedGoalId || loading}
          >
            Start Quiz
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
