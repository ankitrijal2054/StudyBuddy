# AI Study Companion - Product Requirements Document (Firebase Edition)

## Executive Summary

**Product**: AI Study Companion  
**Timeline**: 48-hour Sprint  
**Technology Stack**: Firebase + Node.js  
**Goal**: Build a persistent AI learning assistant that keeps students engaged between tutoring sessions, reduces churn, and drives measurable learning improvements.

**Business Impact**:

- Reduce 52% "goal achieved" churn via intelligent cross-subject recommendations
- Increase Day 7 session booking rate through proactive nudges
- Improve student retention and learning outcomes through personalized practice

---

## Problem Statement

Nerdy faces critical retention challenges:

- **52% of students churn** after achieving their initial goal (lack of next steps)
- **Students disengage** between tutoring sessions (no continuous learning support)
- **Low early engagement**: Students with <3 sessions by Day 7 have higher churn risk
- **Single-subject focus**: Students don't discover related subjects naturally

**Solution**: An AI companion that maintains engagement 24/7, personalizes learning paths, and intelligently guides students to their next learning journey.

---

## Product Overview

### Core Value Proposition

A conversational AI that acts as a personal study partner between tutoring sessions - remembering what students learned, generating adaptive practice, answering questions, and recommending next subjects at the right moment.

### Target Users

- **Primary**: K-12 and college students actively enrolled in Nerdy tutoring
- **Secondary**: Students who completed initial goals (churn risk)

---

## Technical Architecture (Firebase-Native)

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                          │
│  React + Vite (Hosted on Firebase Hosting)                  │
│  - Real-time Firestore listeners for live updates           │
│  - Firebase Auth SDK for authentication                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   FIREBASE SERVICES                          │
│                                                              │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Firebase Auth  │  │  Firestore   │  │ Cloud Storage  │ │
│  │ (User Mgmt)    │  │  (Database)  │  │  (Transcripts) │ │
│  └────────────────┘  └──────────────┘  └────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Cloud Functions (Node.js)                    │ │
│  │  - Auth triggers (onCreate, onDelete)                  │ │
│  │  - Firestore triggers (goal completion)                │ │
│  │  - HTTP endpoints (simple CRUD)                        │ │
│  │  - Scheduled functions (nudge system)                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Cloud Run Service (Node.js/Express)          │ │
│  │  - Chat AI endpoint (RAG + LangChain)                  │ │
│  │  - Quiz generation endpoint                            │ │
│  │  - Recommendations engine                              │ │
│  │  - Heavy compute operations                            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │   Pinecone   │  │   OpenAI     │  │    SendGrid      │ │
│  │ (Vector DB)  │  │   (LLM)      │  │    (Email)       │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer              | Technology                  | Purpose                                |
| ------------------ | --------------------------- | -------------------------------------- |
| **Frontend**       | React + Vite                | UI/UX                                  |
| **Hosting**        | Firebase Hosting            | Static site hosting                    |
| **Authentication** | Firebase Auth               | User management, JWT tokens            |
| **Database**       | Cloud Firestore             | NoSQL database, real-time sync         |
| **Storage**        | Cloud Storage               | Transcript files, media                |
| **Light APIs**     | Cloud Functions (Node.js)   | Auth triggers, CRUD, scheduled tasks   |
| **Heavy APIs**     | Cloud Run (Node.js/Express) | AI processing, RAG pipeline            |
| **Vector Search**  | Pinecone                    | Semantic search for transcripts        |
| **LLM**            | OpenAI GPT-4o               | Chat, quiz generation, recommendations |
| **AI Framework**   | LangChain (Node.js)         | RAG orchestration                      |
| **Email**          | SendGrid                    | Transactional emails                   |
| **Scheduling**     | Cloud Scheduler             | Cron jobs for nudges                   |

---

## Success Metrics

| Category             | Metric                                   | Target         | Measurement Method             |
| -------------------- | ---------------------------------------- | -------------- | ------------------------------ |
| **Engagement**       | Daily active interactions                | ≥2 per student | Chat message count             |
| **Retention**        | Goal completion → new subject conversion | ≥40%           | Recommendation acceptance rate |
| **Early Engagement** | Day 7 nudge → session booking            | ≥40%           | Email CTR → booking conversion |
| **Learning**         | Quiz score improvement                   | ≥20%           | Pre/post assessment delta      |
| **Technical**        | Response latency                         | <2s            | P95 response time              |

---

## Core Features (MVP - 48 Hours)

### 0. 🔐 Authentication System

**Priority**: P0 (Gate-keeping)

**Functionality**:

- User registration (email + password)
- User login with email/password
- Session persistence (Firebase Auth tokens)
- Logout functionality
- Profile creation on signup (name, email, grade level)
- OAuth support (Google Sign-In) - optional if time permits

**Technical Implementation**:

```javascript
// Firebase Auth Configuration
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

// Authentication is handled entirely by Firebase Auth
// - Automatic JWT token management
// - Token refresh handled by SDK
// - No custom backend auth logic needed
```

**Firestore Data Structure**:

```javascript
// users collection
{
  uid: "firebase_uid_123",
  email: "ava@example.com",
  name: "Ava Johnson",
  grade: 11,
  created_at: Timestamp,
  last_login: Timestamp,
  profile_completed: true
}

// students collection (extended profile)
{
  student_id: "S001", // Auto-generated
  user_id: "firebase_uid_123", // Links to users
  name: "Ava Johnson",
  email: "ava@example.com",
  grade: 11,
  subjects: ["Chemistry", "Math"],
  enrollment_date: Timestamp,
  last_active: Timestamp
}
```

**Auth Flow**:

1. User registers with email/password via Firebase Auth
2. Cloud Function trigger (`onCreate`) creates student profile in Firestore
3. User logs in → Firebase SDK handles JWT token
4. Frontend listens to `onAuthStateChanged` for session state
5. All API calls include Firebase Auth token automatically
6. Cloud Functions/Cloud Run validate token via Firebase Admin SDK

