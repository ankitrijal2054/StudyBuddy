import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import toast from "react-hot-toast";
import {
  Zap,
  ArrowRight,
  BookOpen,
  Target,
  Lightbulb,
  Check,
  Loader,
  ArrowLeft,
} from "lucide-react";
import { db } from "@/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";

export default function Recommendations() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState({});
  const [completedGoal, setCompletedGoal] = useState(null);

  // Load recommendations on mount
  useEffect(() => {
    if (!currentUser) return;

    console.log(`📚 Loading recommendations for student: ${currentUser.uid}`);

    // Query most recent recommendations
    const q = query(
      collection(db, "recommendations"),
      where("student_id", "==", currentUser.uid),
      orderBy("generated_at", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          console.log("   No recommendations found");
          setRecommendations([]);
          setLoading(false);
          return;
        }

        const docData = snapshot.docs[0].data();
        console.log(
          `   ✅ Found ${docData.recommendations?.length || 0} recommendations`
        );

        // Extract the recommendations array
        const recs = docData.recommendations || [];
        setRecommendations(recs);
        setCompletedGoal({
          subject: docData.completed_subject,
          goal: docData.completed_goal,
        });
        setLoading(false);
      },
      (error) => {
        console.error("❌ Error loading recommendations:", error);
        toast.error("Failed to load recommendations");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  // Handle starting a new goal from recommendation
  const handleStartLearning = async (recommendation) => {
    if (!currentUser) {
      toast.error("Please log in first");
      return;
    }

    try {
      setAccepting((prev) => ({
        ...prev,
        [recommendation.subject]: true,
      }));

      // Create new goal
      const newGoal = {
        student_id: currentUser.uid,
        subject: recommendation.subject,
        goal: recommendation.title,
        description: recommendation.description,
        progress: 0,
        status: "active",
        started: new Date().toISOString(),
        target_date: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days from now
        completed: null,
      };

      const docRef = await addDoc(collection(db, "goals"), newGoal);

      console.log(`✅ Created new goal: ${docRef.id}`);
      toast.success(`Started "${recommendation.title}"! Let's get learning 🎯`);

      // Navigate to dashboard
      setTimeout(() => {
        navigate("/dashboard", {
          state: { newGoal: recommendation.subject },
        });
      }, 1000);
    } catch (error) {
      console.error("❌ Error creating goal:", error);
      toast.error("Failed to create goal. Try again.");
    } finally {
      setAccepting((prev) => ({
        ...prev,
        [recommendation.subject]: false,
      }));
    }
  };

  // Loading state
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Loading Your Recommendations
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Finding the perfect next steps for your learning journey...
            </p>
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-pink-600 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // No recommendations state
  if (recommendations.length === 0) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950 p-4 md:p-8">
          <div className="max-w-2xl mx-auto">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="mb-6 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>

            <div className="text-center py-16">
              <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lightbulb className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                No Recommendations Yet
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Complete your first goal to get personalized learning
                recommendations! 🎯
              </p>
              <Button
                onClick={() => navigate("/dashboard")}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 animate-in fade-in slide-in-from-top duration-500">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="mb-6 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>

            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <span className="text-5xl">🎉</span>
                You Completed a Goal!
              </h1>
              {completedGoal && (
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  Great work mastering{" "}
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {completedGoal.subject}
                  </span>
                  ! Here's what to learn next.
                </p>
              )}
            </div>
          </div>

          {/* Recommendations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="animate-in fade-in slide-in-from-bottom duration-500"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <RecommendationCard
                  recommendation={rec}
                  index={idx}
                  isLoading={accepting[rec.subject]}
                  onStartLearning={() => handleStartLearning(rec)}
                />
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mb-12 animate-in fade-in slide-in-from-bottom duration-500 delay-300">
            <Card className="border-2 border-indigo-200 dark:border-indigo-700 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
              <CardContent className="pt-8 pb-8">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Check className="w-6 h-6 text-green-600 mt-1" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Pick a subject to continue your journey
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Each recommendation builds on what you've already learned,
                      helping you progress through a structured learning path.
                      Start with any subject that interests you!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center animate-in fade-in duration-500 delay-500">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Recommendations
              </p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {recommendations.length}
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Difficulty
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                Progressive
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Time to Start
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                Now!
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Individual recommendation card component
 */
function RecommendationCard({
  recommendation,
  index,
  isLoading,
  onStartLearning,
}) {
  const iconMap = {
    0: <Target className="w-6 h-6" />,
    1: <Zap className="w-6 h-6" />,
    2: <Lightbulb className="w-6 h-6" />,
  };

  const colorMap = {
    0: "from-blue-500 to-cyan-500",
    1: "from-purple-500 to-pink-500",
    2: "from-amber-500 to-orange-500",
  };

  const textColorMap = {
    0: "text-blue-600 dark:text-blue-400",
    1: "text-purple-600 dark:text-purple-400",
    2: "text-amber-600 dark:text-amber-400",
  };

  const borderColorMap = {
    0: "border-blue-200 dark:border-blue-700",
    1: "border-purple-200 dark:border-purple-700",
    2: "border-amber-200 dark:border-amber-700",
  };

  return (
    <Card
      className={`border-2 ${borderColorMap[index]} hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer`}
    >
      {/* Header with Icon */}
      <div
        className={`bg-gradient-to-r ${colorMap[index]} h-1.5 group-hover:h-2 transition-all`}
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`p-2 bg-gray-100 dark:bg-slate-800 rounded-lg ${textColorMap[index]}`}
          >
            {iconMap[index]}
          </div>
          <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full">
            {index === 0
              ? "Foundation"
              : index === 1
              ? "Intermediate"
              : "Advanced"}
          </span>
        </div>
        <CardTitle className="text-lg mt-3">{recommendation.subject}</CardTitle>
        <CardDescription className="font-semibold text-gray-700 dark:text-gray-300">
          {recommendation.title}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {recommendation.description}
        </p>

        {/* Reason */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg p-3">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            Why this next?
          </p>
          <p className="text-sm text-indigo-600 dark:text-indigo-400">
            {recommendation.reason}
          </p>
        </div>

        {/* Start Button */}
        <Button
          onClick={onStartLearning}
          disabled={isLoading}
          className={`w-full mt-4 bg-gradient-to-r ${colorMap[index]} hover:shadow-lg transition-all text-white font-semibold py-2 flex items-center justify-center gap-2`}
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Creating Goal...
            </>
          ) : (
            <>
              <span>Start Learning</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
