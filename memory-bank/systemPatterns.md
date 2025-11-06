# System Patterns & Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                        │
│         React 18 + Vite (Firestore listeners)           │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   FIREBASE SERVICES                      │
│  Auth │ Firestore │ Storage │ Functions │ Hosting      │
└─────────────────────────────────────────────────────────┘
            ↓                          ↓
    ┌──────────────┐         ┌──────────────────┐
    │  Cloud Run   │         │ Cloud Functions  │
    │  (Express)   │         │ (Scheduled)      │
    │ - Chat       │         │ - Nudges         │
    │ - Quiz Gen   │         │ - Recommendations│
    │ - RAG        │         │ - Auth triggers  │
    └──────────────┘         └──────────────────┘
            ↓                          ↓
    ┌──────────────┐         ┌──────────────────┐
    │  Pinecone    │         │   SendGrid       │
    │ (Vectors)    │         │   (Email)        │
    └──────────────┘         └──────────────────┘
            ↓
    ┌──────────────┐
    │   OpenAI     │
    │  (GPT-4o-m)  │
    └──────────────┘
```

## Data Flow: Chat Example

```
User sends message
    ↓
Frontend: POST /api/chat (Firebase Auth token)
    ↓
Cloud Run /api/chat endpoint
    ├─ Validate token
    ├─ Get student profile from Firestore
    ├─ Get conversation history from Firestore
    ├─ Embed message with OpenAI
    ├─ Query Pinecone for relevant transcript chunks (student_id filter)
    ├─ Format LangChain prompt (student info + goals + history + context)
    ├─ Call GPT-4o-mini → Get response
    ├─ Detect handoff trigger (keywords, confidence, frustration)
    ├─ Save message + response to Firestore
    └─ Return { response, should_handoff, confidence_score }
    ↓
Frontend: Display response, show handoff button if needed
    ↓
Real-time listener: Update UI instantly
```

## Firestore Collections Schema

```
users/{uid}
  - email, name, grade, created_at, last_login

students/{student_id}
  - user_id, name, email, grade, subjects, enrollment_date, last_active

goals/{goal_id}
  - student_id, subject, goal, progress, status, started, target_date, completed

session_transcripts/{transcript_id}
  - student_id, subject, topics[], date, tutor_notes, pinecone_id, storage_url

conversations/{conversation_id}
  - student_id, messages[], last_updated, created_at

quizzes/{quiz_id}
  - student_id, subject, difficulty, questions[], created_at, completed, score

quiz_results/{result_id}
  - quiz_id, student_id, subject, score, answers[], completed_at

recommendations/{recommendation_id}
  - student_id, completed_goal_id, recommendations[], reasoning, generated_at, viewed, accepted[]

nudge_logs/{log_id}
  - student_id, nudge_type, sent_at, status, [additional fields by type]

events/{event_id}
  - type, student_id, goal_id, timestamp (triggers Cloud Functions)
```

## Frontend Component Architecture

```
/frontend/src
├── pages/
│   ├── Login.jsx              (shadcn/ui components)
│   ├── Register.jsx           (shadcn/ui components)
│   ├── Dashboard.jsx          (Real-time goals + charts)
│   ├── Chat.jsx               (Conversational AI)
│   ├── Quiz.jsx               (Take quiz)
│   └── Recommendations.jsx    (Goal completion → next subjects)
│
├── components/
│   └── ui/                    (shadcn/ui components)
│       ├── button.jsx         (Button with variants)
│       ├── input.jsx          (Input field)
│       ├── card.jsx           (Card, CardHeader, CardContent, etc.)
│       ├── MessageBubble.jsx  (User/AI messages - future)
│       ├── GoalCard.jsx       (Progress visualization - future)
│       └── QuizCard.jsx       (Quiz display - future)
│
├── contexts/
│   ├── AuthContext.jsx        (Auth state + hooks)
│   └── ChatContext.jsx        (Chat state - future)
│
├── hooks/
│   ├── useAuth.js             (via AuthContext)
│   ├── useFirestore.js        (Generic CRUD - future)
│   └── useAPI.js              (Cloud Run calls - future)
│
├── services/
│   └── api.js                 (All API calls - future)
│
├── lib/
│   └── utils.js               (cn() utility for Tailwind)
│
└── firebase.js                (Firebase config + emulators)
```

### shadcn/ui Setup

- **Components**: Button, Input, Card (CardHeader, CardTitle, CardDescription, CardContent)
- **Styling**: Tailwind CSS v3.4.1 with CSS variables for theming
- **Configuration**: `components.json` with path aliases (`@/` for `src/`)
- **Theme**: CSS variables in `index.css` for light/dark mode support
- **Path Aliases**: Configured in `vite.config.js` and `jsconfig.json`

## Cloud Run Service Architecture

```
/cloud-run/src
├── index.js                   (Express server)
│
├── middleware/
│   └── auth.js                (Firebase token validation)
│
├── routes/
│   ├── chat.js                (POST /api/chat)
│   ├── quiz.js                (POST /api/quiz/generate, /api/quiz/submit)
│   └── health.js              (GET /health)
│
└── services/
    ├── chatService.js         (RAG + LangChain logic)
    ├── quizService.js         (Quiz generation + grading)
    ├── embeddings.js          (OpenAI embeddings)
    └── pinecone.js            (Pinecone queries + upserts)