**Security Rules** (Firestore):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /students/{studentId} {
      allow read: if request.auth != null &&
                     resource.data.user_id == request.auth.uid;
      allow write: if request.auth != null &&
                      request.resource.data.user_id == request.auth.uid;
    }

    // Conversations can only be accessed by the owner
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null &&
                            resource.data.student_id == request.auth.uid;
    }
  }
}
```

---

### 1. 🧠 Student Memory System

**Priority**: P0 (Foundation)

**Functionality**:

- Stores student profile (name, subjects, goals, progress)
- Ingests and vectorizes tutoring session transcripts
- Maintains conversation history and learning context
- Tracks quiz performance and knowledge gaps

**Technical Implementation**:

```
- RAG Pipeline: LangChain (Node.js) + Pinecone
- Embedding Model: OpenAI text-embedding-3-small
- Storage: Firestore (metadata) + Pinecone (vectors) + Cloud Storage (raw transcripts)
```

**Firestore Collections**:

```javascript
// students collection
{
  student_id: "S001",
  user_id: "firebase_uid_123",
  name: "Ava Johnson",
  email: "ava@example.com",
  grade: 11,
  subjects: ["Chemistry", "Math"],
  enrollment_date: Timestamp,
  last_active: Timestamp
}

// goals collection
{
  goal_id: "G001",
  student_id: "S001",
  subject: "Chemistry",
  goal: "Master VSEPR theory",
  progress: 0.75,
  status: "active", // active | completed | abandoned
  started: Timestamp,
  target_date: Timestamp,
  completed: null
}

// session_transcripts collection
{
  transcript_id: "T001",
  student_id: "S001",
  subject: "Chemistry",
  topics: ["Ionic bonds", "Covalent bonds"],
  date: Timestamp,
  tutor_notes: "Student struggled with polarity",
  pinecone_id: "vec_001", // Reference to Pinecone vector
  storage_url: "gs://bucket/transcripts/T001.txt"
}

// conversations collection
{
  conversation_id: "C001",
  student_id: "S001",
  messages: [
    {
      role: "user",
      content: "What did we learn about ionic bonds?",
      timestamp: Timestamp
    },
    {
      role: "assistant",
      content: "In your last session...",
      timestamp: Timestamp,
      context_used: ["T001", "T002"] // Transcript IDs used
    }
  ],
  last_updated: Timestamp,
  created_at: Timestamp
}

// engagement_stats subcollection (under students)
students/{student_id}/stats/{stat_id}
{
  sessions_last_7_days: 2,
  chat_interactions_last_7_days: 5,
  last_session_date: Timestamp,
  total_sessions: 15,
  average_quiz_score: 78.5
}
```

**Pinecone Configuration**:

```javascript
// Pinecone index structure
{
  id: "S001_T001_chunk1", // student_id + transcript_id + chunk_number
  values: [0.123, -0.456, ...], // 1536-dim embedding vector
  metadata: {
    student_id: "S001",
    transcript_id: "T001",
    subject: "Chemistry",
    topics: ["Ionic bonds", "Covalent bonds"],
    date: "2025-10-28T10:00:00Z",
    chunk_text: "Today we covered ionic bonds...",
    tutor_notes: "Student struggled with polarity"
  }
}
```

**RAG Pipeline Flow**:

1. **Ingestion** (one-time or on new transcript):

   - Cloud Function triggered when new transcript added to Firestore
   - Reads transcript from Cloud Storage
   - Chunks text into 400-word segments
   - Generates embeddings via OpenAI API
   - Stores vectors in Pinecone with metadata
   - Updates Firestore with `pinecone_id` reference

2. **Retrieval** (on every chat query):
   - User sends message via Cloud Run endpoint
   - Embed user query with OpenAI
   - Query Pinecone with filter: `student_id == current_user`
   - Retrieve top 3-5 relevant chunks
   - Inject chunks into LLM prompt as context
   - Generate response with LangChain

---

### 2. 💬 Conversational AI Agent

**Priority**: P0 (Core Experience)

**Functionality**:

- Answer questions about previous lessons with context
- Explain concepts conversationally (ELI5 style)
- Suggest next study steps based on progress
- Detect when to escalate to human tutor

**Conversation Modes**:

1. **Question Answering**: "What did we learn about ionic bonds?"
2. **Concept Explanation**: "I still don't understand electronegativity"
3. **Study Guidance**: "What should I focus on next?"
4. **Practice Request**: "Can you quiz me on chemistry?"

**Human Handoff Triggers**:

- Student explicitly asks for tutor ("I need help from my tutor")
- AI confidence score <0.6 on response
- Student expresses frustration (3+ clarification requests)
- Complex multi-step problem solving needed
- Student requests to book session

**Technical Implementation**:

```javascript
// Cloud Run Service: AI Chat Endpoint
// File: cloud-run/src/services/chatService.js

import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { Pinecone } from "@pinecone-database/pinecone";
import admin from "firebase-admin";

const db = admin.firestore();
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index("study-companion");

const llm = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const CHAT_PROMPT = `You are a friendly AI study companion for {student_name}, a grade {grade} student.

CONTEXT FROM PREVIOUS SESSIONS:
{retrieved_transcript_chunks}

STUDENT'S CURRENT GOALS:
{current_goals}

RECENT CONVERSATION:
{chat_history}

STUDENT: {user_message}

Guidelines:
- Reference specific topics from their lessons when relevant
- Explain concepts clearly with examples appropriate for grade {grade}
- Encourage progress and celebrate achievements
- If unsure or question is complex: "This is a great question for your tutor! Want to book a session?"
- Keep responses 2-3 paragraphs max
- Use warm, supportive tone
- If student asks to book session, respond: "I'll help you book a session! Let me redirect you."

RESPONSE:`;

