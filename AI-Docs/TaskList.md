# AI Study Companion - 48-Hour Sprint Task Breakdown (Firebase Edition)

**Status**: ✅ Firebase Architecture Ready  
**Total Tasks**: 65+ subtasks across 9 phases  
**Tech Stack**: Firebase + Node.js + React  
**Tracking**: Use TODO list in Cursor to track progress

---

## 📋 PHASE SUMMARY

```
Phase 0 (0-3h)   : Firebase Setup & Auth          [10 tasks]
Phase 1 (3-7h)   : Mock Data & Cloud Storage      [6 tasks]
Phase 2 (7-13h)  : Pinecone RAG Pipeline          [6 tasks]
Phase 3 (13-22h) : Chat Agent (Cloud Run)         [8 tasks]
Phase 4 (22-30h) : Quiz Generator                 [7 tasks]
Phase 5 (30-38h) : Dashboard (Real-time)          [8 tasks]
Phase 6 (38-42h) : Recommendations (Cloud Func)   [6 tasks]
Phase 7 (42-46h) : Nudge System (Scheduled)       [7 tasks]
Phase 8 (46-48h) : Integration & Testing          [8 tasks]
Phase 9 (48h+)   : Deployment & Docs              [6 tasks]
```

---

## 🚀 QUICK START

### Before Hour 0 (Preparation)

- [ ] Install Node.js 18+ (`node -v`)
- [ ] Install Firebase CLI: `npm install -g firebase-tools`
- [ ] Login to Firebase: `firebase login`
- [ ] Create Firebase project via console: https://console.firebase.google.com
- [ ] Get API keys:
  - OpenAI API key: https://platform.openai.com/api-keys
  - SendGrid API key: https://app.sendgrid.com/settings/api_keys
  - Pinecone API key: https://app.pinecone.io
- [ ] Have this task list open alongside code editor

### Mark Tasks as Complete

- Use checkboxes to track progress
- Commit to Git every 4-6 hours
- Test each feature before moving to next phase

---

## 📊 PHASE BREAKDOWN

### Phase 0: Firebase Setup & Authentication (Hours 0-3)

**Goal**: Initialize Firebase project with authentication

- [ ] **Create Firebase Project**

  - [ ] Go to https://console.firebase.google.com
  - [ ] Create new project: "AI Study Companion"
  - [ ] Enable Google Analytics (optional)
  - [ ] Enable Blaze (pay-as-you-go) plan for Cloud Functions
  - [ ] Note Project ID for later use

- [ ] **Initialize Frontend (React + Vite)**

  - [ ] Run: `npm create vite@latest frontend -- --template react`
  - [ ] `cd frontend && npm install`
  - [ ] Install Firebase SDK: `npm install firebase`
  - [ ] Install dependencies: `npm install react-router-dom recharts`
  - [ ] Install Tailwind CSS: `npm install -D tailwindcss postcss autoprefixer`
  - [ ] Run: `npx tailwindcss init -p`
  - [ ] Configure Tailwind in `tailwind.config.js`
  - [ ] Test: `npm run dev` (should run on localhost:5173)

- [ ] **Initialize Firebase CLI in Project**

  - [ ] Run: `firebase init` in project root
  - [ ] Select: Hosting, Functions, Firestore, Storage
  - [ ] Choose "Use existing project" → select your project
  - [ ] Firestore rules: Use default for now (will update later)
  - [ ] Functions language: JavaScript
  - [ ] Functions directory: `functions`
  - [ ] Install dependencies: Yes
  - [ ] Hosting directory: `frontend/dist`
  - [ ] Configure as SPA: Yes
  - [ ] Set up automatic builds: No
  - [ ] Verify: `firebase.json` and `.firebaserc` created

- [ ] **Configure Firebase in Frontend**

  - [ ] Create `frontend/src/firebase.js`
  - [ ] Add Firebase config (from Firebase Console → Project Settings)
  - [ ] Initialize Firebase app, auth, and firestore
  - [ ] Test: Import in `App.jsx`, verify no errors

- [ ] **Set Up Firebase Authentication**

  - [ ] Enable Email/Password auth in Firebase Console (Authentication → Sign-in method)
  - [ ] Optional: Enable Google Sign-In (if time permits)
  - [ ] Create `frontend/src/pages/Login.jsx` with login form
  - [ ] Create `frontend/src/pages/Register.jsx` with registration form
  - [ ] Implement `createUserWithEmailAndPassword` in Register
  - [ ] Implement `signInWithEmailAndPassword` in Login
  - [ ] Test: Register new user, verify appears in Firebase Console

- [ ] **Create Auth Context (Frontend)**

  - [ ] Create `frontend/src/contexts/AuthContext.jsx`
  - [ ] Use `onAuthStateChanged` to track auth state
  - [ ] Provide `currentUser`, `login`, `register`, `logout` functions
  - [ ] Wrap `App.jsx` with `AuthProvider`
  - [ ] Test: Login persists on page refresh

