# AI Study Companion (StudyBuddy)

A persistent AI learning companion that uses Retrieval-Augmented Generation (RAG) to help students learn through Socratic dialogue, adaptive quizzes, and intelligent recommendations.

## 🚀 Features (MVP - 48 Hour Sprint)

- **Authentication**: Firebase Auth with email/password
- **Chat Agent**: AI-powered conversational learning with RAG retrieval from transcripts
- **Quiz Generator**: Adaptive quizzes with auto-goal-completion at 85%+
- **Progress Dashboard**: Real-time goal tracking and analytics
- **Recommendations**: Personalized subject suggestions on goal completion
- **Nudge System**: Smart email reminders to boost engagement
- **Conversation History**: Persistent learning context across sessions

## 📋 Tech Stack

| Layer          | Technology                     | Purpose                   |
| -------------- | ------------------------------ | ------------------------- |
| **Frontend**   | React 18 + Vite + Tailwind CSS | UI                        |
| **Auth**       | Firebase Auth                  | User management           |
| **Database**   | Firestore                      | NoSQL, real-time sync     |
| **Storage**    | Cloud Storage                  | Transcripts, media        |
| **Light APIs** | Cloud Functions                | Triggers, recommendations |
| **Heavy APIs** | Cloud Run                      | Chat, quiz generation     |
| **Vector DB**  | Pinecone                       | Semantic search           |
| **LLM**        | OpenAI GPT-4o-mini             | Chat, quiz gen            |
| **Email**      | SendGrid                       | Transactional emails      |
| **Hosting**    | Firebase Hosting               | Static site               |

## 🎯 IMPORTANT: Firebase UID Standardization

**Status**: ✅ COMPLETE - All scripts updated!

The project now uses Firebase UID as the ONLY student identifier everywhere. This fixes the RAG context retrieval issue.

**To Get Started**:
1. Read: `NEXT_STEPS.md` (5-minute guide)
2. Or read: `SETUP_FIREBASE_UID.md` (comprehensive guide)
3. Or read: `QUICK_REFERENCE.md` (quick lookup)

Follow the 5-step quick start in `NEXT_STEPS.md` to test the full chat + RAG system.

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- OpenAI API key
- SendGrid API key (optional, for Phase 7)
- Pinecone API key (optional, for Phase 2)

### Setup (Phase 0)

1. **Create Firebase project**

   - Go to https://console.firebase.google.com
   - Create new project: "AI Study Companion"
   - Upgrade to Blaze plan (required for Cloud Functions)
   - Enable Email/Password authentication
   - Create Firestore database
   - Copy Firebase config

2. **Clone and install**

   ```bash
   cd StudyBuddy
   npm install
   cd frontend && npm install && cd ..
   cd functions && npm install && cd ..
   ```

3. **Configure environment**

   - Create `frontend/.env.local` with Firebase config
   - Create `functions/.env` with API keys
   - Update `.firebaserc` with your Firebase project ID

4. **Test locally**

   ```bash
   # Terminal 1: Start Firebase emulators
   firebase emulators:start

   # Terminal 2: Start frontend dev server
   cd frontend && npm run dev

   # Terminal 3: Watch functions (optional)
   cd functions && npm run build:watch
   ```

5. **Access the app**
   - Frontend: http://localhost:5173
   - Firestore Emulator UI: http://localhost:4000

## 📁 Project Structure

```
StudyBuddy/
├── frontend/                    # React app (Vite)
│   ├── src/
│   │   ├── components/          # UI components
│   │   ├── contexts/            # AuthContext, ChatContext
│   │   ├── pages/               # Login, Register, Dashboard, Chat, Quiz
│   │   ├── hooks/               # Custom hooks
│   │   ├── services/            # API calls
│   │   ├── firebase.js          # Firebase config
│   │   └── App.jsx              # Main app with routing
│   └── package.json
├── functions/                   # Cloud Functions (Node.js)
│   ├── src/
│   │   ├── index.js             # Auth triggers
│   │   ├── services/            # Helper functions
│   │   └── triggers/            # Event triggers
│   └── package.json
├── cloud-run/                   # Cloud Run service (Express)
│   ├── src/
│   │   ├── index.js             # Express server
│   │   ├── middleware/          # Auth middleware
│   │   └── services/            # Business logic
│   └── Dockerfile
├── data/                        # Mock data
│   ├── students.json            # Test student profiles
│   └── transcripts/             # Sample tutoring transcripts
├── firebase.json                # Firebase config
├── firestore.rules              # Firestore security rules
├── storage.rules                # Cloud Storage rules
└── memory-bank/                 # Project documentation
```

## 🎯 Development Phases

