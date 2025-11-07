/**
 * Recommendation Generation Service
 *
 * Uses GPT-4o-mini to generate personalized learning recommendations
 * based on a completed goal. Suggests related subjects and next steps.
 */

const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate 3 personalized learning recommendations
 * based on the completed goal
 *
 * @param {string} studentId - Firebase UID of the student
 * @param {string} completedGoalId - ID of the completed goal
 * @param {string} completedSubject - Subject that was completed (e.g., "Chemistry")
 * @param {string} completedGoal - Goal title that was completed (e.g., "Master Ionic Bonds")
 * @param {object} db - Firestore database instance
 * @returns {Array} Array of 3 recommendation objects with subject, title, description, reason
 */
async function generateRecommendations(
  studentId,
  completedGoalId,
  completedSubject,
  completedGoal,
  db
) {
  try {
    console.log(
      `   📚 Generating recommendations for: ${completedSubject} - ${completedGoal}`
    );

    // Get student profile to understand their grade level
    const studentDoc = await db.collection("students").doc(studentId).get();
    const student = studentDoc.data() || {};
    const studentGrade = student.grade || "High School";
    const studentName = student.name || "Student";

    // Get previously completed goals to avoid repeating recommendations
    const completedGoalsSnapshot = await db
      .collection("goals")
      .where("student_id", "==", studentId)
      .where("status", "==", "completed")
      .get();

    const completedSubjects = completedGoalsSnapshot.docs
      .map((doc) => doc.data().subject)
      .filter((subj) => subj !== completedSubject); // Exclude current subject

    console.log(
      `   📖 Student grade: ${studentGrade}, Previously completed: ${
        completedSubjects.join(", ") || "None"
      }`
    );

    // Create prompt for GPT-4o-mini
    const prompt = `You are an expert educational advisor for a ${studentGrade} student named ${studentName}.

They just completed the goal: "${completedGoal}" in ${completedSubject}.

Previously completed subjects: ${
      completedSubjects.length > 0
        ? completedSubjects.join(", ")
        : "None yet (first goal!)"
    }

Generate EXACTLY 3 personalized learning recommendations for what they should learn next. The recommendations should:
1. Build naturally on their ${completedSubject} knowledge
2. Progress from easier to harder
3. Be diverse (e.g., related subject, college prep, practical application)
4. Avoid repeating any previously completed subjects
5. Be engaging and motivating

For each recommendation, provide:
- subject: The subject name (e.g., "Physics", "Geometry", "AP Chemistry")
- title: A specific, actionable goal title (e.g., "Master Newton's Laws", "Prove Geometric Theorems")
- description: 1-2 sentences describing what they'll learn
- reason: 1 sentence explaining why this is perfect for them given their progress

Important: Return ONLY a valid JSON array with exactly 3 objects. No markdown, no explanations, just the JSON.

Example format:
[
  {
    "subject": "Physics",
    "title": "Understand Forces and Motion",
    "description": "Build on your chemistry knowledge by exploring how forces affect matter. You'll learn Newton's laws and how objects move and interact.",
    "reason": "Perfect next step after chemistry - forces are how chemistry happens at the atomic level!"
  },
  {
    "subject": "Geometry",
    "title": "Master 3D Geometry and Volumes",
    "description": "Apply chemistry concepts to 3D shapes. Calculate volumes and understand molecular structures in 3D space.",
    "reason": "Chemistry involves 3D molecular shapes - geometry helps you visualize and understand them better."
  },
  {
    "subject": "AP Chemistry",
    "title": "Advanced Reaction Kinetics",
    "description": "Dive deeper into how reactions work at the molecular level. Master reaction rates, mechanisms, and equilibrium.",
    "reason": "You've mastered basics - now tackle AP-level content to prepare for college-level science courses."
  }
]`;

    console.log(`   🤖 Calling GPT-4o-mini for recommendations...`);

    // Call GPT-4o-mini with structured output
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert educational advisor. Always respond with ONLY valid JSON, no other text.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    console.log(
      `   📝 Raw response from GPT-4o-mini:`,
      content.substring(0, 200)
    );

    // Parse the JSON response
    let recommendations;
    try {
      // Try to parse as direct JSON first
      recommendations = JSON.parse(content);

      // If it's an object with a 'recommendations' key, extract that
      if (
        recommendations &&
        typeof recommendations === "object" &&
        !Array.isArray(recommendations) &&
        recommendations.recommendations
      ) {
        recommendations = recommendations.recommendations;
      }

      // Ensure we have exactly 3 recommendations
      if (!Array.isArray(recommendations)) {
        throw new Error("Response is not an array");
      }

      if (recommendations.length !== 3) {
        console.warn(
          `   ⚠️  Got ${recommendations.length} recommendations, expected 3. Truncating or padding...`
        );
        recommendations = recommendations.slice(0, 3);
        while (recommendations.length < 3) {
          recommendations.push({
            subject: "General Learning",
            title: "Continue Your Educational Journey",
            description:
              "Keep building on your knowledge and expand your learning horizons.",
            reason: "Every subject complements others!",
          });
        }
      }

      // Validate structure of each recommendation
      recommendations = recommendations.map((rec, idx) => ({
        subject: rec.subject || `Subject ${idx + 1}`,
        title: rec.title || `Learn More`,
        description:
          rec.description ||
          "Continue building your knowledge in related areas.",
        reason: rec.reason || "Builds on what you've already learned.",
      }));

      console.log(
        `   ✅ Parsed ${recommendations.length} recommendations successfully`
      );
      recommendations.forEach((rec, idx) => {
        console.log(`      ${idx + 1}. ${rec.subject}: ${rec.title}`);
      });

      return recommendations;
    } catch (parseError) {
      console.error(`   ❌ Failed to parse GPT response:`, parseError.message);
      console.error(`   Raw content:`, content);

      // Fallback: Generate default recommendations based on subject
      return generateDefaultRecommendations(completedSubject);
    }
  } catch (error) {
    console.error(`   ❌ Recommendation generation error: ${error.message}`);
    throw error;
  }
}