export async function handleChatMessage(studentId, message, conversationId) {
  // 1. Retrieve student context from Firestore
  const studentDoc = await db.collection("students").doc(studentId).get();
  const student = studentDoc.data();

  // 2. Get current goals
  const goalsSnapshot = await db
    .collection("goals")
    .where("student_id", "==", studentId)
    .where("status", "==", "active")
    .get();
  const currentGoals = goalsSnapshot.docs.map((doc) => doc.data());

  // 3. Get recent conversation history (last 10 messages)
  const conversationDoc = await db
    .collection("conversations")
    .doc(conversationId)
    .get();
  const conversation = conversationDoc.data();
  const recentMessages = conversation.messages.slice(-10);

  // 4. Retrieve relevant context from Pinecone
  const queryEmbedding = await getEmbedding(message);
  const queryResponse = await index.query({
    vector: queryEmbedding,
    filter: { student_id: studentId },
    topK: 5,
    includeMetadata: true,
  });

  const contextChunks = queryResponse.matches
    .map((match) => match.metadata.chunk_text)
    .join("\n\n");

  // 5. Format prompt
  const prompt = PromptTemplate.fromTemplate(CHAT_PROMPT);
  const formattedPrompt = await prompt.format({
    student_name: student.name,
    grade: student.grade,
    retrieved_transcript_chunks:
      contextChunks || "No previous session context available.",
    current_goals: currentGoals
      .map((g) => `${g.subject}: ${g.goal}`)
      .join(", "),
    chat_history: recentMessages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n"),
    user_message: message,
  });

  // 6. Generate response
  const response = await llm.invoke(formattedPrompt);
  const aiMessage = response.content;

  // 7. Detect handoff triggers
  const shouldHandoff = detectHandoffTrigger(
    message,
    aiMessage,
    recentMessages
  );

  // 8. Save to conversation history
  await db
    .collection("conversations")
    .doc(conversationId)
    .update({
      messages: admin.firestore.FieldValue.arrayUnion(
        {
          role: "user",
          content: message,
          timestamp: admin.firestore.Timestamp.now(),
        },
        {
          role: "assistant",
          content: aiMessage,
          timestamp: admin.firestore.Timestamp.now(),
          context_used: queryResponse.matches.map(
            (m) => m.metadata.transcript_id
          ),
        }
      ),
      last_updated: admin.firestore.Timestamp.now(),
    });

  return {
    response: aiMessage,
    should_handoff: shouldHandoff,
    confidence_score: calculateConfidence(queryResponse.matches),
  };
}

function detectHandoffTrigger(userMessage, aiResponse, history) {
  const handoffKeywords = [
    "book session",
    "need tutor",
    "schedule",
    "talk to tutor",
  ];
  const frustrationCount = history.filter(
    (m) =>
      m.role === "user" &&
      (m.content.includes("confused") || m.content.includes("don't understand"))
  ).length;

  return (
    handoffKeywords.some((kw) => userMessage.toLowerCase().includes(kw)) ||
    frustrationCount >= 3
  );
}

function calculateConfidence(matches) {
  if (matches.length === 0) return 0.3;
  const avgScore =
    matches.reduce((sum, m) => sum + m.score, 0) / matches.length;
  return avgScore;
}

async function getEmbedding(text) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });
  const data = await response.json();
  return data.data[0].embedding;
}
```

**API Endpoint** (Cloud Run):

```
POST /api/chat
Headers: Authorization: Bearer <firebase_token>
Body:
{
  "student_id": "S001",
  "conversation_id": "C001",
  "message": "What did we learn about ionic bonds?"
}

Response:
{
  "response": "In your last chemistry session with your tutor...",
  "should_handoff": false,
  "confidence_score": 0.85,
  "context_used": ["T001", "T003"]
}
```

---

### 3. 📚 Adaptive Practice Generator

**Priority**: P0 (Learning Impact)

**Functionality**:

- Generate quizzes based on recent session topics
- Adapt difficulty based on student performance
- Provide immediate feedback with explanations
- Track improvement over time
- Auto-complete goals when student scores ≥85%

**Practice Types**:

1. **Quick Check** (5 questions): Review recent lesson
2. **Mastery Quiz** (10 questions): Comprehensive topic assessment
3. **Weak Spot Practice** (3-7 questions): Target identified gaps

**Technical Implementation**:

```javascript
// Cloud Run Service: Quiz Generation
// File: cloud-run/src/services/quizService.js

import { ChatOpenAI } from "@langchain/openai";
import admin from "firebase-admin";

const db = admin.firestore();
const llm = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
});

const QUIZ_GENERATION_PROMPT = `Generate {num_questions} multiple-choice questions for a grade {grade} {subject} student.

RECENT LESSON CONTEXT:
{session_transcript}

STUDENT'S WEAK AREAS (prioritize):
{weak_concepts}

DIFFICULTY: {difficulty}

Requirements:
- Test conceptual understanding, not memorization
- Include ≥1 question on weak areas if provided
- Provide detailed explanations for correct answers
- Match difficulty to student's recent performance
- Questions should be challenging but achievable

OUTPUT (strict JSON):
{
  "questions": [
    {
      "question": "Question text ending with ?",
      "options": ["A) option", "B) option", "C) option", "D) option"],
      "correct_answer": "B",
      "explanation": "Why B is correct and others are wrong...",
      "topic": "Specific topic",
      "difficulty": "medium"
    }
  ]
}`;

export async function generateQuiz(studentId, subject, numQuestions = 5) {
  // 1. Get student profile
  const studentDoc = await db.collection("students").doc(studentId).get();
  const student = studentDoc.data();

  // 2. Get recent transcripts for this subject
  const transcriptsSnapshot = await db
    .collection("session_transcripts")
    .where("student_id", "==", studentId)
    .where("subject", "==", subject)
    .orderBy("date", "desc")
    .limit(3)
    .get();

  const transcripts = transcriptsSnapshot.docs.map((doc) => doc.data());
  const transcriptText = transcripts
    .map((t) => `Topics: ${t.topics.join(", ")}\nNotes: ${t.tutor_notes}`)
    .join("\n\n");

  // 3. Get weak concepts from recent quiz results
  const quizResultsSnapshot = await db
    .collection("quiz_results")
    .where("student_id", "==", studentId)
    .where("subject", "==", subject)
    .orderBy("completed_at", "desc")
    .limit(5)
    .get();

  const weakConcepts = [];
  quizResultsSnapshot.docs.forEach((doc) => {
    const result = doc.data();
    result.answers?.forEach((answer) => {
      if (!answer.correct) {
        weakConcepts.push(answer.topic);
      }
    });
  });

  // 4. Determine difficulty based on recent performance
  const recentScores = quizResultsSnapshot.docs.map((doc) => doc.data().score);
  const avgScore =
    recentScores.length > 0
      ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
      : 70;

  const difficulty =
    avgScore >= 80 ? "hard" : avgScore >= 60 ? "medium" : "easy";

  // 5. Generate quiz via LLM
  const prompt = QUIZ_GENERATION_PROMPT.replace("{num_questions}", numQuestions)
    .replace("{grade}", student.grade)
    .replace("{subject}", subject)
    .replace("{session_transcript}", transcriptText || "No recent sessions")
    .replace("{weak_concepts}", weakConcepts.join(", ") || "None identified")
    .replace("{difficulty}", difficulty);

  const response = await llm.invoke([
    {
      role: "system",
      content:
        "You are a quiz generation expert. Always respond with valid JSON.",
    },
    { role: "user", content: prompt },
  ]);

  const quizData = JSON.parse(response.content);

  // 6. Store quiz in Firestore
  const quizRef = await db.collection("quizzes").add({
    quiz_id: null, // Will be set after creation
    student_id: studentId,
    subject: subject,
    difficulty: difficulty,
    questions: quizData.questions,
    created_at: admin.firestore.Timestamp.now(),
    completed: false,
  });

  await quizRef.update({ quiz_id: quizRef.id });

  return {
    quiz_id: quizRef.id,
    questions: quizData.questions,
    difficulty: difficulty,
  };
}