- [ ] **Create Firestore Database Structure**

  - [ ] Create Firestore database in Firebase Console (Start in production mode)
  - [ ] Create collections (empty for now):
    - `users`
    - `students`
    - `goals`
    - `session_transcripts`
    - `conversations`
    - `quizzes`
    - `quiz_results`
    - `recommendations`
    - `nudge_logs`
  - [ ] Test: Verify collections visible in Firestore Console

- [ ] **Implement Auth Cloud Function Trigger**

  - [ ] Create `functions/src/auth.js`
  - [ ] Implement `onCreate` trigger:
    - Triggered when new user registers
    - Creates user document in `users` collection
    - Creates student profile in `students` collection
  - [ ] Test locally: `firebase emulators:start`
  - [ ] Register test user, verify documents created

- [ ] **Configure Firestore Security Rules (Basic)**

  - [ ] Edit `firestore.rules`
  - [ ] Add rule: Users can read/write own data only
  - [ ] Add rule: Students can read/write own student profile
  - [ ] Deploy rules: `firebase deploy --only firestore:rules`
  - [ ] Test: Try accessing another user's data (should fail)

- [ ] **Set Up Environment Variables**
  - [ ] Create `frontend/.env.local`:
    ```
    VITE_FIREBASE_API_KEY=...
    VITE_FIREBASE_AUTH_DOMAIN=...
    VITE_FIREBASE_PROJECT_ID=...
    VITE_FIREBASE_STORAGE_BUCKET=...
    VITE_FIREBASE_MESSAGING_SENDER_ID=...
    VITE_FIREBASE_APP_ID=...
    ```
  - [ ] Create `functions/.env`:
    ```
    OPENAI_API_KEY=sk-...
    SENDGRID_API_KEY=SG...
    PINECONE_API_KEY=...
    PINECONE_INDEX=study-companion
    ```
  - [ ] Add `.env` and `.env.local` to `.gitignore`
  - [ ] Test: Environment variables load correctly

---

### Phase 1: Mock Data & Cloud Storage (Hours 3-7)

**Goal**: Create realistic test data and store in Firebase

- [ ] **Generate 5 Student Profiles (JSON)**

  - [ ] Create `/data/students.json` with:
    - Ava Johnson (ava.johnson@example.com, high engagement, Chemistry)
    - Marcus Lee (marcus.lee@example.com, low engagement, Algebra)
    - Priya Sharma (priya.sharma@example.com, completed goal, Physics)
    - Jordan Taylor (jordan.taylor@example.com, new student, Geometry)
    - Sofia Martinez (sofia.martinez@example.com, completed goal, Spanish)
  - [ ] Each profile includes: student_id, name, email, grade, subjects
  - [ ] Test: Load JSON, verify structure

- [ ] **Generate 15 Session Transcripts**

  - [ ] Create `/data/transcripts/` folder
  - [ ] Generate 3 transcripts per student (~400 words each):
    - Ava: `ava_chemistry_01.json`, `ava_chemistry_02.json`, `ava_chemistry_03.json`
    - Marcus: `marcus_algebra_01.json`, `marcus_algebra_02.json`, `marcus_english_01.json`
    - Priya: `priya_chemistry_01.json`, `priya_physics_01.json`, `priya_physics_02.json`
    - Jordan: `jordan_geometry_01.json`, `jordan_geometry_02.json`, `jordan_geometry_03.json`
    - Sofia: `sofia_spanish_01.json`, `sofia_spanish_02.json`, `sofia_history_01.json`
  - [ ] Each JSON includes: transcript_id, student_id, subject, topics[], date, transcript_text, tutor_notes
  - [ ] Test: Load each file, verify content quality

- [ ] **Upload Transcripts to Cloud Storage**

  - [ ] Install Firebase Admin SDK: `cd functions && npm install firebase-admin`
  - [ ] Create script: `functions/src/uploadMockData.js`
  - [ ] Upload all transcripts to `gs://[bucket]/transcripts/`
  - [ ] Run script: `node functions/src/uploadMockData.js`
  - [ ] Verify: Files appear in Firebase Storage Console

- [ ] **Populate Firestore with Mock Students**

  - [ ] Extend `uploadMockData.js` script
  - [ ] Create documents in `students` collection from `students.json`
  - [ ] Create user accounts via Firebase Admin (or manually in console)
  - [ ] Test: Query Firestore, verify 5 students exist

- [ ] **Create Mock Goals in Firestore**

  - [ ] For each student, create 1-2 goals in `goals` collection
  - [ ] Ava: Chemistry goal (75% progress, active)
  - [ ] Marcus: Algebra goal (40% progress, active)
  - [ ] Priya: Physics goal (100% complete), new Chemistry goal (20% active)
  - [ ] Jordan: Geometry goal (10% progress, active)
  - [ ] Sofia: Spanish goal (100% complete), History goal (30% active)
  - [ ] Test: Query goals by student_id, verify data