/**
 * Fallback: Generate default recommendations if LLM fails
 * This ensures recommendations always exist, even if GPT fails
 *
 * @param {string} completedSubject - The subject that was completed
 * @returns {Array} Array of 3 default recommendations
 */
function generateDefaultRecommendations(completedSubject) {
  console.log(`   ⚠️  Using fallback recommendations for ${completedSubject}`);

  const recommendationMap = {
    Chemistry: [
      {
        subject: "Physics",
        title: "Understand Forces and Motion",
        description:
          "Explore how forces affect matter and energy in motion. Learn Newton's laws and thermodynamics.",
        reason:
          "Physics builds directly on chemistry concepts - they're deeply connected!",
      },
      {
        subject: "Geometry",
        title: "Master Molecular Geometry",
        description:
          "Understand 3D shapes of molecules and how geometry affects chemical properties.",
        reason:
          "Chemistry molecules have 3D shapes - geometry helps visualize them!",
      },
      {
        subject: "AP Chemistry",
        title: "Advanced Reaction Kinetics",
        description:
          "Dive deeper into reaction mechanisms, rates, and equilibrium at the AP level.",
        reason:
          "You've mastered the basics - time for college-level chemistry!",
      },
    ],
    Physics: [
      {
        subject: "Calculus",
        title: "Learn Rates of Change",
        description:
          "Master derivatives and integrals to solve advanced physics problems.",
        reason:
          "Calculus is the language of physics - essential for advanced study!",
      },
      {
        subject: "Chemistry",
        title: "Understand Matter and Energy",
        description:
          "See how physics principles apply to chemical reactions and molecular behavior.",
        reason: "Chemistry is physics applied to atoms and molecules!",
      },
      {
        subject: "AP Physics",
        title: "Explore Quantum Mechanics",
        description: "Discover the physics of the atomic and subatomic world.",
        reason: "Ready for mind-bending physics at the quantum level!",
      },
    ],
    Algebra: [
      {
        subject: "Geometry",
        title: "Master Geometric Proofs",
        description:
          "Apply algebraic reasoning to prove geometric theorems and relationships.",
        reason: "Geometry is the next natural step after algebra!",
      },
      {
        subject: "Trigonometry",
        title: "Learn Angles and Triangles",
        description:
          "Explore trigonometric functions and their real-world applications.",
        reason: "Trigonometry builds directly on your algebra skills!",
      },
      {
        subject: "SAT Prep",
        title: "Master SAT Math Strategies",
        description:
          "Prepare for college entrance exams with algebra-focused strategies.",
        reason: "Your algebra skills are key to SAT success!",
      },
    ],
  };

  // Return subject-specific recommendations or generic ones
  if (recommendationMap[completedSubject]) {
    return recommendationMap[completedSubject];
  }

  // Generic fallback for unknown subjects
  return [
    {
      subject: "Related Subject 1",
      title: "Explore Related Concepts",
      description: "Build on what you've learned by exploring related topics.",
      reason: "Natural progression in your learning journey!",
    },
    {
      subject: "Related Subject 2",
      title: "Deepen Your Understanding",
      description:
        "Take your knowledge deeper by studying advanced applications.",
      reason: "Ready to level up your skills!",
    },
    {
      subject: "College Prep",
      title: "Prepare for Advanced Study",
      description:
        "Get ready for college-level courses by mastering advanced topics.",
      reason: "Your foundation is strong - time for advanced learning!",
    },
  ];
}

module.exports = {
  generateRecommendations,
};
