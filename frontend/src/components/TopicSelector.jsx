import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
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
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

export const TopicSelector = ({
  isOpen,
  onSelect,
  onClose,
  createGoalMode,
  onCreateModeChange,
}) => {
  const [activeGoals, setActiveGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(createGoalMode || false);
  const [newGoalSubject, setNewGoalSubject] = useState("");
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [creatingGoal, setCreatingGoal] = useState(false);
  const { currentUser } = useAuth();

  // Auto-show create form when createGoalMode is true
  useEffect(() => {
    if (createGoalMode) {
      setShowCreateForm(true);
      if (onCreateModeChange) {
        onCreateModeChange(true);
      }
    }
  }, [createGoalMode, onCreateModeChange]);

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

  const handleCreateGoal = async () => {
    if (!newGoalSubject.trim() || !newGoalTitle.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!currentUser) {
      toast.error("You must be logged in to create a goal");
      return;
    }

    setCreatingGoal(true);
    try {
      const goalsRef = collection(db, "goals");
      const docRef = await addDoc(goalsRef, {
        student_id: currentUser.uid,
        subject: newGoalSubject.trim(),
        goal: newGoalTitle.trim(),
        title: newGoalTitle.trim(),
        progress: 0,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      toast.success(`Goal "${newGoalSubject}" created! 🎯`);

      // Reset form
      setNewGoalSubject("");
      setNewGoalTitle("");
      setShowCreateForm(false);

      // The listener will automatically update activeGoals
    } catch (error) {
      toast.error(`Failed to create goal: ${error.message}`);
    } finally {
      setCreatingGoal(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            📚 {showCreateForm ? "Create New Goal" : "Choose a Topic"}
          </DialogTitle>
          <DialogDescription>
            {showCreateForm
              ? "What subject would you like to master?"
              : "Which topic would you like to quiz on?"}
          </DialogDescription>
        </DialogHeader>

        {showCreateForm ? (
          // Create Goal Form
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Input
                placeholder="e.g., Mathematics, Chemistry, Literature"
                value={newGoalSubject}
                onChange={(e) => setNewGoalSubject(e.target.value)}
                disabled={creatingGoal}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Goal Title
              </label>
              <Input
                placeholder="e.g., Master Algebra, Ace Physics"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                disabled={creatingGoal}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewGoalSubject("");
                  setNewGoalTitle("");
                }}
                disabled={creatingGoal}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateGoal}
                disabled={
                  creatingGoal || !newGoalSubject.trim() || !newGoalTitle.trim()
                }
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {creatingGoal ? "Creating..." : "Create Goal"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin">⏳</div>
                </div>
              ) : activeGoals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No active goals yet.</p>
                  <p className="text-sm">Create one to get started!</p>
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
                      <CardTitle className="text-base">
                        {goal.subject}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {goal.goal || goal.title}
                      </p>
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

            <div className="flex gap-3 justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                New Goal
              </Button>
              <div className="flex gap-3">
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
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