- [ ] **Link Transcripts to Students in Firestore**
  - [ ] Create documents in `session_transcripts` collection
  - [ ] Each document references Cloud Storage URL + student_id
  - [ ] Include: transcript_id, student_id, subject, topics[], date, storage_url
  - [ ] Test: Query transcripts by student, verify 3 per student

---

### Phase 2: Pinecone RAG Pipeline (Hours 7-13)

**Goal**: Set up vector search with Pinecone for semantic retrieval

- [ ] **Set Up Pinecone Account & Index**

  - [ ] Create account at https://app.pinecone.io
  - [ ] Create new index:
    - Name: `study-companion`
    - Dimensions: 1536 (OpenAI text-embedding-3-small)
    - Metric: cosine
    - Pod type: Starter (free tier)
  - [ ] Copy API key and index name
  - [ ] Add to `functions/.env` and `cloud-run/.env`

- [ ] **Create Embedding Service (Cloud Functions)**

  - [ ] Create `functions/src/services/embeddings.js`
  - [ ] Install OpenAI SDK: `npm install openai`
  - [ ] Implement `getEmbedding(text)` function
  - [ ] Use OpenAI `text-embedding-3-small` model
  - [ ] Test: Generate embedding for sample text, verify 1536-dim vector

- [ ] **Embed and Store Transcripts in Pinecone**

  - [ ] Create `functions/src/services/pinecone.js`
  - [ ] Install Pinecone SDK: `npm install @pinecone-database/pinecone`
  - [ ] For each transcript in Firestore:
    - Download from Cloud Storage
    - Chunk into 400-word segments
    - Generate embedding for each chunk
    - Upsert to Pinecone with metadata: student_id, transcript_id, subject, topics
  - [ ] Run script: `node functions/src/embedTranscripts.js`
  - [ ] Verify: Pinecone dashboard shows ~45 vectors (15 transcripts × 3 chunks avg)

- [ ] **Implement Semantic Search Function**

  - [ ] Create `retrieveContext(query, student_id, topK=5)` in `pinecone.js`
  - [ ] Embed user query with OpenAI
  - [ ] Query Pinecone with filter: `student_id == {student_id}`
  - [ ] Return top 5 relevant chunks with metadata
  - [ ] Test: Query "What did we learn about ionic bonds?" for Ava → Should return chemistry transcripts

- [ ] **Test RAG Retrieval Quality**

  - [ ] Test query 1: "ionic bonds" for Ava → Returns chemistry chunks
  - [ ] Test query 2: "quadratic equations" for Marcus → Returns algebra chunks
  - [ ] Test query 3: "geometry proofs" for Jordan → Returns geometry chunks
  - [ ] Test cross-student filter: Query for Ava doesn't return Marcus's data
  - [ ] Verify: Relevance score ≥0.7 for top results

- [ ] **Create Firestore Trigger for New Transcripts**
  - [ ] Create Cloud Function: `functions/src/transcriptProcessor.js`
  - [ ] Trigger: `onCreate` for `session_transcripts` collection
  - [ ] On new transcript: Embed and upsert to Pinecone automatically
  - [ ] Test: Add new transcript to Firestore → Verify appears in Pinecone
  - [ ] Deploy: `firebase deploy --only functions:processNewTranscript`

---

### Phase 3: Chat Agent (Cloud Run Service) (Hours 13-22)

**Goal**: Build conversational AI with RAG context and human handoff

- [ ] **Initialize Cloud Run Service**

  - [ ] Create `cloud-run/` directory
  - [ ] Run: `npm init -y`
  - [ ] Install dependencies:
    ```bash
    npm install express dotenv @langchain/openai @langchain/core
    npm install @pinecone-database/pinecone firebase-admin openai
    npm install cors helmet
    ```
  - [ ] Create `cloud-run/src/index.js` (Express server)
  - [ ] Create basic `/health` endpoint
  - [ ] Test locally: `node src/index.js` on port 8080

- [ ] **Create Dockerfile for Cloud Run**

  - [ ] Create `cloud-run/Dockerfile`:
    ```dockerfile
    FROM node:18-slim
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci --only=production
    COPY . .
    CMD ["node", "src/index.js"]
    ```
  - [ ] Create `.dockerignore`: exclude `node_modules`, `.env`
  - [ ] Test: Build Docker image locally, verify runs

- [ ] **Implement Firebase Token Validation Middleware**

  - [ ] Create `cloud-run/src/middleware/auth.js`
  - [ ] Use Firebase Admin SDK to verify ID tokens
  - [ ] Extract `uid` from token and attach to `req.user`
  - [ ] Return 401 if token invalid or expired
  - [ ] Test: Send request with/without token, verify behavior

