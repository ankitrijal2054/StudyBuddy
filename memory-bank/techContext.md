# Technical Context

## Tech Stack (Locked In)

| Layer           | Tech             | Version     | Purpose                 | Notes                                         |
| --------------- | ---------------- | ----------- | ----------------------- | --------------------------------------------- |
| Frontend        | React            | 18+         | UI framework            | Functional components + hooks only            |
| Build           | Vite             | Latest      | Fast builds             | 200ms cold start                              |
| Styling         | Tailwind CSS     | 3.4+        | Utility CSS             | v3.4.1 (required for shadcn/ui compatibility) |
| UI Components   | shadcn/ui        | Latest      | Component library       | Built on Radix UI + Tailwind CSS              |
| Routing         | React Router     | 6+          | Client-side routing     | Protected routes via AuthContext              |
| UI State        | Context API      | -           | State management        | AuthContext + ChatContext                     |
| Complex State   | useReducer       | -           | Chat message state      | Supports future extensibility (image, audio)  |
| Hosting         | Firebase Hosting | -           | Deploy frontend         | SPA rewrite in firebase.json                  |
| Auth            | Firebase Auth    | -           | User management         | Email/password, auto JWT refresh              |
| Database        | Cloud Firestore  | -           | NoSQL, real-time        | Reactive listeners for UI updates             |
| Storage         | Cloud Storage    | -           | Transcripts, media      | Mock JSON files for MVP                       |
| Light APIs      | Cloud Functions  | Node.js 18+ | Serverless functions    | Auth triggers, scheduled nudges               |
| Heavy APIs      | Cloud Run        | Node.js 18+ | Containerized service   | Chat, quiz gen, RAG (Express)                 |
| Vector DB       | Pinecone         | Free tier   | Semantic search         | ~45 vectors for 15 transcripts                |
| LLM             | OpenAI           | GPT-4o-mini | AI processing           | Fastest model, ~$0.0005/1K tokens             |
| Email           | SendGrid         | Free tier   | Transactional emails    | 100/day free, HTML templates                  |
| Orchestration   | LangChain        | Node.js     | RAG + prompt templating | OpenAI integration + Pinecone                 |
| Runtime         | Node.js          | 18+         | Backend runtime         | All backend code                              |
| Package Manager | npm              | Latest      | Dependencies            | Lock file committed                           |
| Git             | GitHub           | -           | Version control         | .gitignore configured                         |

## Prerequisites & Setup

### System Requirements

- Node.js 18+ (check: `node -v`)
- npm 8+ (check: `npm -v`)
- Git (for version control)
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud CLI (`gcloud` for Cloud Run deployment)

### Required API Keys

1. **OpenAI**: https://platform.openai.com/api-keys (GPT-4o-mini)
2. **Pinecone**: https://app.pinecone.io (free tier account + API key)
3. **SendGrid**: https://app.sendgrid.com/settings/api_keys (free tier + sender verification)
4. **Firebase**: Set up project in Firebase Console

### Accounts to Create

