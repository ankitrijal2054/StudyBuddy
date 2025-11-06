# Connecting Auth Users to Student Profiles

## 🏗️ Architecture

The connection works through a `user_profiles` collection that maps Firebase Auth UIDs to mock student IDs:

```
Firebase Auth User
       ↓
   Auth UID: "xY7z9aBcDeFgHiJk..."
       ↓
   user_profiles document (UID as key)
       ↓
   { auth_uid, student_id: "STU001" }
       ↓
   students collection document
       ↓
   { student_id: "STU001", name: "Alex Chen", ... }
```

---

## 📋 Setup Instructions

### Step 1: Create Test Users in Firebase Auth

Run this script to create 5 test users linked to your mock students:

```bash
node create-test-users.js
```

This will:

- Create 5 Firebase Auth users with test emails
- Create `user_profiles` documents linking Auth UIDs to student IDs
- Output login credentials

**Test User Credentials:**

```
Email: alex.chen@example.com → STU001 (Alex Chen)
Email: jordan.patel@example.com → STU002 (Jordan Patel)
Email: samantha.kim@example.com → STU003 (Samantha Kim)
Email: marcus.johnson@example.com → STU004 (Marcus Johnson)
Email: priya.sharma@example.com → STU005 (Priya Sharma)

Password: TestPassword123! (for all users)
```

### Step 2: AuthContext Now Handles the Linking

The `AuthContext.jsx` is already updated with:

- `fetchStudentProfile()` function that queries the mapping
- Automatic loading of student profile when user logs in
- `studentProfile` available in the context

---

## 🎯 Using in Components

Now you can access the student profile in any component:

```jsx
import { useAuth } from "@/contexts/AuthContext";

function Dashboard() {
  const { currentUser, studentProfile } = useAuth();

  if (!studentProfile) {
    return <div>Loading profile...</div>;
  }

  return (
    <div>
      <h1>Welcome, {studentProfile.name}</h1>
      <p>Grade: {studentProfile.grade}</p>
      <p>Subjects: {studentProfile.subjects.join(", ")}</p>
      <p>Goals: {studentProfile.goals.join(", ")}</p>
    </div>
  );
}
```

---

## 📊 Firestore Structure

### Collection: `user_profiles`

Document ID: Firebase Auth UID

```json
{
  "auth_uid": "xY7z9aBcDeFgHiJk...",
  "student_id": "STU001",
  "email": "alex.chen@example.com",
  "name": "Alex Chen",
  "created_at": "2025-11-06T10:00:00Z"
}
```

### Collection: `students`

Document ID: student_id (e.g., "STU001")

```json
{
  "student_id": "STU001",
  "name": "Alex Chen",
  "email": "alex.chen@example.com",
  "grade": 11,
  "subjects": ["SAT Math", "Physics"],
  "goals": ["Master SAT Math: Algebra & Geometry", "Ace Physics: Mechanics"],
  "enrollment_date": "2025-10-25T10:00:00Z",
  "sessions_count": 2,
  "last_session": "2025-11-01T15:30:00Z",
  "created_at": "2025-10-25T10:00:00Z"
}
```

---

## 🔒 Security (Firestore Rules)

You should restrict access so users can only read their own profile:

```javascript
// firestore.rules

match /user_profiles/{uid} {
  allow read: if request.auth.uid == uid;
  allow write: if request.auth.uid == uid;
}

match /students/{document=**} {
  allow read: if request.auth != null;
  allow write: if false; // Only backend/admin can write
}
```

---

## 🧪 Testing the Flow

### Test Login:

1. Go to frontend login page
2. Use: `alex.chen@example.com` / `TestPassword123!`
3. Should log in and load student profile
4. Check browser console - should see student profile data

### Test in Console:

```javascript
// In browser console (after logging in)
const auth = useAuth();
console.log(auth.currentUser); // Firebase Auth user
console.log(auth.studentProfile); // Student profile from mock data
```

---

## 🚀 Next Steps

1. ✅ Run `node create-test-users.js` to create test users
2. ✅ Update Dashboard to show student info using `studentProfile`
3. ✅ Update Firestore rules to restrict access
4. ✅ Test login with test credentials
5. 🚀 Proceed to Phase 2 (Pinecone RAG)

---

## 📝 Architecture Notes

### Why This Approach?

**Problem**: Mock students (STU001, STU002) are data records, not auth users.

**Solution**: Create a mapping layer (`user_profiles`) that:

- Decouples auth from data
- Allows multiple auth users per student (future tutors)
- Easy to swap mock data with real Nerdy API later
- Supports multi-tenant architecture

### Alternative Approaches

**Option 1**: Store auth_uid in student document

- ❌ Tight coupling
- ❌ Hard to change later

**Option 2**: Create auth users with custom UIDs

- ❌ Hard to control
- ❌ Not recommended by Firebase

**Option 3**: Use mapping collection (CURRENT) ✅

- ✅ Clean separation of concerns
- ✅ Flexible for future expansion
- ✅ Best practice

---

## 🎓 How Auth + Data Work Together

```
User Sign-up/Login
    ↓
Firebase Auth (manages credentials)
    ↓
Auth State Changed Listener (onAuthStateChanged)
    ↓
Query user_profiles with Auth UID
    ↓
Get student_id from mapping
    ↓
Query students collection
    ↓
Load student data + store in React context
    ↓
Components can now use studentProfile
```

---

**Status**: Ready to connect! Run `create-test-users.js` and test the login flow.
