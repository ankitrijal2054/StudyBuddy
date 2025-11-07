import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Confetti from "react-confetti";

export const GoalCompletionModal = ({
  isOpen,
  score,
  goalTitle,
  subject,
  onClose,
  onViewRecommendations,
}) => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Determine celebration intensity based on score
  const getMotivationalMessage = () => {
    if (score >= 95) {
      return "🌟 PERFECT SCORE! You're absolutely crushing it!";
    } else if (score >= 90) {
      return "🎯 EXCELLENT! Outstanding performance!";
    } else if (score >= 85) {
      return "🎉 FANTASTIC! Goal completed with flying colors!";
    }
    return "✅ GOAL COMPLETED! Well done!";
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md text-center">
          {isOpen && (
            <Confetti
              width={windowSize.width}
              height={windowSize.height}
              recycle={false}
              numberOfPieces={150}
            />
          )}

          <DialogHeader className="text-center">
            <DialogTitle className="text-3xl mb-2">
              🎊 GOAL COMPLETED! 🎊
            </DialogTitle>
            <DialogDescription className="text-lg font-semibold text-foreground">
              {getMotivationalMessage()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Score Display */}
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-8 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Final Score</p>
              <p className="text-5xl font-bold text-green-700">{score}%</p>
              <p className="text-sm mt-2 text-green-600">
                You passed with {score >= 85 ? "excellent" : "good"} marks!
              </p>
            </div>

            {/* Goal Summary */}
            <div className="bg-accent rounded-lg p-4">
              <h3 className="font-semibold mb-2">Goal Summary</h3>
              <p className="text-sm mb-1">
                <strong>Subject:</strong> {subject}
              </p>
              <p className="text-sm">
                <strong>Goal:</strong> {goalTitle}
              </p>
            </div>

            {/* Achievement */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900">
                🏆 Achievement Unlocked!
              </p>
              <p className="text-xs text-blue-700 mt-2">
                You've completed a learning goal! Your consistency is building
                great habits.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Continue Learning
            </Button>
            <Button
              onClick={() => onViewRecommendations()}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              See Recommendations →
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Ready for your next challenge?
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};