- [ ] **Create Chat Service with RAG**

  - [ ] Create `cloud-run/src/services/chatService.js`
  - [ ] Implement `handleChatMessage(studentId, message, conversationId)`:
    1. Retrieve student profile from Firestore
    2. Get current goals from Firestore
    3. Get recent conversation history (last 10 messages)
    4. Embed user message with OpenAI
    5. Query Pinecone for relevant context (top 5 chunks)
    6. Format LangChain prompt with all context
    7. Generate response with GPT-4o
    8. Detect handoff triggers
    9. Save to Firestore conversation history
  - [ ] Test: Send chat message, verify response includes relevant context

- [ ] **Implement Handoff Detection Logic**

  - [ ] Create `detectHandoffTrigger(userMessage, aiResponse, history)` function
  - [ ] Check for keywords: "book session", "need tutor", "schedule"
  - [ ] Check for frustration: 3+ "confused" or "don't understand" in recent history
  - [ ] Check for low confidence: Pinecone relevance score <0.6
  - [ ] Return `should_handoff: true/false`
  - [ ] Test: Trigger each handoff condition, verify detection

- [ ] **Create Chat API Endpoint**

  - [ ] Create `POST /api/chat` in `cloud-run/src/index.js`
  - [ ] Validate Firebase token (use middleware)
  - [ ] Extract student_id, conversation_id, message from body
  - [ ] Call `chatService.handleChatMessage()`
  - [ ] Return JSON: `{ response, should_handoff, confidence_score, context_used }`
  - [ ] Test: Send POST request with auth token, verify response

- [ ] **Build Chat UI Component (Frontend)**

  - [ ] Create `frontend/src/pages/Chat.jsx`
  - [ ] Display: Message bubbles (user left, AI right), timestamps
  - [ ] Input: Text field with send button
  - [ ] Loading state: "AI is thinking..." spinner
  - [ ] On send: Call Cloud Run `/api/chat` endpoint
  - [ ] Display AI response in real-time
  - [ ] Show "Book Session" button if `should_handoff: true`
  - [ ] Test: Send messages, receive responses, see loading state

- [ ] **Test Chat Flow End-to-End**
  - [ ] Test 1: Ask "What did we learn about ionic bonds?" → Returns chemistry context
  - [ ] Test 2: Ask "I need help from my tutor" → Triggers handoff
  - [ ] Test 3: Ask complex multi-step question → Suggests booking session
  - [ ] Test 4: Verify conversation history saved to Firestore
  - [ ] Test 5: Verify real-time updates in Firestore console

---

### Phase 4: Quiz Generator (Cloud Run) (Hours 22-30)

**Goal**: Generate adaptive quizzes with auto-goal-completion

- [ ] **Create Quiz Generation Service**

  - [ ] Create `cloud-run/src/services/quizService.js`
  - [ ] Implement `generateQuiz(studentId, subject, numQuestions)`:
    1. Get student profile from Firestore
    2. Get recent transcripts for subject
    3. Get weak concepts from past quiz results
    4. Determine difficulty based on avg score
    5. Generate quiz via GPT-4o with structured output
    6. Store quiz in Firestore `quizzes` collection
  - [ ] Test: Generate quiz for Chemistry, verify 5 questions returned

- [ ] **Create Quiz Submission & Grading Service**

  - [ ] Implement `submitQuiz(quizId, studentId, answers)`:
    1. Get quiz from Firestore
    2. Grade each answer (compare to correct_answer)
    3. Calculate score (% correct)
    4. Save to `quiz_results` collection
    5. If score ≥85%: Auto-complete goal, trigger recommendations
  - [ ] Test: Submit answers, verify score calculation

- [ ] **Create Quiz API Endpoints**

  - [ ] `POST /api/quiz/generate` → Generate new quiz
  - [ ] `POST /api/quiz/submit` → Submit answers and get results
  - [ ] `GET /api/quiz/:quizId` → Get quiz questions
  - [ ] Protect all endpoints with Firebase auth middleware
  - [ ] Test: Call each endpoint, verify responses

- [ ] **Build Quiz UI (Frontend)**

  - [ ] Create `frontend/src/pages/Quiz.jsx`
  - [ ] Display: Quiz title, subject, difficulty
  - [ ] Show questions one-by-one or all at once (user choice)
  - [ ] Radio buttons for multiple choice options
  - [ ] "Submit Quiz" button
  - [ ] On submit: Call `/api/quiz/submit`, show results
  - [ ] Display: Score, correct/incorrect per question, explanations
  - [ ] Test: Take quiz, submit, see results

- [ ] **Implement Auto-Goal-Completion Logic**

  - [ ] In `quizService.submitQuiz()`: If score ≥85%:
    - Query active goals for this subject
    - Update goal: `status: 'completed'`, `progress: 1.0`, `completed: Timestamp`
    - Create event in `events` collection to trigger recommendation function
  - [ ] Test: Score 90% on Chemistry quiz → Goal auto-completes