export async function submitQuiz(quizId, studentId, answers) {
  // 1. Get quiz
  const quizDoc = await db.collection("quizzes").doc(quizId).get();
  const quiz = quizDoc.data();

  // 2. Grade answers
  let correctCount = 0;
  const gradedAnswers = quiz.questions.map((q, idx) => {
    const isCorrect = answers[idx] === q.correct_answer;
    if (isCorrect) correctCount++;

    return {
      question: q.question,
      user_answer: answers[idx],
      correct_answer: q.correct_answer,
      correct: isCorrect,
      explanation: q.explanation,
      topic: q.topic,
    };
  });

  const score = Math.round((correctCount / quiz.questions.length) * 100);

  // 3. Save quiz result
  await db.collection("quiz_results").add({
    quiz_id: quizId,
    student_id: studentId,
    subject: quiz.subject,
    score: score,
    answers: gradedAnswers,
    completed_at: admin.firestore.Timestamp.now(),
  });

  // 4. Update quiz status
  await db.collection("quizzes").doc(quizId).update({
    completed: true,
    score: score,
  });

  // 5. Check if goal should auto-complete (score ≥ 85%)
  if (score >= 85) {
    const goalsSnapshot = await db
      .collection("goals")
      .where("student_id", "==", studentId)
      .where("subject", "==", quiz.subject)
      .where("status", "==", "active")
      .get();

    if (!goalsSnapshot.empty) {
      const goalDoc = goalsSnapshot.docs[0];
      await goalDoc.ref.update({
        status: "completed",
        progress: 1.0,
        completed: admin.firestore.Timestamp.now(),
      });

      // Trigger recommendation generation (via Cloud Function)
      await db.collection("events").add({
        type: "goal_completed",
        student_id: studentId,
        goal_id: goalDoc.id,
        timestamp: admin.firestore.Timestamp.now(),
      });
    }
  }

  return {
    score: score,
    total_questions: quiz.questions.length,
    correct_answers: correctCount,
    answers: gradedAnswers,
    goal_completed: score >= 85,
  };
}
```

**Firestore Collections**:

```javascript
// quizzes collection
{
  quiz_id: "Q001",
  student_id: "S001",
  subject: "Chemistry",
  difficulty: "medium",
  questions: [ /* array of questions */ ],
  created_at: Timestamp,
  completed: false,
  score: null
}

// quiz_results collection
{
  result_id: "QR001",
  quiz_id: "Q001",
  student_id: "S001",
  subject: "Chemistry",
  score: 85,
  answers: [
    {
      question: "What is an ionic bond?",
      user_answer: "B",
      correct_answer: "B",
      correct: true,
      explanation: "...",
      topic: "Chemical Bonding"
    }
  ],
  completed_at: Timestamp
}
```

**Adaptive Logic**:

- Score ≥85%: Auto-complete goal, trigger recommendations
- Score ≥80%: Increase difficulty for next quiz
- Score 60-79%: Maintain difficulty, reinforce concepts
- Score <60%: Decrease difficulty, focus on fundamentals

---

### 4. 🎯 Progress Dashboard

**Priority**: P0 (Visibility)

**Functionality**:

- Visual progress bars for each goal
- Quiz score trends over time
- Session frequency calendar heatmap
- Multi-goal tracking (not just single subject)
- Real-time updates via Firestore listeners

**Dashboard Components**:

1. **Goal Progress Cards**

   - Subject name
   - Progress percentage (0-100%)
   - Days until target completion
   - "Continue Learning" CTA

2. **Learning Analytics**

   - Quiz performance chart (line graph)
   - Topics mastered (badge display)
   - Session streak counter

3. **Activity Feed**
   - Recent quiz results
   - Upcoming session reminders
   - Achievement unlocks

**Technical Implementation**:

```javascript
// Frontend: Real-time Dashboard with Firestore Listeners
// File: frontend/src/pages/Dashboard.jsx

