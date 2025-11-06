# AI Study Companion - Project Brief

## Executive Summary

**Product**: AI Study Companion (Persistent Learning Assistant)  
**Timeline**: 48-hour MVP sprint  
**Team**: Solo developer (Ankit)  
**Status**: Starting Phase 0 (Firebase Setup)

A persistent AI learning companion that:

- Lives between tutoring sessions, remembers lessons via RAG
- Generates adaptive quizzes with auto-goal-completion
- Prevents 52% post-goal churn via intelligent recommendations
- Nudges low-engagement students to book sessions
- Tracks multi-goal progress in real-time

## Problem Statement

Nerdy faces critical retention challenges:

- **52% churn after goal completion** (no clear next steps)
- **Student disengagement between sessions** (no continuous learning)
- **Low early engagement**: <3 sessions in first 7 days = high churn risk
- **Single-subject focus**: Students don't discover related subjects

## Solution

An AI companion that:

1. **Remembers** - RAG retrieval from session transcripts (Pinecone vectors)
2. **Teaches** - Conversational Socratic dialogue with handoff to human tutors
3. **Adapts** - Personalized quizzes, difficulty scaling, weak spot targeting
4. **Recommends** - Suggests related subjects on goal completion (SAT → Essays/AP, Chem → Physics)
5. **Engages** - Smart email nudges (Day 7, inactivity, goal near-complete)

## Tech Stack

| Layer      | Technology                     | Purpose                                |
| ---------- | ------------------------------ | -------------------------------------- |
| Frontend   | React 18 + Vite + Tailwind CSS | UI                                     |
| Hosting    | Firebase Hosting               | Static site                            |
| Auth       | Firebase Auth                  | User management                        |
| Database   | Cloud Firestore                | NoSQL, real-time sync                  |
| Storage    | Cloud Storage                  | Transcripts, media                     |
| Light APIs | Cloud Functions (Node.js)      | Nudges, recommendations, auth triggers |
| Heavy APIs | Cloud Run (Node.js/Express)    | AI: chat, quiz generation, RAG         |
| Vector DB  | Pinecone (free tier)           | Semantic transcript search             |
| LLM        | OpenAI GPT-4o-mini             | Chat, quiz gen, recommendations        |
| Email      | SendGrid                       | Transactional emails                   |

## Core Features (MVP - 48h)

1. ✅ **Authentication** - Firebase Auth (email/password)
2. ✅ **Chat Agent** - RAG-powered conversational AI with handoff detection
3. ✅ **Quiz Generator** - Adaptive quizzes with auto-goal-completion at 85%
4. ✅ **Progress Dashboard** - Real-time multi-goal tracking (Firestore listeners)
5. ✅ **Recommendations** - Personalized subject suggestions on goal completion
6. ✅ **Nudge System** - Smart email triggers (Day 7, inactivity, near-completion)

## Key Constraints

- **48 hours**: All 6 features must be working end-to-end
- **Mock Data**: 5 test students, 15 transcripts (no Nerdy API integration until Phase 2)
- **LLM**: GPT-4o-mini for cost/speed
- **Pinecone**: Free tier only (~45 vectors for 15 transcripts)
- **Retention Focus**: All 4 retention requirements in MVP (Day 7 nudge, goal completion → recommendations, inactivity nudge, multi-goal tracking)
- **Email Personalization**: Include specific achievements/progress in nudge emails
- **No Analytics/FERPA Deep-Dive**: Focus on core features only

## Success Metrics (48h Milestone)

| Metric             | Target         | How to Measure                   |
| ------------------ | -------------- | -------------------------------- |
| Chat latency       | <2s (P95)      | DevTools Network tab             |
| Quiz generation    | <3s            | Request → Response time          |
| Dashboard load     | <1s            | DevTools Performance             |
| RAG accuracy       | ≥70%           | Manual review of 10 test queries |
| Firestore security | ✅ Locked down | Test cross-user access fails     |
| All core flows     | ✅ Working     | Manual end-to-end testing        |
| Deployment ready   | ✅ Documented  | README + ARCHITECTURE docs       |

## Project Structure

```
/Users/ankit/Desktop/GauntletAI/StudyBuddy/
├── memory-bank/                    # Project context (this file + supporting docs)
├── .cursor/rules/                  # AI learning patterns for this project
├── frontend/                       # React app (Vite)
├── functions/                      # Cloud Functions (Node.js)
├── cloud-run/                      # Cloud Run service (Express)
├── data/                           # Mock student data + transcripts
├── firebase.json                   # Firebase config
├── .firebaserc                     # Firebase project reference
├── PRD.md                          # Product requirements (detailed)
└── TaskList.md                     # 48-hour sprint breakdown
```

## Next Steps (Immediate)

1. **Hour 0**: Create Memory Bank + finalize docs
2. **Hour 0-3 (Phase 0)**: Firebase setup + authentication
3. **Hour 3-7 (Phase 1)**: Mock data + Cloud Storage
4. **Hour 7-13 (Phase 2)**: Pinecone RAG pipeline
5. **Hour 13-22 (Phase 3)**: Chat agent (Cloud Run)
6. **Hour 22-30 (Phase 4)**: Quiz generator
7. **Hour 30-38 (Phase 5)**: Dashboard (real-time)
8. **Hour 38-42 (Phase 6)**: Recommendations engine
9. **Hour 42-46 (Phase 7)**: Nudge system
10. **Hour 46-48 (Phase 8)**: Integration + testing

## Decision Log

| Decision              | Choice                | Rationale                                          |
| --------------------- | --------------------- | -------------------------------------------------- |
| LLM Model             | GPT-4o-mini           | Fastest + cheapest (~$0.0005/1K tokens)            |
| Vector DB             | Pinecone (free)       | Production-ready, semantic search                  |
| Student Data          | Mock (5 students)     | Speed + repeatability, Nerdy integration Phase 2   |
| Quiz JSON             | Structured output     | Reliable parsing, deterministic quality            |
| Recommendations       | Let GPT decide        | LLM handles complex logic (progressions, pathways) |
| Email Personalization | Specific achievements | "You scored 90% on Chemistry!" not generic         |
| Analytics             | Skip for MVP          | Focus on core learning features                    |

---

**Document Version**: 1.0  
**Created**: November 5, 2025  
**Status**: 🚀 Ready to start Phase 0