- [ ] **Add Celebration UI for Goal Completion**

  - [ ] Create `frontend/src/components/GoalCompletionModal.jsx`
  - [ ] Show confetti animation (use `react-confetti` or CSS)
  - [ ] Display: "🎉 Goal Completed! You scored 90%!"
  - [ ] Show personalized message
  - [ ] "See Recommendations" button
  - [ ] Test: Complete goal, verify modal appears

- [ ] **Test Quiz Flow End-to-End**
  - [ ] Generate Chemistry quiz for Ava
  - [ ] Answer 5/5 questions correctly
  - [ ] Submit quiz → Score 100%
  - [ ] Verify goal auto-completes in Firestore
  - [ ] Verify celebration modal appears
  - [ ] Verify recommendations trigger (Phase 6)

---

### Phase 5: Progress Dashboard (Real-time) (Hours 30-38)

**Goal**: Build dashboard with Firestore real-time listeners

- [ ] **Create Dashboard Layout**

  - [ ] Create `frontend/src/pages/Dashboard.jsx`
  - [ ] Layout: Header, 3 main sections (Goals, Analytics, Activity)
  - [ ] Use CSS Grid or Flexbox for responsive design
  - [ ] Test: Dashboard loads, layout looks good on desktop

- [ ] **Implement Real-time Goal Progress Cards**

  - [ ] Use Firestore `onSnapshot()` listener for `goals` collection
  - [ ] Filter: `where('student_id', '==', currentUser.uid)`
  - [ ] Create `GoalCard` component: Subject, progress bar, days until target
  - [ ] "Continue Learning" button → Navigate to Chat or Quiz
  - [ ] Test: Update goal progress in Firestore → Card updates instantly

- [ ] **Build Quiz Performance Chart**

  - [ ] Use Firestore listener for `quiz_results` collection
  - [ ] Filter: Last 10 quiz results for current student
  - [ ] Use Recharts `LineChart` component
  - [ ] X-axis: Date, Y-axis: Score (%)
  - [ ] Test: Take new quiz → Chart updates with new data point

- [ ] **Create Activity Feed**

  - [ ] Display: Recent quiz results, session reminders, achievements
  - [ ] Use Firestore listener for multiple collections
  - [ ] Sort by timestamp (most recent first)
  - [ ] Show: "You scored 85% on Chemistry quiz" with timestamp
  - [ ] Test: Activity feed updates in real-time

- [ ] **Add Session Frequency Heatmap (Optional)**

  - [ ] Use calendar heatmap library (e.g., `react-calendar-heatmap`)
  - [ ] Data: Session count per day over last 90 days
  - [ ] Color: Green intensity based on session count
  - [ ] Test: Heatmap displays correctly

- [ ] **Implement Multi-Goal Tracking**

  - [ ] Display active and completed goals separately
  - [ ] Show: "3 goals in progress, 2 completed"
  - [ ] Progress summary: Overall completion percentage
  - [ ] Test: Multiple goals display correctly

- [ ] **Add Loading & Empty States**

  - [ ] Show spinner while loading data
  - [ ] Empty state: "No goals yet. Start learning!"
  - [ ] Error state: "Failed to load data. Try refreshing."
  - [ ] Test: All states display correctly

- [ ] **Test Dashboard Real-time Updates**
  - [ ] Open dashboard in browser
  - [ ] Complete quiz in another tab → Dashboard updates instantly
  - [ ] Update goal progress in Firestore console → Card updates
  - [ ] Verify: All updates happen within <1s (no page refresh needed)

---

### Phase 6: Recommendations Engine (Cloud Functions) (Hours 38-42)

**Goal**: Generate personalized recommendations on goal completion

- [ ] **Create Recommendation Cloud Function**

  - [ ] Create `functions/src/recommendations.js`
  - [ ] Implement Firestore trigger: `onUpdate` for `goals/{goalId}`
  - [ ] Trigger only when: `before.status !== 'completed' && after.status === 'completed'`
  - [ ] Call OpenAI GPT-4o to generate 3 subject recommendations
  - [ ] Store in `recommendations` collection
  - [ ] Test locally: `firebase emulators:start`, complete goal, verify function triggered

- [ ] **Implement LLM Recommendation Prompt**

  - [ ] Create detailed prompt template:
    - Student profile (name, grade, completed subjects)
    - Current goals
    - Learning history summary
    - Request 3 personalized subject recommendations
  - [ ] Use structured output (JSON) from GPT-4o
  - [ ] Each recommendation: subject, reason, related_skills, difficulty, college_value, icon
  - [ ] Test: Generate recommendations, verify JSON structure