import { useEffect, useState } from "react";
import {
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../firebase";

export function Dashboard() {
  const [goals, setGoals] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const studentId = auth.currentUser.uid;

    // Real-time listener for goals
    const goalsQuery = query(
      collection(db, "goals"),
      where("student_id", "==", studentId),
      orderBy("started", "desc")
    );

    const unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
      const goalsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGoals(goalsData);
      setLoading(false);
    });

    // Real-time listener for quiz results
    const quizQuery = query(
      collection(db, "quiz_results"),
      where("student_id", "==", studentId),
      orderBy("completed_at", "desc"),
      limit(10)
    );

    const unsubscribeQuizzes = onSnapshot(quizQuery, (snapshot) => {
      const quizData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setQuizResults(quizData);
    });

    return () => {
      unsubscribeGoals();
      unsubscribeQuizzes();
    };
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="dashboard">
      <h1>Your Learning Dashboard</h1>

      {/* Goal Progress Cards */}
      <section className="goals-section">
        <h2>Current Goals</h2>
        <div className="goal-cards">
          {goals
            .filter((g) => g.status === "active")
            .map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
        </div>
      </section>

      {/* Quiz Performance Chart */}
      <section className="analytics-section">
        <h2>Quiz Performance</h2>
        <QuizChart data={quizResults} />
      </section>

      {/* Activity Feed */}
      <section className="activity-section">
        <h2>Recent Activity</h2>
        <ActivityFeed quizResults={quizResults} />
      </section>
    </div>
  );
}
```

**Real-Time Updates**:

- Firestore `onSnapshot()` listeners provide instant updates
- No polling needed - changes pushed from server
- Dashboard reflects quiz completions, goal updates, etc. within <1s

---

### 5. 🔔 Smart Nudge System

**Priority**: P0 (Retention)

**Functionality**:

- Detect low engagement (<3 sessions in 7 days from goal start)
- Send personalized email nudge
- Track nudge effectiveness
- Prevent duplicate nudges

**Nudge Triggers & Logic**:

| Trigger            | Condition             | Timing           | Message Type                              |
| ------------------ | --------------------- | ---------------- | ----------------------------------------- |
| Early Engagement   | Day 7, <3 sessions    | Day 7 9am local  | Motivational + booking CTA                |
| Practice Reminder  | No activity in 3 days | 3 days 6pm local | "Your AI companion misses you"            |
| Goal Near Complete | Progress ≥85%         | Immediately      | "You're almost there! Book final session" |

**Technical Implementation**:

```javascript
// Cloud Function: Scheduled Nudge Checker
// File: functions/src/scheduledNudges.js

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const checkAndSendNudges = functions.pubsub
  .schedule("every 1 hours")
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const sevenDaysAgo = new Date(
      now.toDate().getTime() - 7 * 24 * 60 * 60 * 1000
    );
    const threeDaysAgo = new Date(
      now.toDate().getTime() - 3 * 24 * 60 * 60 * 1000
    );

    // 1. Find students with Day 7 low engagement
    const studentsSnapshot = await db.collection("students").get();

    for (const studentDoc of studentsSnapshot.docs) {
      const student = studentDoc.data();
      const studentId = studentDoc.id;

      // Check if nudge already sent
      const nudgeExists = await db
        .collection("nudge_logs")
        .where("student_id", "==", studentId)
        .where("nudge_type", "==", "day_7_engagement")
        .get();

      if (!nudgeExists.empty) continue; // Already nudged

      // Check enrollment date
      const enrollmentDate = student.enrollment_date.toDate();
      const daysSinceEnrollment = Math.floor(
        (now.toDate() - enrollmentDate) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceEnrollment === 7) {
        // Count sessions in last 7 days
        const sessionsSnapshot = await db
          .collection("session_transcripts")
          .where("student_id", "==", studentId)
          .where("date", ">=", admin.firestore.Timestamp.fromDate(sevenDaysAgo))
          .get();

        const sessionCount = sessionsSnapshot.size;

        if (sessionCount < 3) {
          // Send Day 7 nudge
          await sendDay7Nudge(student, sessionCount);

          // Log nudge
          await db.collection("nudge_logs").add({
            student_id: studentId,
            nudge_type: "day_7_engagement",
            sent_at: now,
            session_count: sessionCount,
            status: "sent",
          });
        }
      }

      // 2. Check for inactivity (no chat in 3 days)
      const conversationsSnapshot = await db
        .collection("conversations")
        .where("student_id", "==", studentId)
        .orderBy("last_updated", "desc")
        .limit(1)
        .get();

      if (!conversationsSnapshot.empty) {
        const lastConversation = conversationsSnapshot.docs[0].data();
        const lastActive = lastConversation.last_updated.toDate();
        const daysSinceActive = Math.floor(
          (now.toDate() - lastActive) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceActive >= 3) {
          // Check if inactivity nudge already sent recently
          const recentNudge = await db
            .collection("nudge_logs")
            .where("student_id", "==", studentId)
            .where("nudge_type", "==", "inactivity")
            .where(
              "sent_at",
              ">=",
              admin.firestore.Timestamp.fromDate(threeDaysAgo)
            )
            .get();

          if (recentNudge.empty) {
            await sendInactivityNudge(student);

            await db.collection("nudge_logs").add({
              student_id: studentId,
              nudge_type: "inactivity",
              sent_at: now,
              days_inactive: daysSinceActive,
              status: "sent",
            });
          }
        }
      }

      // 3. Check for goals near completion (progress ≥85%)
      const goalsSnapshot = await db
        .collection("goals")
        .where("student_id", "==", studentId)
        .where("status", "==", "active")
        .where("progress", ">=", 0.85)
        .get();

      for (const goalDoc of goalsSnapshot.docs) {
        const goal = goalDoc.data();

        // Check if near-completion nudge already sent for this goal
        const goalNudgeExists = await db
          .collection("nudge_logs")
          .where("student_id", "==", studentId)
          .where("nudge_type", "==", "goal_near_complete")
          .where("goal_id", "==", goalDoc.id)
          .get();

        if (goalNudgeExists.empty) {
          await sendGoalNearCompleteNudge(student, goal);

          await db.collection("nudge_logs").add({
            student_id: studentId,
            goal_id: goalDoc.id,
            nudge_type: "goal_near_complete",
            sent_at: now,
            progress: goal.progress,
            status: "sent",
          });
        }
      }
    }

    console.log("Nudge check completed");
  });

async function sendDay7Nudge(student, sessionCount) {
  const msg = {
    to: student.email,
    from: "companion@studyai.com",
    subject: `${student.name}, let's keep the momentum going! 🚀`,
    html: `
      <h2>Hi ${student.name},</h2>
      <p>You started strong with ${sessionCount} session${
      sessionCount !== 1 ? "s" : ""
    }!</p>
      <p>Your AI Study Companion noticed you haven't checked in lately.</p>
      
      <h3>Quick wins waiting for you:</h3>
      <ul>
        <li>5 practice questions to review what you learned</li>
        <li>Chat about anything you're stuck on</li>
        <li>See your progress toward your goals</li>
      </ul>
      
      <p><a href="https://study-companion.web.app/dashboard" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">Continue Learning</a></p>
      
      <p>Your progress shouldn't pause between sessions!</p>
      <p>- Your AI Study Companion</p>
    `,
  };

  await sgMail.send(msg);
  console.log(`Day 7 nudge sent to ${student.email}`);
}

async function sendInactivityNudge(student) {
  const msg = {
    to: student.email,
    from: "companion@studyai.com",
    subject: `${student.name}, your AI companion misses you! 💭`,
    html: `
      <h2>Hi ${student.name},</h2>
      <p>It's been a few days since we last connected. Your learning journey is waiting!</p>
      
      <p><strong>Pick up where you left off:</strong></p>
      <ul>
        <li>Review your recent progress</li>
        <li>Take a quick practice quiz</li>
        <li>Chat about any questions you have</li>
      </ul>
      
      <p><a href="https://study-companion.web.app/chat" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">Start Chatting</a></p>
      
      <p>Consistency is key to mastering your goals!</p>
      <p>- Your AI Study Companion</p>
    `,
  };

  await sgMail.send(msg);
  console.log(`Inactivity nudge sent to ${student.email}`);
}

