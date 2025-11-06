# Phase 1: Mock Data & Cloud Storage Setup

## 📋 Overview

Phase 1 populates your Firebase project with:

- **5 student profiles** (realistic, diverse subjects)
- **15 session transcripts** (3 per student with academic content)
- **Multiple goals** per student (auto-generated based on profiles)

All data is stored in:

- **Firestore**: `students`, `session_transcripts`, `goals` collections
- **Cloud Storage**: `transcripts/` folder with JSON files

## 🚀 Quick Start

### Step 1: Verify Mock Data Files

All files are already created in:

```
data/students/
├── student_001.json   # Alex Chen
├── student_002.json   # Jordan Patel
├── student_003.json   # Samantha Kim
├── student_004.json   # Marcus Johnson
└── student_005.json   # Priya Sharma

data/transcripts/
├── session_STU001_001.json   # Algebra
├── session_STU001_002.json   # Geometry
├── session_STU001_003.json   # Physics
├── session_STU002_001.json   # Chemistry
├── session_STU002_002.json   # VSEPR Theory
├── session_STU002_003.json   # Biology
├── session_STU003_001.json   # Calculus Limits
├── session_STU003_002.json   # Derivatives
├── session_STU003_003.json   # Electric Fields
├── session_STU004_001.json   # Functions
├── session_STU004_002.json   # Linear Equations
├── session_STU004_003.json   # Essay Writing
├── session_STU005_001.json   # Civil War
├── session_STU005_002.json   # Reconstruction
└── session_STU005_003.json   # Reading Comprehension
```

### Step 2: Install Firebase Admin SDK

Run this in the project root:

```bash
npm install firebase-admin
```

### Step 3: Authenticate with Firebase

Choose ONE authentication method:

#### Option A: Application Default Credentials (Recommended)

```bash
gcloud auth application-default login
```

Then run the upload script - it will automatically use your logged-in credentials.

#### Option B: Service Account Key

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save as `firebase-key.json` in the project root
4. Run the script - it will auto-detect the key

#### Option C: Environment Variable

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
```

### Step 4: Run the Upload Script

```bash
node upload-mock-data.js
```

You should see:

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
   ...

✨ Upload complete!

📊 Summary:
   • Students: 5
   • Transcripts: 15
   • Goals: 10
   • Time: 2.34s

🎉 Data is now available in Firestore!
```

## ✅ Verification

### Check Firestore Collections

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select `study-buddy-28043` project
3. Click "Firestore Database" in the left sidebar
4. Verify these collections exist:
   - `students` (5 documents)
   - `session_transcripts` (15 documents)
   - `goals` (multiple documents)

### Query a Student's Data

```javascript
// In Firebase Console > Firestore > Run query
Collection: students;
Document: STU001;
// Should show Alex Chen's profile
```

### Query Transcripts by Student

```javascript
// Collection: session_transcripts
// Filter: student_id == "STU001"
// Should show 3 transcripts for Alex Chen
```

### Check Cloud Storage

1. Go to Firebase Console > Storage
2. Browse to `transcripts/` folder
3. Should see subdirectories:
   - `STU001/` (3 transcripts)
   - `STU002/` (3 transcripts)
   - `STU003/` (3 transcripts)
   - `STU004/` (3 transcripts)
   - `STU005/` (3 transcripts)

## 📊 Data Structure

### Student Document

```json
{
  "student_id": "STU001",
  "email": "alex.chen@example.com",
  "name": "Alex Chen",
  "grade": 11,
  "subjects": ["SAT Math", "Physics"],
  "goals": ["Master SAT Math: Algebra & Geometry", "Ace Physics: Mechanics"],
  "enrollment_date": "2025-10-25T10:00:00Z",
  "sessions_count": 2,
  "last_session": "2025-11-01T15:30:00Z",
  "created_at": "2025-10-25T10:00:00Z"
}
```

### Transcript Document

```json
{
  "transcript_id": "TXN_STU001_001",
  "student_id": "STU001",
  "subject": "SAT Math",
  "topic": "Algebra: Quadratic Equations",
  "session_date": "2025-10-25T10:00:00Z",
  "duration_minutes": 45,
  "key_topics": ["Quadratic Equations", "Factoring", "Quadratic Formula"],
  "storage_url": "transcripts/STU001/session_STU001_001.json",
  "created_at": "2025-10-25T10:00:00Z"
}
```

### Goal Document

```json
{
  "goal_id": "STU001_master_sat_math_algebra_geometry",
  "student_id": "STU001",
  "title": "Master SAT Math: Algebra & Geometry",
  "status": "active",
  "progress_percentage": 45,
  "quiz_scores": [],
  "created_at": "2025-11-06T10:00:00Z",
  "target_completion_date": "2025-12-06T10:00:00Z"
}
```

## 🔑 Key Topics in Transcripts

### STU001 (Alex Chen)

- **SAT Math**: Quadratic Equations, Triangle Properties
- **Physics**: Newton's Laws of Motion

### STU002 (Jordan Patel)

- **Chemistry**: Ionic & Covalent Bonding, VSEPR Theory
- **Biology**: Cell Structure & Organization

### STU003 (Samantha Kim)

- **AP Calculus**: Limits, Derivatives
- **AP Physics C**: Electric Fields

### STU004 (Marcus Johnson)

- **Algebra I**: Functions, Linear Equations
- **English**: Essay Structure & Thesis

### STU005 (Priya Sharma)

- **AP US History**: Civil War, Reconstruction
- **ACT Reading**: Reading Comprehension

## 🎯 Next Steps After Upload

1. **Phase 2 Prep**: Once verified, proceed to Pinecone RAG Pipeline

   - Chunk transcripts into 300-word segments
   - Generate embeddings with OpenAI API
   - Upsert vectors to Pinecone

2. **Test Queries**: Query student data from frontend

   - Verify Firestore security rules allow authenticated access
   - Test fetching student profile + goals

3. **Backend Integration**: Cloud Run service reads this data
   - Load transcripts from Cloud Storage
   - Process for RAG pipeline

## 🐛 Troubleshooting

### "Cannot find module 'firebase-admin'"

```bash
npm install firebase-admin
```

### "GOOGLE_APPLICATION_CREDENTIALS not set"

Run: `gcloud auth application-default login`

### "Permission denied" when uploading

Check Firebase project settings - ensure you have Owner/Editor role

### "Duplicate app" error

Safe to ignore - means Firebase SDK is already initialized

### No data appears after upload

1. Check Firebase Console > Firestore > Collections
2. Verify project ID matches in `upload-mock-data.js`
3. Ensure authentication succeeded
4. Try uploading again with fresh terminal

## 📝 Notes

- Mock data is reproducible and realistic
- Transcripts include Socratic dialogue patterns for RAG context
- Goals have random progress (20-80%) for testing dashboard
- All timestamps are realistic (October-November 2025)
- Student diversity spans STEM, humanities, and standardized tests

## ⏱️ Timing

- Reading files: <1s
- Creating 5 students: ~2-3s
- Uploading 15 transcripts: ~5-8s
- Creating goals: ~2-3s
- **Total: ~10-15s**

---

**Status**: Phase 1 ready to execute!
**Next**: Phase 2 - Pinecone RAG Pipeline (7-13 hours)