- [ ] **Filter Out Already-Completed Subjects**

  - [ ] Get all completed and active goals for student
  - [ ] Extract subject names
  - [ ] Post-process LLM output: Remove any subjects already in student's profile
  - [ ] Ensure 3 unique recommendations
  - [ ] Test: Verify no duplicate subjects recommended

- [ ] **Store Recommendations in Firestore**

  - [ ] Create document in `recommendations` collection:
    - student_id, completed_goal_id, recommendations[], reasoning, generated_at, viewed, accepted[]
  - [ ] Test: Verify document created after goal completion

- [ ] **Build Recommendations UI (Frontend)**

  - [ ] Create `frontend/src/pages/Recommendations.jsx`
  - [ ] Use Firestore listener: `where('student_id', '==', uid).orderBy('generated_at', 'desc').limit(1)`
  - [ ] Display: 3 recommendation cards
  - [ ] Each card: Subject name, icon, reason, skills, difficulty badge, college value
  - [ ] "Start Learning" button → Creates new goal in Firestore
  - [ ] Test: Recommendations appear immediately after goal completion

- [ ] **Implement "Start Learning" Action**
  - [ ] On click: Create new goal document in Firestore
  - [ ] Goal: `status: 'active'`, `progress: 0`, `started: now`, `subject: selected_subject`
  - [ ] Update recommendation: Add selected subject to `accepted[]` array
  - [ ] Navigate to Dashboard
  - [ ] Test: Click "Start Learning", verify new goal created

---

### Phase 7: Nudge System (Scheduled Cloud Functions) (Hours 42-46)

**Goal**: Implement smart email nudges with Cloud Scheduler

- [ ] **Install SendGrid in Cloud Functions**

  - [ ] `cd functions && npm install @sendgrid/mail`
  - [ ] Add SendGrid API key to `functions/.env`
  - [ ] Test: Send test email via Node.js script

- [ ] **Create Scheduled Nudge Function**

  - [ ] Create `functions/src/scheduledNudges.js`
  - [ ] Use `functions.pubsub.schedule('every 1 hours').onRun()`
  - [ ] Function checks for 3 nudge types:
    1. Day 7 low engagement (<3 sessions in 7 days)
    2. Inactivity (no chat in 3 days)
    3. Goal near completion (progress ≥85%)
  - [ ] Test locally: Manually call function, verify logic

- [ ] **Implement Day 7 Nudge Logic**

  - [ ] Query Firestore for students enrolled 7 days ago
  - [ ] Count sessions in last 7 days
  - [ ] If <3 sessions: Send nudge email via SendGrid
  - [ ] Log nudge in `nudge_logs` collection (prevent duplicates)
  - [ ] Test: Manually adjust enrollment date, trigger nudge

- [ ] **Implement Inactivity Nudge Logic**

  - [ ] Query `conversations` collection for last_updated timestamp
  - [ ] If ≥3 days since last activity: Send nudge
  - [ ] Check `nudge_logs` to avoid duplicate nudges within 3 days
  - [ ] Test: Set last_updated to 4 days ago, verify nudge sent

- [ ] **Implement Goal Near-Completion Nudge**

  - [ ] Query active goals with `progress ≥ 0.85`
  - [ ] For each: Send "You're almost there!" email
  - [ ] Log in `nudge_logs` (prevent duplicate per goal)
  - [ ] Test: Set goal progress to 90%, verify nudge sent

- [ ] **Create Email Templates**

  - [ ] Day 7 nudge: Motivational message + "Continue Learning" CTA
  - [ ] Inactivity nudge: "Your AI companion misses you" + "Start Chatting" CTA
  - [ ] Goal near-complete: "Finish strong!" + "Complete Your Goal" CTA
  - [ ] Use HTML emails with inline CSS
  - [ ] Test: Verify emails render correctly in Gmail

- [ ] **Deploy Scheduled Function**
  - [ ] Deploy: `firebase deploy --only functions:checkAndSendNudges`
  - [ ] Verify: Cloud Scheduler job created automatically
  - [ ] Check logs: `firebase functions:log`
  - [ ] Test: Wait 1 hour, verify function runs

---

### Phase 8: Integration & Testing (Hours 46-48)

**Goal**: Test all features end-to-end

- [ ] **Test Full Auth Flow**

  - [ ] Register new user → Verify user created in Firebase Auth
  - [ ] Verify student profile created in Firestore (`users` and `students` collections)
  - [ ] Login with credentials → JWT token received
  - [ ] Token persists on page refresh
  - [ ] Logout → Token cleared, redirected to login
  - [ ] Test: Full auth cycle works

- [ ] **Test Full Chat Flow**

  - [ ] Login as Ava (ava.johnson@example.com)
  - [ ] Navigate to Chat page
  - [ ] Send message: "What did we learn about ionic bonds?"
  - [ ] Verify: AI response includes context from chemistry transcripts
  - [ ] Send: "I need help from my tutor"
  - [ ] Verify: Handoff triggered, "Book Session" button shown
  - [ ] Test: Full chat experience works