async function sendGoalNearCompleteNudge(student, goal) {
  const msg = {
    to: student.email,
    from: "companion@studyai.com",
    subject: `${student.name}, you're almost there! 🎉`,
    html: `
      <h2>Hi ${student.name},</h2>
      <p>Amazing news! You're at ${Math.round(
        goal.progress * 100
      )}% completion for your ${goal.subject} goal: "${goal.goal}"</p>
      
      <p><strong>Finish strong:</strong></p>
      <ul>
        <li>Take one more practice quiz to solidify your knowledge</li>
        <li>Book a final session with your tutor to review</li>
        <li>Celebrate your achievement!</li>
      </ul>
      
      <p><a href="https://study-companion.web.app/dashboard" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0;">Complete Your Goal</a></p>
      
      <p>You've worked hard - let's finish this together!</p>
      <p>- Your AI Study Companion</p>
    `,
  };

  await sgMail.send(msg);
  console.log(`Goal near-complete nudge sent to ${student.email}`);
}
```

**Firestore Collection**:

```javascript
// nudge_logs collection
{
  log_id: "NL001",
  student_id: "S001",
  nudge_type: "day_7_engagement", // day_7_engagement | inactivity | goal_near_complete
  sent_at: Timestamp,
  status: "sent", // sent | failed

  // Optional fields based on type
  session_count: 2, // For day_7
  days_inactive: 3, // For inactivity
  goal_id: "G001", // For goal_near_complete
  progress: 0.87 // For goal_near_complete
}
```

**Cloud Scheduler Configuration**:

```bash
# Deploy scheduled function
firebase deploy --only functions:checkAndSendNudges

# Cloud Scheduler automatically created by Firebase with pubsub.schedule()
# Runs every hour to check for nudge triggers
```

---

### 6. 🧭 Recommendation Engine

**Priority**: P0 (Churn Prevention)

**Functionality**:

- Suggest related subjects when goal completed
- Personalize recommendations based on student history and learning style
- Show clear value proposition for next subject
- Adapt suggestions based on grade level and academic goals

**Technical Implementation**:

```javascript
// Cloud Function: Generate Recommendations on Goal Completion
// File: functions/src/recommendations.js

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { ChatOpenAI } from "@langchain/openai";

const db = admin.firestore();
const llm = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
});

const RECOMMENDATION_PROMPT = `You are an expert academic advisor for K-12 and college prep students.

STUDENT PROFILE:
Name: {student_name}
Grade: {grade}
Just Completed: {completed_goal}
All Completed Subjects: {completed_subjects}
Currently Studying: {current_subjects}
Average Quiz Score: {avg_quiz_score}%

LEARNING HISTORY:
{learning_summary}

TASK:
Suggest 3 related subjects this student should study next. Consider:
1. Natural academic progressions (e.g., Algebra → Geometry → Trigonometry)
2. Related skill areas (e.g., Chemistry → Physics for STEM)
3. College prep needs (e.g., SAT complete → College Essays)
4. Student's demonstrated interests and strengths
5. Grade-appropriate recommendations

For each recommendation:
- Choose subjects that build on completed work
- Provide compelling, personalized reasons
- List 3-4 specific skills they'll develop
- Suggest an appropriate difficulty level

IMPORTANT:
- DO NOT suggest subjects they're already studying or have completed
- Prioritize high-value subjects for college applications if student is grades 10-12
- Consider interdisciplinary connections
- Make recommendations exciting and achievable

OUTPUT FORMAT (strict JSON):
{
  "recommendations": [
    {
      "subject": "Physics",
      "reason": "Your chemistry foundation makes physics a natural next step",
      "related_skills": ["Forces and motion", "Energy", "Electricity"],
      "difficulty": "medium",
      "college_value": "high",
      "icon": "⚡"
    }
  ],
  "reasoning": "Why these three recommendations make sense"
}`;

