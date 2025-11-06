/**
 * Firebase Authentication Middleware
 *
 * Validates Firebase ID tokens and extracts user information
 * All Cloud Run endpoints require authentication
 */

const admin = require("firebase-admin");

/**
 * Middleware: Validate Firebase ID token
 * Extracts uid from token and adds to req.user
 */
const validateFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing or invalid Authorization header",
      });
    }

    const idToken = authHeader.split("Bearer ")[1];

    // Verify token with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Add user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email.split("@")[0],
    };

    next();
  } catch (error) {
    console.error("🔴 Auth Error:", error.message);

    if (error.code === "auth/id-token-expired") {
      return res.status(401).json({
        error: "Token Expired",
        message: "Please refresh your authentication token",
      });
    }

    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid authentication token",
    });
  }
};

module.exports = {
  validateFirebaseToken,
};