- [ ] **Test Full Quiz Flow**

  - [ ] Navigate to Quiz page
  - [ ] Generate Chemistry quiz
  - [ ] Answer all 5 questions correctly
  - [ ] Submit quiz → Score 100%
  - [ ] Verify: Goal auto-completes in Firestore
  - [ ] Verify: Celebration modal appears
  - [ ] Verify: Recommendations generated within 2s
  - [ ] Test: Full quiz experience works

- [ ] **Test Dashboard Real-time Updates**

  - [ ] Open Dashboard in Browser Tab 1
  - [ ] Open Firestore Console in Browser Tab 2
  - [ ] Update goal progress in Firestore Console
  - [ ] Verify: Dashboard updates within <1s (no refresh)
  - [ ] Submit quiz in Tab 1
  - [ ] Verify: Dashboard updates instantly with new quiz result
  - [ ] Test: Real-time updates work

- [ ] **Test Recommendation Flow**

  - [ ] Complete goal by scoring 85%+ on quiz
  - [ ] Verify: Recommendations appear immediately on Recommendations page
  - [ ] Click "Start Learning" on one recommendation
  - [ ] Verify: New goal created in Firestore
  - [ ] Verify: Dashboard shows new active goal
  - [ ] Test: Recommendation flow works

- [ ] **Test Nudge System**

  - [ ] Manually trigger Day 7 nudge: Adjust enrollment date to 7 days ago + <3 sessions
  - [ ] Verify: Email sent to test inbox
  - [ ] Verify: Nudge logged in `nudge_logs` collection
  - [ ] Attempt to trigger again → Should not send duplicate
  - [ ] Test: Nudge system works correctly

- [ ] **Performance Testing**

  - [ ] Chat response latency: <2s (P95) → Use browser DevTools Network tab
  - [ ] Quiz generation: <3s
  - [ ] Dashboard load: <1s
  - [ ] Recommendation fetch: <2s
  - [ ] Test: All within acceptable latency

- [ ] **Error Handling Testing**
  - [ ] Network error: Disconnect WiFi → Verify graceful error message
  - [ ] Invalid token: Use expired token → Redirect to login
  - [ ] LLM timeout: Mock timeout → Show "Let me think..." message
  - [ ] Firestore error: Mock error → User-friendly message shown
  - [ ] Test: All error cases handled gracefully

---

### Phase 9: Deployment & Documentation (Hours 48+)

**Goal**: Deploy to production and write docs

- [ ] **Deploy Frontend to Firebase Hosting**

  - [ ] Build frontend: `cd frontend && npm run build`
  - [ ] Deploy: `firebase deploy --only hosting`
  - [ ] Test: Open live URL, verify app loads

- [ ] **Deploy Cloud Functions**

  - [ ] Deploy: `firebase deploy --only functions`
  - [ ] Verify: All functions deployed successfully
  - [ ] Check logs: `firebase functions:log`
  - [ ] Test: Trigger each function, verify works

- [ ] **Deploy Cloud Run Service**

  - [ ] Build Docker image: `cd cloud-run && gcloud builds submit --tag gcr.io/PROJECT_ID/ai-service`
  - [ ] Deploy: `gcloud run deploy ai-service --image gcr.io/PROJECT_ID/ai-service --platform managed --region us-central1 --allow-unauthenticated`
  - [ ] Note: Use `--no-allow-unauthenticated` if you want to restrict access
  - [ ] Copy Cloud Run URL
  - [ ] Update frontend: Add Cloud Run URL to `frontend/.env.local` as `VITE_CLOUD_RUN_URL`
  - [ ] Rebuild and redeploy frontend
  - [ ] Test: API endpoints work from live frontend

- [ ] **Write README.md**

  - [ ] Project overview (2-3 paragraphs)
  - [ ] Tech stack list
  - [ ] Setup instructions (prerequisites, installation, configuration)
  - [ ] Running locally (frontend, functions, cloud-run)
  - [ ] Deployment guide
  - [ ] Features list
  - [ ] Test accounts
  - [ ] Test: README clear and complete

- [ ] **Write API Documentation**

  - [ ] Create `docs/API.md`
  - [ ] List all Cloud Run endpoints:
    - `POST /api/chat` - Chat with AI
    - `POST /api/quiz/generate` - Generate quiz
    - `POST /api/quiz/submit` - Submit quiz
    - `GET /api/quiz/:quizId` - Get quiz
  - [ ] For each: Method, path, auth, request body, response body, error codes
  - [ ] Include example cURL commands
  - [ ] Test: All endpoints documented