// Triggered when goal is marked as completed
export const generateRecommendations = functions.firestore
  .document("goals/{goalId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger if goal was just completed
    if (before.status !== "completed" && after.status === "completed") {
      const studentId = after.student_id;

      // 1. Get student profile
      const studentDoc = await db.collection("students").doc(studentId).get();
      const student = studentDoc.data();

      // 2. Get all completed goals
      const completedGoalsSnapshot = await db
        .collection("goals")
        .where("student_id", "==", studentId)
        .where("status", "==", "completed")
        .get();

      const completedSubjects = completedGoalsSnapshot.docs.map(
        (doc) => doc.data().subject
      );

      // 3. Get current active goals
      const activeGoalsSnapshot = await db
        .collection("goals")
        .where("student_id", "==", studentId)
        .where("status", "==", "active")
        .get();

      const currentSubjects = activeGoalsSnapshot.docs.map(
        (doc) => doc.data().subject
      );

      // 4. Calculate average quiz score
      const quizResultsSnapshot = await db
        .collection("quiz_results")
        .where("student_id", "==", studentId)
        .orderBy("completed_at", "desc")
        .limit(10)
        .get();

      const avgQuizScore = quizResultsSnapshot.empty
        ? 70
        : quizResultsSnapshot.docs
            .map((doc) => doc.data().score)
            .reduce((a, b) => a + b, 0) / quizResultsSnapshot.size;

      // 5. Build learning summary
      const transcriptsSnapshot = await db
        .collection("session_transcripts")
        .where("student_id", "==", studentId)
        .orderBy("date", "desc")
        .limit(5)
        .get();

      const learningSummary = transcriptsSnapshot.docs
        .map((doc) => {
          const t = doc.data();
          return `${t.subject}: ${t.topics.join(", ")}`;
        })
        .join("\n");

      // 6. Generate recommendations via LLM
      const prompt = RECOMMENDATION_PROMPT.replace(
        "{student_name}",
        student.name
      )
        .replace("{grade}", student.grade)
        .replace("{completed_goal}", `${after.subject}: ${after.goal}`)
        .replace("{completed_subjects}", completedSubjects.join(", ") || "None")
        .replace("{current_subjects}", currentSubjects.join(", ") || "None")
        .replace("{avg_quiz_score}", Math.round(avgQuizScore))
        .replace("{learning_summary}", learningSummary || "No recent sessions");

      const response = await llm.invoke([
        {
          role: "system",
          content:
            "You are an academic advisor. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ]);

      const recommendations = JSON.parse(response.content);

      // 7. Store recommendations
      await db.collection("recommendations").add({
        student_id: studentId,
        completed_goal_id: context.params.goalId,
        recommendations: recommendations.recommendations,
        reasoning: recommendations.reasoning,
        generated_at: admin.firestore.Timestamp.now(),
        viewed: false,
        accepted: [],
      });

      console.log(`Recommendations generated for ${studentId}`);
    }
  });
```

**Firestore Collection**:

```javascript
// recommendations collection
{
  recommendation_id: "R001",
  student_id: "S001",
  completed_goal_id: "G001",
  recommendations: [
    {
      subject: "Physics",
      reason: "Your chemistry foundation makes physics a natural next step",
      related_skills: ["Forces and motion", "Energy", "Electricity"],
      difficulty: "medium",
      college_value: "high",
      icon: "⚡"
    }
  ],
  reasoning: "These subjects build on your STEM foundation...",
  generated_at: Timestamp,
  viewed: false,
  accepted: [] // Array of accepted subject IDs
}
```

**Frontend Display**:

- Recommendations appear immediately after goal completion
- Real-time Firestore listener shows new recommendations
- "Start Learning" button creates new goal in Firestore
- Celebration animation on goal completion

---

## Data Model (Firestore)

### Collections Structure

```
users/
  {uid}/
    - email, name, grade, created_at, last_login

students/
  {student_id}/
    - user_id, name, email, grade, subjects, enrollment_date, last_active

    stats/ (subcollection)
      {stat_id}/
        - sessions_last_7_days, chat_interactions_last_7_days, etc.

goals/
  {goal_id}/
    - student_id, subject, goal, progress, status, started, target_date, completed

session_transcripts/
  {transcript_id}/
    - student_id, subject, topics, date, tutor_notes, pinecone_id, storage_url

conversations/
  {conversation_id}/
    - student_id, messages[], last_updated, created_at

quizzes/
  {quiz_id}/
    - student_id, subject, difficulty, questions[], created_at, completed, score

quiz_results/
  {result_id}/
    - quiz_id, student_id, subject, score, answers[], completed_at

recommendations/
  {recommendation_id}/
    - student_id, completed_goal_id, recommendations[], reasoning, generated_at, viewed, accepted[]

nudge_logs/
  {log_id}/
    - student_id, nudge_type, sent_at, status, [additional fields]

events/ (for triggering Cloud Functions)
  {event_id}/
    - type, student_id, goal_id, timestamp
```

---

## Deployment Architecture

### Project Structure

```
study-companion/
├── frontend/                    # React app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── firebase.js         # Firebase config
│   │   └── App.jsx
│   ├── .env.local              # Firebase config
│   └── package.json
│
├── functions/                   # Cloud Functions
│   ├── src/
│   │   ├── index.js            # Main exports
│   │   ├── scheduledNudges.js  # Nudge system
│   │   ├── recommendations.js  # Recommendation engine
│   │   └── auth.js             # Auth triggers
│   ├── package.json
│   └── .env                    # API keys
│
├── cloud-run/                   # Heavy AI processing
│   ├── src/
│   │   ├── index.js            # Express server
│   │   ├── services/
│   │   │   ├── chatService.js  # RAG + Chat
│   │   │   ├── quizService.js  # Quiz generation
│   │   │   └── pinecone.js     # Vector DB
│   │   └── middleware/
│   │       └── auth.js         # Firebase token validation
│   ├── Dockerfile
│   ├── package.json
│   └── .env
│
├── firestore.rules              # Security rules
├── firestore.indexes.json       # Composite indexes
├── storage.rules                # Cloud Storage rules
├── firebase.json                # Firebase config
└── .firebaserc                  # Project aliases
```

### Deployment Commands

```bash
# 1. Frontend (Firebase Hosting)
cd frontend
npm run build
firebase deploy --only hosting

# 2. Cloud Functions
cd functions
npm install
firebase deploy --only functions

# 3. Cloud Run (AI Services)
cd cloud-run
gcloud builds submit --tag gcr.io/PROJECT_ID/ai-service
gcloud run deploy ai-service \
  --image gcr.io/PROJECT_ID/ai-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# 4. Firestore Rules & Indexes
firebase deploy --only firestore:rules,firestore:indexes

# 5. Cloud Storage Rules
firebase deploy --only storage
```

---

## Environment Variables

### Frontend (.env.local)

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_CLOUD_RUN_URL=https://ai-service-xxx.run.app
```

### Cloud Functions (.env)

```
OPENAI_API_KEY=sk-...
SENDGRID_API_KEY=SG...
PINECONE_API_KEY=...
PINECONE_INDEX=study-companion
```

### Cloud Run (.env)

```
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX=study-companion
FIREBASE_PROJECT_ID=...
```

---

## Cost Estimates (48-Hour MVP + 30 Days Production)

| Service          | Usage                 | Cost (30 days)  |
| ---------------- | --------------------- | --------------- |
| Firebase Hosting | 10GB transfer         | $0.15           |
| Firebase Auth    | 1000 users            | Free            |
| Cloud Firestore  | 50K reads, 10K writes | $0.36           |
| Cloud Storage    | 1GB storage           | $0.02           |
| Cloud Functions  | 100K invocations      | $0.40           |
| Cloud Run        | 10K requests, 1GB RAM | $1.00           |
| Pinecone         | Starter tier          | $70.00          |
| OpenAI           | ~50K tokens/day       | $30.00          |
| SendGrid         | 100 emails/day        | Free            |
| **Total**        |                       | **~$102/month** |

**Scaling to 1000 active users**: ~$500-800/month (mainly OpenAI + Pinecone)

---

## MVP Scope & Phase 2 Integration Plan

### What's Mocked in MVP (48-Hour Sprint)

| Component               | MVP Status | Implementation                     | Phase 2 Plan                               |
| ----------------------- | ---------- | ---------------------------------- | ------------------------------------------ |
| **Authentication**      | ✅ Native  | Firebase Auth (email/password)     | Add Google OAuth, Nerdy SSO integration    |
| **Session Transcripts** | ✅ Mocked  | Cloud Storage + manual JSON files  | API integration with Nerdy tutoring system |
| **Subject List**        | ✅ Generic | Hardcoded in Firestore             | Sync with Nerdy's subject taxonomy         |
| **Tutor Booking**       | ✅ Mocked  | Form submission, no actual booking | Integrate with Nerdy's booking API         |
| **Student Database**    | ✅ Mocked  | Firestore with test data           | Sync with Nerdy's student master data      |
| **Tutor Profiles**      | ✅ Mocked  | Generic "Available tutors"         | Pull real tutor availability and rates     |
| **Payment Integration** | ❌ N/A     | Not in scope                       | Phase 3 (post-MVP review)                  |
| **Video Sessions**      | ❌ N/A     | Not in scope                       | Phase 3 (post-MVP review)                  |

### Data Flow: MVP vs Production

**MVP (48-Hour Sprint)**:

```
Student Login (Firebase Auth)
  ↓
[Firestore] Student profile + goals
  ↓
[Cloud Storage] Mock session transcripts
  ↓
[Pinecone] Vector search for RAG
  ↓
[Cloud Run] GPT-4o chat with context
  ↓
[Cloud Functions] Quiz generation, recommendations
  ↓
[Firestore] Real-time dashboard updates
  ↓
[Cloud Scheduler] Nudge system (SendGrid emails)
```

**Phase 2 Integration (After MVP Validation)**:

```
Nerdy SSO Login
  ↓
[Firestore] Synced with Nerdy student DB
  ↓
[Nerdy API] Pull real tutoring session transcripts
  ↓
[Pinecone] Vector search for RAG
  ↓
[Cloud Run] GPT-4o chat with context
  ↓
[Cloud Functions] Quiz generation, recommendations
  ↓
[Firestore] Real-time dashboard updates
  ↓
[Nerdy Booking API] Real tutor bookings
  ↓
[Cloud Scheduler] Nudge system (SendGrid emails)
```

---

## Testing Strategy

### Unit Tests

```bash
# Frontend
cd frontend
npm run test

# Cloud Functions
cd functions
npm run test

# Cloud Run
cd cloud-run
npm run test
```

### Integration Tests

- Test auth flow: Register → Login → Token validation
- Test chat flow: Message → RAG retrieval → LLM response
- Test quiz flow: Generate → Submit → Grade → Auto-complete goal
- Test recommendations: Goal complete → LLM recommendation → Firestore storage

### Load Testing

- Use Apache Bench or k6 for API load testing
- Target: 100 concurrent users, <2s response time

### Firebase Emulator Suite (Local Development)

```bash
# Run all emulators locally
firebase emulators:start

# Available emulators:
# - Authentication: localhost:9099
# - Firestore: localhost:8080
# - Functions: localhost:5001
# - Hosting: localhost:5000
```

---

## Security & Compliance

### Authentication Security

- Firebase Auth handles password hashing (bcrypt)
- JWT tokens auto-expire after 1 hour
- Refresh tokens managed by Firebase SDK
- Email verification available (optional for MVP)

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(studentId) {
      return isSignedIn() && request.auth.uid == studentId;
    }

    match /users/{userId} {
      allow read, write: if isSignedIn() && request.auth.uid == userId;
    }

    match /students/{studentId} {
      allow read: if isOwner(resource.data.user_id);
      allow write: if isOwner(request.resource.data.user_id);
    }

    match /goals/{goalId} {
      allow read, write: if isOwner(resource.data.student_id);
    }

    match /conversations/{conversationId} {
      allow read, write: if isOwner(resource.data.student_id);
    }

    match /quiz_results/{resultId} {
      allow read: if isOwner(resource.data.student_id);
      allow create: if isOwner(request.resource.data.student_id);
    }
  }
}
```

### FERPA Compliance

- Student data encrypted at rest (Firebase default)
- Access logs via Cloud Audit Logs
- Data retention policies configurable
- User data deletion via Cloud Functions

---

## Success Checklist

### Technical Deliverables

- ✅ Firebase Authentication with email/password
- ✅ Firestore database with 6+ collections
- ✅ Cloud Functions for nudges, recommendations, auth triggers
- ✅ Cloud Run service for AI processing (chat, quiz, RAG)
- ✅ Pinecone vector search integration
- ✅ Real-time dashboard with Firestore listeners
- ✅ SendGrid email integration
- ✅ Firebase Hosting deployment
- ✅ Firestore security rules configured

### Feature Completeness

- ✅ User registration and login
- ✅ Chat with RAG context retrieval
- ✅ Adaptive quizzes with auto-goal-completion at 85%
- ✅ Progress dashboard with real-time updates
- ✅ Personalized recommendations on goal completion
- ✅ Smart email nudges (Day 7, inactivity, goal near complete)

### Documentation

- ✅ README.md (setup & overview)
- ✅ API.md (all endpoints)
- ✅ ARCHITECTURE.md (system design)
- ✅ TESTING.md (how to test)
- ✅ DEPLOYMENT.md (Firebase deployment guide)

### Business Value

- ✅ 5 test students with realistic data
- ✅ Clear path to Nerdy integration (Phase 2)
- ✅ Cost projections documented
- ✅ MVP ready for stakeholder review

---

## Glossary

- **RAG (Retrieval-Augmented Generation)**: AI technique combining semantic search with LLM generation
- **Embeddings**: Numerical vector representations of text for semantic similarity
- **Pinecone**: Managed vector database for fast similarity search
- **Firestore**: Google's NoSQL cloud database with real-time sync
- **Cloud Functions**: Serverless functions for lightweight backend logic
- **Cloud Run**: Containerized services for heavy compute workloads
- **Firebase Auth**: Authentication service with built-in JWT management
- **FERPA**: Family Educational Rights and Privacy Act (US student data privacy)

---

**Document Version**: 2.0 (Firebase Edition)  
**Last Updated**: November 5, 2025  
**Author**: Product Team  
**Status**: Ready for Firebase Sprint 🚀

---

## Quick Start Guide

### Prerequisites

```bash
# Install Node.js 18+
node -v

# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Create Firebase project
firebase projects:create study-companion
```

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/study-companion
cd study-companion

# 2. Initialize Firebase
firebase init

# Select:
# - Hosting
# - Functions
# - Firestore
# - Storage

# 3. Set up environment variables
cd functions && cp .env.example .env
cd ../frontend && cp .env.local.example .env.local
cd ../cloud-run && cp .env.example .env

# 4. Install dependencies
cd functions && npm install
cd ../frontend && npm install
cd ../cloud-run && npm install

# 5. Run emulators for local development
firebase emulators:start
```

### Development Workflow

```bash
# Terminal 1: Firebase Emulators
firebase emulators:start

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Cloud Run (local)
cd cloud-run && npm run dev
```

### Deploy to Production

```bash
# Deploy everything
npm run deploy

# Or deploy individually
firebase deploy --only hosting
firebase deploy --only functions
gcloud run deploy ai-service --source cloud-run/
```

---
