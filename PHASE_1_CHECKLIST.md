# Phase 1: Execution Checklist

## Pre-Execution Checklist ✅

### Prerequisites

- [x] Firebase project created (`study-buddy-28043`)
- [x] Firestore database initialized
- [x] Cloud Storage bucket created
- [x] Frontend deployed to Firebase Hosting
- [x] Memory bank files ready
- [x] Mock data generated
- [x] Upload script ready

### Ready to Execute?

- [x] All 5 student profiles created
- [x] All 15 transcripts created
- [x] `upload-mock-data.js` written and tested
- [x] Documentation complete
- [x] Error handling implemented
- [x] Progress logging added

---

## Execution Steps (Do These Now)

### Step 1: Install Dependencies

```bash
npm install firebase-admin
```

**Status**: [ ] Complete

**Verification**: `npm list firebase-admin` should show v12.0.0 or higher

---

### Step 2: Authenticate with Firebase

**Choose ONE option**:

#### Option A: Application Default Credentials (Recommended)

```bash
gcloud auth application-default login
```

**Status**: [ ] Complete
**Expected**: Browser opens, you log in with your Google account

#### Option B: Service Account Key

1. Go to https://console.firebase.google.com
2. Select `study-buddy-28043` project
3. Click ⚙️ (Project Settings)
4. Click "Service Accounts" tab
5. Click "Generate New Private Key"
6. Save to project root as `firebase-key.json`

**Status**: [ ] Complete
**Verification**: File `firebase-key.json` exists in project root

#### Option C: Environment Variable

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/firebase-key.json"
```

**Status**: [ ] Complete

---

### Step 3: Run Upload Script

```bash
node upload-mock-data.js
```

**Status**: [ ] Complete

**Expected Output** (take a screenshot):

```
🔥 Initializing Firebase Admin SDK...
   Project: study-buddy-28043
   Storage: study-buddy-28043.firebasestorage.app

🚀 Starting mock data upload...

📁 Reading mock data files...
   Found 5 student profiles
   Found 15 transcripts

👥 Creating students...
   ✅ Alex Chen (STU001)
   ✅ Jordan Patel (STU002)
   ✅ Samantha Kim (STU003)
   ✅ Marcus Johnson (STU004)
   ✅ Priya Sharma (STU005)

📚 Creating transcripts...
   ✅ transcripts/STU001/session_STU001_001.json
   ✅ transcripts/STU001/session_STU001_002.json
   ✅ transcripts/STU001/session_STU001_003.json
   ✅ transcripts/STU002/session_STU002_001.json
   ...
   (15 total)

🎯 Creating goals...
   ✅ Created 10 goals

✨ Upload complete!

📊 Summary:
   • Students: 5
   • Transcripts: 15
   • Goals: 10
   • Time: 2.34s

🎉 Data is now available in Firestore!
```

---

## Post-Execution Verification ✓

### Firestore Collections

#### Collection: `students` (5 documents)

Go to https://console.firebase.google.com → Firestore Database → Collection `students`

**Verify each document exists:**

- [ ] STU001 - Alex Chen
- [ ] STU002 - Jordan Patel
- [ ] STU003 - Samantha Kim
- [ ] STU004 - Marcus Johnson
- [ ] STU005 - Priya Sharma

**Sample verification** (click on STU001):

```json
{
  "student_id": "STU001",
  "name": "Alex Chen",
  "grade": 11,
  "email": "alex.chen@example.com",
  "enrollment_date": "2025-10-25T10:00:00Z",
  "goals": ["Master SAT Math: Algebra & Geometry", "Ace Physics: Mechanics"],
  "subjects": ["SAT Math", "Physics"],
  ...
}
```

- [ ] Sample document checked

---

#### Collection: `session_transcripts` (15 documents)

Go to Collection `session_transcripts`

**Verify structure** (click any document, e.g., TXN_STU001_001):

```json
{
  "transcript_id": "TXN_STU001_001",
  "student_id": "STU001",
  "subject": "SAT Math",
  "topic": "Algebra: Quadratic Equations",
  "session_date": "2025-10-25T10:00:00Z",
  "duration_minutes": 45,
  "key_topics": ["Quadratic Equations", "Factoring", "Quadratic Formula", "Discriminant"],
  "storage_url": "transcripts/STU001/session_STU001_001.json",
  ...
}
```

**Query by student** (click "Run query" in Firestore):

- Collection: `session_transcripts`
- Filter: `student_id == "STU001"`
- Expected: 3 documents

- [ ] Filter query works (shows 3 transcripts for STU001)
- [ ] Filter queries work for all students
  - [ ] STU001: 3 transcripts
  - [ ] STU002: 3 transcripts
  - [ ] STU003: 3 transcripts
  - [ ] STU004: 3 transcripts
  - [ ] STU005: 3 transcripts

---

#### Collection: `goals` (10+ documents)

Go to Collection `goals`

**Verify sample** (click any goal document):

```json
{
  "goal_id": "STU001_master_sat_math_algebra_geometry",
  "student_id": "STU001",
  "title": "Master SAT Math: Algebra & Geometry",
  "status": "active",
  "progress_percentage": 45,
  "quiz_scores": [],
  "created_at": "2025-11-06T10:00:00Z",
  ...
}
```

**Query by student** (filter `student_id == "STU001"`):

- Expected: 2 goals
- [ ] Can filter goals by student_id

---

### Cloud Storage

Go to https://console.firebase.google.com → Storage → Browse

**Verify folder structure:**

```
transcripts/
├── STU001/
│   ├── session_STU001_001.json
│   ├── session_STU001_002.json
│   └── session_STU001_003.json
├── STU002/
│   ├── session_STU002_001.json
│   ├── session_STU002_002.json
│   └── session_STU002_003.json
├── STU003/
│   ├── session_STU003_001.json
│   ├── session_STU003_002.json
│   └── session_STU003_003.json
├── STU004/
│   ├── session_STU004_001.json
│   ├── session_STU004_002.json
│   └── session_STU004_003.json
└── STU005/
    ├── session_STU005_001.json
    ├── session_STU005_002.json
    └── session_STU005_003.json