- [ ] **Write Architecture Documentation**
  - [ ] Create `docs/ARCHITECTURE.md`
  - [ ] System design diagram (text-based or use draw.io)
  - [ ] Data flow: Frontend → Firebase Auth → Cloud Run → Pinecone → OpenAI
  - [ ] Firestore schema (all collections + key fields)
  - [ ] Cloud Functions list + triggers
  - [ ] Test: Architecture clear and comprehensive

---

## ✅ SUCCESS CHECKLIST

### By Hour 48, You Should Have:

**Technical Deliverables**

- ✅ Firebase project set up (Auth, Firestore, Storage, Functions, Hosting)
- ✅ Cloud Run service deployed (AI chat, quiz generation)
- ✅ Pinecone vector database integrated
- ✅ 6 core features fully implemented
- ✅ Real-time dashboard with Firestore listeners
- ✅ All API endpoints responding in <2s
- ✅ SendGrid email integration working
- ✅ Scheduled Cloud Functions for nudges
- ✅ No critical bugs in core flows

**Feature Completeness**

- ✅ Authentication (Firebase Auth with email/password)
- ✅ Chat with RAG context retrieval (Cloud Run + Pinecone)
- ✅ Adaptive quizzes with auto-goal-completion at 85%
- ✅ Progress dashboard with real-time updates (Firestore listeners)
- ✅ Personalized recommendations (Cloud Functions + LLM)
- ✅ Smart email nudges (Cloud Scheduler + SendGrid)

**Data & Testing**

- ✅ 5 test students with realistic data
- ✅ 15 session transcripts in Cloud Storage
- ✅ RAG retrieval with ≥70% accuracy
- ✅ All core flows tested end-to-end
- ✅ Performance within targets (<2s chat, <3s quiz, <1s dashboard)

**Documentation**

- ✅ README.md (setup & overview)
- ✅ API.md (all endpoints)
- ✅ ARCHITECTURE.md (system design + Firestore schema)

**Business Value**

- ✅ Clear path to Nerdy integration (Phase 2)
- ✅ Cost projections documented (~$100/month for MVP)
- ✅ MVP ready for stakeholder review

---

## 🎯 KEY METRICS TO TRACK

| Metric                    | Target     | How to Measure                       |
| ------------------------- | ---------- | ------------------------------------ |
| Chat latency (P95)        | <2s        | Chrome DevTools Network tab          |
| Quiz generation time      | <3s        | Time from request to response        |
| Dashboard load            | <1s        | Chrome DevTools Performance tab      |
| RAG accuracy              | ≥70%       | Manual review: 10 test queries       |
| Email delivery            | 100%       | Check inbox + SendGrid dashboard     |
| Real-time update latency  | <1s        | Update Firestore → Dashboard updates |
| Firestore read/write cost | <$1/day    | Firebase Console → Usage tab         |
| Cloud Run cost            | <$0.50/day | GCP Console → Cloud Run billing      |
| Zero critical bugs        | ✅         | All core flows work without errors   |

---

## 💡 PRO TIPS

1. **Use Firebase Emulator Suite**: Develop locally with `firebase emulators:start` (saves costs)
2. **Commit Frequently**: Every 4-6 hours with descriptive messages
3. **Test Early**: Don't wait until the end to test flows
4. **Real-time is Your Friend**: Firestore listeners eliminate need for polling
5. **Monitor Costs**: Check Firebase Console daily to avoid surprises
6. **Use Cloud Run for AI**: Keep Cloud Functions lightweight (fast cold starts)
7. **Cache Embeddings**: Don't re-embed the same text (saves OpenAI costs)
8. **Structured Outputs**: Always use `response_format: { type: "json_object" }` for GPT-4o

---

## 🚨 COMMON PITFALLS TO AVOID

1. **Forgetting to deploy Firestore rules**: Your app will fail with permission errors
2. **Not filtering Pinecone by student_id**: Cross-student data leakage
3. **Hardcoding API keys**: Use environment variables
4. **Not handling auth state on refresh**: User logged out on page reload
5. **Overusing Cloud Functions**: Use Cloud Run for compute-heavy tasks
6. **Not testing scheduled functions**: Use `firebase emulators:start` to test locally
7. **Forgetting to enable Blaze plan**: Cloud Functions won't work on free tier
8. **Not chunking transcripts**: Long transcripts exceed OpenAI token limits

---

## 📚 HELPFUL RESOURCES

- Firebase Docs: https://firebase.google.com/docs
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
- Cloud Run Docs: https://cloud.google.com/run/docs
- Pinecone Docs: https://docs.pinecone.io
- LangChain (Node.js): https://js.langchain.com/docs
- OpenAI API: https://platform.openai.com/docs
- SendGrid API: https://docs.sendgrid.com

---

## 🎉 READY TO START?

### First 3 Tasks to Kick Off:

1. [ ] Create Firebase project in console
2. [ ] Run `firebase init` in project root
3. [ ] Create React app: `npm create vite@latest frontend -- --template react`

**Let's build something amazing in 48 hours! 🚀**

---