| Phase | Duration | Focus                 | Status      |
| ----- | -------- | --------------------- | ----------- |
| **0** | 0-3h     | Firebase + Auth       | 🚀 Starting |
| **1** | 3-7h     | Mock Data + Storage   | ⏳ Next     |
| **2** | 7-13h    | Pinecone RAG          | ⏳ Next     |
| **3** | 13-22h   | Chat Agent            | ⏳ Next     |
| **4** | 22-30h   | Quiz Generator        | ⏳ Next     |
| **5** | 30-38h   | Dashboard (Real-time) | ⏳ Next     |
| **6** | 38-42h   | Recommendations       | ⏳ Next     |
| **7** | 42-46h   | Nudge System          | ⏳ Next     |
| **8** | 46-48h   | Integration & Testing | ⏳ Next     |

## 📚 Key Concepts

### RAG (Retrieval-Augmented Generation)

- Student transcripts are embedded with OpenAI
- Vectors stored in Pinecone for semantic search
- When student asks a question, retrieve relevant context from their transcripts
- Pass context to GPT-4o-mini for personalized response

### Handoff Detection

- AI detects when student needs human tutor:
  - Keywords: "book session", "need tutor"
  - Frustration: 3+ "confused" in history
  - Low confidence: Pinecone relevance <0.6
- Shows "Book Session" button to connect with tutor

### Auto-Goal-Completion

- Quiz score ≥85% = Goal completed
- Automatically triggers recommendation generation
- User sees celebration modal + suggestions

### Nudge System

- Day 7: Email if <3 sessions in first week
- Inactivity: Email if no chat in 3 days
- Near-completion: Email when goal progress ≥85%
- Personalized with specific achievements

## 🔐 Security

- All user data isolated by `student_id` (Firestore rules)
- Firebase Auth handles password hashing
- Cloud Functions and Cloud Run validate JWT tokens
- Cross-student data access prevented via Firestore rules

## 📊 Success Metrics

| Metric             | Target | Status           |
| ------------------ | ------ | ---------------- |
| Chat latency (P95) | <2s    | ⏳ Testing Phase |
| Quiz generation    | <3s    | ⏳ Testing Phase |
| Dashboard load     | <1s    | ⏳ Testing Phase |
| RAG accuracy       | ≥70%   | ⏳ Testing Phase |
| Zero critical bugs | ✅     | ⏳ Phase 8       |

## 💡 Testing

### Manual Testing Checklist

- [ ] Register new user → See dashboard
- [ ] Login with email/password → Persists on refresh
- [ ] Chat with AI → Get context from transcripts
- [ ] Trigger handoff detection → See "Book Session" button
- [ ] Complete quiz (85%+) → Goal auto-completes
- [ ] Goal completes → See recommendations
- [ ] Start learning recommendation → New goal created
- [ ] Day 7 email → Received with personalization
- [ ] Check Firestore → No cross-user data visible

### Performance Testing

```bash
# Use Chrome DevTools Network tab
# Chat response: <2s
# Quiz generation: <3s
# Dashboard load: <1s
```

## 🚀 Deployment

### Deploy to Firebase Hosting (Phase 9)

```bash
# Build frontend
cd frontend && npm run build && cd ..

# Deploy everything
firebase deploy

# Or deploy specific services:
firebase deploy --only hosting        # Frontend
firebase deploy --only functions      # Cloud Functions
firebase deploy --only firestore:rules # Firestore rules
```

### Deploy Cloud Run (Phase 3)

```bash
cd cloud-run
gcloud builds submit --tag gcr.io/PROJECT_ID/ai-service
gcloud run deploy ai-service --image gcr.io/PROJECT_ID/ai-service --platform managed --region us-central1
```

## 📖 Documentation

- **PHASE0_QUICKSTART.md** - Firebase setup guide
- **API.md** - Cloud Run API endpoints (Phase 9)
- **ARCHITECTURE.md** - System design & data flow (Phase 9)

## 🆘 Troubleshooting

### Firebase emulators won't start

```bash
# Clear cache and restart
firebase emulators:start --import=./data/emulator-export
```

### Firestore rules rejected my request

- Check that `student_id` matches current `uid` in rules
- Verify Firebase Auth is working (check JWT token)

### Cloud Functions timeout

- Increase timeout in `firebase.json`
- Break up large operations into smaller functions

### OpenAI API rate limited

- Switch to `gpt-4o-mini` for cheaper/faster responses
- Implement request caching/debouncing

## 📞 Support

For issues, check:

1. Firebase Console → Logs
2. `firebase functions:log`
3. Chrome DevTools → Network tab
4. Memory Bank documentation in `memory-bank/`

## 📝 License

MIT - Use freely for learning projects

---

**Ready to learn? Start with Phase 0! 🚀**

See `PHASE0_QUICKSTART.md` for Firebase setup.