```

- [ ] `transcripts/` folder exists
- [ ] 5 student folders (STU001-STU005) exist
- [ ] Each student folder contains 3 JSON files
- [ ] At least one file is viewable (click to download/preview)

**Total files in Cloud Storage**: 15 ✓

---

## Troubleshooting Checklist

### If "Cannot find module 'firebase-admin'"

- [ ] Run: `npm install firebase-admin`
- [ ] Verify: `npm list firebase-admin`
- [ ] Retry: `node upload-mock-data.js`

### If "GOOGLE_APPLICATION_CREDENTIALS not set"

- [ ] Run: `gcloud auth application-default login`
- [ ] OR set: `export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"`
- [ ] Retry: `node upload-mock-data.js`

### If "Project ID mismatch"

- [ ] Edit: `upload-mock-data.js`
- [ ] Change: `projectId: 'study-buddy-28043'`
- [ ] Verify in Firebase Console
- [ ] Retry: `node upload-mock-data.js`

### If "Permission denied"

- [ ] Go to Firebase Console → Project Settings → Members
- [ ] Verify your account has "Editor" or "Owner" role
- [ ] If not, ask project owner to grant access
- [ ] Retry: `node upload-mock-data.js`

### If "No data appears"

- [ ] Check: Did the script complete without errors?
- [ ] Verify: Did you see "✨ Upload complete!"?
- [ ] Refresh: Firebase Console (hard refresh: Cmd+Shift+R)
- [ ] Check: Different collection names?
- [ ] Retry: `node upload-mock-data.js`

---

## Sign-Off

**Phase 1 Execution Completed**:

- Date: **\_\_\_\_**
- Time: **\_\_\_\_**
- Status: [ ] ✅ All verifications passed

**Next Phase**:

- [ ] Begin Phase 2: Pinecone RAG Pipeline
- [ ] Update memory bank with completion status
- [ ] Proceed to transcript chunking

---

## Quick Reference

### Commands to Run

```bash
# Install
npm install firebase-admin

# Authenticate (choose one)
gcloud auth application-default login
# OR
export GOOGLE_APPLICATION_CREDENTIALS="firebase-key.json"

# Execute
node upload-mock-data.js

# Verify (in Firebase Console)
# Collections: students (5), session_transcripts (15), goals (10+)
# Storage: transcripts/ with STU001-STU005 folders
```

### Files to Check

- ✅ `data/students/` - 5 JSON files
- ✅ `data/transcripts/` - 15 JSON files
- ✅ `upload-mock-data.js` - Upload script
- ✅ `firebase-key.json` - Optional (if not using gcloud)

### Timeframe

- Install: ~5 seconds
- Authenticate: ~30 seconds
- Upload: ~10-15 seconds
- Verify: ~5 minutes
- **Total: ~20 minutes**

---

**Phase 1 Status**: 🟢 READY TO EXECUTE

**Last Updated**: November 6, 2025