```

## Cloud Functions Architecture

```
/functions/src
├── index.js                   (Exports all functions)
│
├── auth.js                    (Auth triggers)
│   └── onUserCreate → Create student profile
│
├── recommendations.js         (Goal completion trigger)
│   └── onGoalComplete → Generate 3 subject recommendations
│
├── scheduledNudges.js         (Scheduled - hourly)
│   ├── Day 7 engagement nudge
│   ├── Inactivity nudge (3+ days)
│   └── Goal near-completion nudge
│
└── services/
    └── embeddings.js          (Embed transcripts on upload)
```

## RAG Pipeline Flow

### 1. Ingestion (One-time: Upload transcript)

```
Transcript uploaded to Cloud Storage
    ↓
Cloud Function triggered (onFinalize)
    ├─ Read transcript from Storage
    ├─ Chunk into 400-word segments (~3 chunks per transcript)
    ├─ For each chunk: Get embedding from OpenAI text-embedding-3-small
    ├─ Upsert to Pinecone with metadata: { student_id, transcript_id, subject, topics, date, chunk_text }
    └─ Update Firestore: session_transcripts.pinecone_id = vector_id
```

### 2. Retrieval (On every chat query)

```
User asks: "What did we learn about ionic bonds?"
    ↓
Embed query with OpenAI
    ↓
Query Pinecone:
  - vector: [query_embedding]
  - filter: { student_id == current_user }
  - topK: 5
  - includeMetadata: true
    ↓
Get top 5 relevant chunks (relevance score ≥0.6)
    ↓
Inject into LLM prompt as context
    ↓
Generate response with GPT-4o-mini
```

## Security Model

### Firestore Rules (Core)

```
- Users can only read/write their own user document
- Students can only access their own student profile
- Goals/quizzes/conversations filtered by student_id
- Cross-student data leakage prevented by Firestore rules + Cloud Run filter
```

### Cloud Run Auth

```
- All requests validated with Firebase Admin SDK
- Extract uid from ID token
- Verify token hasn't expired
- Return 401 if invalid
```

### Environment Variables

```
Frontend (.env.local):
  - VITE_FIREBASE_*
  - VITE_CLOUD_RUN_URL

Cloud Functions (.env):
  - OPENAI_API_KEY
  - SENDGRID_API_KEY
  - PINECONE_API_KEY

Cloud Run (.env):
  - OPENAI_API_KEY
  - PINECONE_API_KEY
  - FIREBASE_PROJECT_ID
```

## Performance Targets

| Component          | Target    | Method                        |
| ------------------ | --------- | ----------------------------- |
| Chat latency       | <2s (P95) | DevTools Network              |
| Quiz gen           | <3s       | Time request to response      |
| Dashboard load     | <1s       | Firestore real-time listeners |
| Pinecone query     | <200ms    | Latency in Pinecone dashboard |
| Email delivery     | <5min     | SendGrid logs                 |
| Goal auto-complete | Instant   | Firestore update              |

## Key Design Decisions

| Decision                   | Rationale                                               |
| -------------------------- | ------------------------------------------------------- |
| Cloud Run for AI           | Cold start penalty worth it vs Functions (slow for LLM) |
| Firestore listeners        | Real-time dashboard updates without polling             |
| Pinecone filters           | Cross-student data isolation at DB level                |
| GPT-4o-mini                | Fast enough for chat/quiz, cost-effective               |
| Structured JSON            | Deterministic quiz parsing, no hallucinations           |
| Mock data in Firestore     | Can swap for real API calls in Phase 2                  |
| Cloud Functions for nudges | Scheduled execution via Pub/Sub                         |

---

**Last Updated**: November 6, 2025