- [ ] Firebase project (https://console.firebase.google.com)
- [ ] Pinecone account (https://app.pinecone.io)
- [ ] OpenAI API (https://platform.openai.com)
- [ ] SendGrid account (https://sendgrid.com) - verify sender email
- [ ] Google Cloud project (for Cloud Run, linked to Firebase)

## Local Development Setup

### Environment Variables

**`frontend/.env.local`**

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=study-companion-xyz.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=study-companion-xyz
VITE_FIREBASE_STORAGE_BUCKET=study-companion-xyz.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123def456
VITE_CLOUD_RUN_URL=http://localhost:8080  # or deployed Cloud Run URL
```

**`functions/.env`**

```
OPENAI_API_KEY=sk-...
SENDGRID_API_KEY=SG...
PINECONE_API_KEY=...
PINECONE_INDEX=study-companion
```

**`cloud-run/.env`**

```
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX=study-companion
FIREBASE_PROJECT_ID=study-companion-xyz
```

### Local Development Commands

```bash
# Terminal 1: Firebase Emulators (Auth, Firestore, Functions)
firebase emulators:start

# Terminal 2: Frontend (Vite dev server)
cd frontend && npm run dev
# Runs on localhost:5173

# Terminal 3: Cloud Run (Express server - local)
cd cloud-run && npm run dev
# Runs on localhost:8080
```

## Firebase Project Structure

### Collections (Firestore)

- `users/` - User auth profiles
- `students/` - Student extended profiles
- `goals/` - Learning goals (active, completed)
- `session_transcripts/` - Tutoring session records (with Pinecone refs)
- `conversations/` - Chat history with AI
- `quizzes/` - Generated quizzes
- `quiz_results/` - Quiz submissions + grades
- `recommendations/` - Personalized subject recommendations
- `nudge_logs/` - Email nudge tracking
- `events/` - Async event triggers for Cloud Functions

### Firebase Rules

- `firestore.rules` - Firestore security rules (user isolation)
- `storage.rules` - Cloud Storage rules (same)
- `firestore.indexes.json` - Composite indexes (auto-generated)

### Firebase Configuration

- `firebase.json` - Defines which services to deploy (hosting, functions, firestore)
- `.firebaserc` - Project alias mapping

## Cloud Run Deployment

### Dockerfile

```dockerfile
FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "src/index.js"]
```

### Build & Deploy

```bash
# Build Docker image
gcloud builds submit --tag gcr.io/PROJECT_ID/ai-service

# Deploy to Cloud Run
gcloud run deploy ai-service \
  --image gcr.io/PROJECT_ID/ai-service \
  --platform managed \
  --region us-central1 \
  --set-env-vars OPENAI_API_KEY=sk-...,PINECONE_API_KEY=...
```

## Pinecone Configuration

### Index Setup

- **Name**: `study-companion`
- **Dimensions**: 1536 (OpenAI text-embedding-3-small)
- **Metric**: cosine similarity
- **Pod Type**: Starter (free)

### Vector Format

```json
{
  "id": "S001_T001_chunk1",
  "values": [0.123, -0.456, ...],  // 1536-dim embedding
  "metadata": {
    "student_id": "S001",
    "transcript_id": "T001",
    "subject": "Chemistry",
    "topics": ["Ionic bonds", "Electronegativity"],
    "date": "2025-10-28T10:00:00Z",
    "chunk_text": "Today we covered ionic bonds...",
    "tutor_notes": "Student struggled with polarity"
  }
}
```

## Testing Infrastructure

### Local Testing

- **Firebase Emulator Suite**: Local Auth, Firestore, Functions
- **DevTools**: Network/Performance monitoring
- **Manual testing**: End-to-end flows in browser

### Test Accounts (Mock Data)

```
ava.johnson@example.com    / password (Chemistry, high engagement)
marcus.lee@example.com     / password (Algebra, low engagement)
priya.sharma@example.com   / password (Physics, completed goal)
jordan.taylor@example.com  / password (Geometry, new student)
sofia.martinez@example.com / password (Spanish, completed goal)
```

## Cost Estimation (30 days)

| Service          | Usage                 | Cost           |
| ---------------- | --------------------- | -------------- |
| Firebase Hosting | 10GB transfer         | $0.15          |
| Firebase Auth    | 5 users               | Free           |
| Cloud Firestore  | 50K reads, 10K writes | $0.36          |
| Cloud Storage    | 1GB                   | $0.02          |
| Cloud Functions  | 100K invocations      | $0.40          |
| Cloud Run        | 10K requests, 1GB RAM | $1.00          |
| Pinecone         | Free tier             | $0             |
| OpenAI           | ~50K tokens/day       | $30.00         |
| SendGrid         | 100 emails/day        | Free           |
| **Total**        |                       | **~$32/month** |

**Note**: Pinecone free tier covers this project. OpenAI is dominant cost. Scales to ~$200-300/month at 1000 active users.

## Performance Optimization Checklist

- [ ] Firestore listeners only on visible components
- [ ] Firebase SDK lazy-loaded in frontend
- [ ] Cloud Run CPU optimized (2 CPU for LLM tasks)
- [ ] Pinecone query results cached (same query repeated?)
- [ ] Conversation history paginated (don't load 500 messages)
- [ ] Images optimized before upload to Storage
- [ ] API responses gzipped

## Security Checklist

- [ ] All .env files in .gitignore
- [ ] Firestore rules restrict cross-student access
- [ ] Cloud Run validates Firebase tokens
- [ ] Pinecone queries filtered by student_id
- [ ] Email addresses not logged in console
- [ ] HTTPS enforced on Firebase Hosting
- [ ] CORS headers set on Cloud Run

## Monitoring & Logging

### Firebase Console

- Authentication: Monitor new users, failed logins
- Firestore: Monitor reads/writes, costs
- Cloud Functions: Monitor invocations, errors, duration
- Storage: Monitor upload/download traffic

### Cloud Run Console

- Monitor request latency (target: <2s)
- Monitor error rates
- Monitor memory usage

### OpenAI Usage

- Monitor token consumption (cost tracking)
- Monitor error rates (hallucinations, parsing failures)

---

**Last Updated**: November 6, 2025
