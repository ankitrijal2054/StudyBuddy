import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const register = async (email, password, name) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await updateProfile(userCredential.user, { displayName: name });

    // Create user profile in Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      email,
      name,
      createdAt: new Date().toISOString(),
    });

    return userCredential.user;
  };

  const login = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    return await signOut(auth);
  };

  /**
   * Fetch student profile linked to this auth user
   */
  const fetchStudentProfile = async (uid) => {
    try {
      // Query user_profiles to find student_id
      const userProfileDoc = await getDoc(doc(db, "user_profiles", uid));

      if (userProfileDoc.exists()) {
        const { student_id } = userProfileDoc.data();

        // Query students collection using student_id
        const studentDoc = await getDoc(doc(db, "students", student_id));

        if (studentDoc.exists()) {
          setStudentProfile({
            ...studentDoc.data(),
            auth_uid: uid,
          });
          return studentDoc.data();
        }
      }
    } catch (error) {
      console.error("Error fetching student profile:", error);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // When user logs in, fetch their student profile
        await fetchStudentProfile(user.uid);
      } else {
        // When user logs out, clear student profile
        setStudentProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    studentProfile,
    register,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
