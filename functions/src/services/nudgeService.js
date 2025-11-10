const sgMail = require("@sendgrid/mail");
const admin = require("firebase-admin");
const functions = require("firebase-functions");

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDER_EMAIL =
  process.env.SENDGRID_SENDER_EMAIL || "noreply@studybuddy.ai";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Send email via SendGrid
 */
async function sendEmail(to, subject, htmlContent) {
  if (!SENDGRID_API_KEY) {
    functions.logger.warn(
      "SendGrid API key not configured. Skipping email send."
    );
    return { success: false, reason: "SendGrid not configured" };
  }

  try {
    const msg = {
      to,
      from: SENDER_EMAIL,
      subject,
      html: htmlContent,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true },
      },
    };

    await sgMail.send(msg);
    functions.logger.info(`Email sent to ${to}: ${subject}`);
    return { success: true };
  } catch (error) {
    functions.logger.error(`Failed to send email to ${to}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Check if nudge was already sent recently (deduplication)
 */
async function shouldSendNudge(studentId, nudgeType) {
  try {
    const db = admin.firestore();
    const now = new Date();
    const recentThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours

    const query = await db
      .collection("nudge_logs")
      .where("student_id", "==", studentId)
      .where("nudge_type", "==", nudgeType)
      .where("sent_at", ">=", recentThreshold)
      .limit(1)
      .get();

    return query.empty; // True if no recent nudge found
  } catch (error) {
    functions.logger.error(`Error checking nudge deduplication: ${error}`);
    return true; // If error, allow sending
  }
}

/**
 * Log nudge send attempt
 */
async function logNudge(studentId, nudgeType, email, success) {
  try {
    const db = admin.firestore();
    await db.collection("nudge_logs").add({
      student_id: studentId,
      nudge_type: nudgeType,
      email,
      sent_at: admin.firestore.FieldValue.serverTimestamp(),
      status: success ? "sent" : "failed",
    });
  } catch (error) {
    functions.logger.error(`Error logging nudge: ${error}`);
  }
}

/**
 * HTML Email Templates
 */
const emailTemplates = {
  day7Engagement: (studentName, sessionCount, goalCount) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat-box { flex: 1; background: #f0f4ff; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-number { font-size: 24px; font-weight: bold; color: #667eea; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin-top: 20px; font-weight: 500; }
    .cta-button:hover { background: #5568d3; }
    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Keep the Momentum Going!</h1>
    </div>
    <div class="content">
      <p>Hi ${studentName},</p>
      
      <p>It's been a week since you started learning with StudyBuddy! We wanted to check in and celebrate your progress:</p>
      
      <div class="stats">
        <div class="stat-box">
          <div class="stat-number">${sessionCount}</div>
          <div class="stat-label">Sessions Completed</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">${goalCount}</div>
          <div class="stat-label">Active Goals</div>
        </div>
      </div>
      
      <p>You're building great habits! 💪 The best way to lock in what you've learned is to practice between sessions. Our AI study companion is ready to help you:</p>
      
      <ul>
        <li>📚 Review topics from your lessons</li>
        <li>❓ Take adaptive practice quizzes</li>
        <li>💬 Chat with your AI tutor anytime</li>
      </ul>
      
      <p>Click below to continue your learning journey:</p>
      
      <a href="https://study-buddy-28043.web.app" class="cta-button">Continue Learning →</a>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Questions? Reply to this email and we'll help!
      </p>
    </div>
    <div class="footer">
      <p>© 2025 StudyBuddy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `,

  inactivityNudge: (studentName) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
    .cta-button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin-top: 20px; font-weight: 500; }
    .cta-button:hover { background: #e64656; }
    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your AI Companion Misses You! 🤖</h1>
    </div>
    <div class="content">
      <p>Hi ${studentName},</p>
      
      <p>It's been a few days since you last chatted with your AI study companion. We know life gets busy, but learning doesn't have to be!</p>
      
      <p>Your AI tutor is ready to:</p>
      
      <ul>
        <li>💭 Answer questions about what you've learned</li>
        <li>🎓 Help you prepare for upcoming lessons</li>
        <li>✨ Generate personalized practice problems</li>
        <li>📊 Track your progress toward your goals</li>
      </ul>
      
      <p>Just 10 minutes of practice today can make a real difference in your learning!</p>
      
      <a href="https://study-buddy-28043.web.app" class="cta-button">Start Chatting Now →</a>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Your next tutoring session is a great time to review what you've practiced!
      </p>
    </div>
    <div class="footer">
      <p>© 2025 StudyBuddy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `,

  goalNearCompletion: (studentName, goalSubject, progress) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
    .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
    .progress-bar { background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden; margin: 15px 0; }
    .progress-fill { background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%); height: 100%; width: ${progress}%; transition: width 0.3s ease; }
    .cta-button { display: inline-block; background: #00f2fe; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin-top: 20px; font-weight: 500; }
    .cta-button:hover { background: #00d9e8; }
    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 You're Almost There!</h1>
    </div>
    <div class="content">
      <p>Hi ${studentName},</p>
      
      <p>Incredible work! You're ${Math.round(
        progress
      )}% of the way to completing <strong>${goalSubject}</strong>. You're so close!</p>
      
      <p>Your progress:</p>
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      
      <p>Here's what's next:</p>
      
      <ul>
        <li>🎯 Complete just a few more practice quizzes</li>
        <li>💬 Chat with your AI tutor to review tricky concepts</li>
        <li>📝 Take a final quiz to solidify what you've learned</li>
      </ul>
      
      <p>Let's finish strong! 💪</p>
      
      <a href="https://study-buddy-28043.web.app" class="cta-button">Complete Your Goal →</a>
      
      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        Once you finish ${goalSubject}, we'll recommend related subjects to keep your learning momentum going!
      </p>
    </div>
    <div class="footer">
      <p>© 2025 StudyBuddy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `,
};

/**
 * Check and send Day 7 engagement nudge
 */
async function checkAndSendDay7Nudge() {
  try {
    const db = admin.firestore();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get students enrolled exactly 7 days ago (within a 24-hour window)
    const query = await db
      .collection("students")
      .where("enrollmentDate", "<=", sevenDaysAgo.toISOString())
      .where(
        "enrollmentDate",
        ">=",
        new Date(sevenDaysAgo.getTime() - 24 * 60 * 60 * 1000).toISOString()
      )
      .get();

    for (const studentDoc of query.docs) {
      const student = studentDoc.data();
      const studentId = studentDoc.id;

      // Check deduplication
      if (!(await shouldSendNudge(studentId, "day7_engagement"))) {
        functions.logger.info(
          `Skipping Day 7 nudge for ${studentId} (already sent recently)`
        );
        continue;
      }

      // Count sessions in last 7 days
      const sessionCount = student.totalSessions || 0;

      if (sessionCount < 3) {
        const htmlContent = emailTemplates.day7Engagement(
          student.name || "Learner",
          sessionCount,
          0 // Will calculate goal count below if needed
        );

        const result = await sendEmail(
          student.email,
          "🎯 Keep the Momentum Going! Your Week 1 Update",
          htmlContent
        );

        await logNudge(
          studentId,
          "day7_engagement",
          student.email,
          result.success
        );
      }
    }

    functions.logger.info("Day 7 nudge check completed");
  } catch (error) {
    functions.logger.error(`Error checking Day 7 nudges: ${error}`);
  }
}

/**
 * Check and send inactivity nudge (3+ days no chat)
 */
async function checkAndSendInactivityNudge() {
  try {
    const db = admin.firestore();
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // Get all students
    const studentsQuery = await db.collection("students").get();

    for (const studentDoc of studentsQuery.docs) {
      const student = studentDoc.data();
      const studentId = studentDoc.id;

      // Check deduplication
      if (!(await shouldSendNudge(studentId, "inactivity"))) {
        functions.logger.info(
          `Skipping inactivity nudge for ${studentId} (already sent recently)`
        );
        continue;
      }

      // Check last chat activity
      const conversationsQuery = await db
        .collection("conversations")
        .where("student_id", "==", studentId)
        .orderBy("last_updated", "desc")
        .limit(1)
        .get();

      if (conversationsQuery.empty) {
        // No conversations - check enrollment date
        const enrollmentDate = student.enrollmentDate
          ? new Date(student.enrollmentDate)
          : null;
        if (enrollmentDate && enrollmentDate < threeDaysAgo) {
          const htmlContent = emailTemplates.inactivityNudge(
            student.name || "Learner"
          );
          const result = await sendEmail(
            student.email,
            "Your AI Companion Misses You! 🤖",
            htmlContent
          );
          await logNudge(
            studentId,
            "inactivity",
            student.email,
            result.success
          );
        }
      } else {
        // Has conversations - check last updated
        const lastConversation = conversationsQuery.docs[0].data();
        const lastUpdated = lastConversation.last_updated
          ? new Date(lastConversation.last_updated)
          : null;

        if (lastUpdated && lastUpdated < threeDaysAgo) {
          const htmlContent = emailTemplates.inactivityNudge(
            student.name || "Learner"
          );
          const result = await sendEmail(
            student.email,
            "Your AI Companion Misses You! 🤖",
            htmlContent
          );
          await logNudge(
            studentId,
            "inactivity",
            student.email,
            result.success
          );
        }
      }
    }

    functions.logger.info("Inactivity nudge check completed");
  } catch (error) {
    functions.logger.error(`Error checking inactivity nudges: ${error}`);
  }
}

/**
 * Check and send goal near-completion nudge (progress >= 85%)
 */
async function checkAndSendGoalNearCompletionNudge() {
  try {
    const db = admin.firestore();

    // Get all active goals with progress >= 85%
    const goalsQuery = await db
      .collection("goals")
      .where("status", "==", "active")
      .where("progress", ">=", 0.85)
      .get();

    for (const goalDoc of goalsQuery.docs) {
      const goal = goalDoc.data();
      const goalId = goalDoc.id;
      const studentId = goal.student_id;

      // Check deduplication (use goal ID to prevent duplicate per goal)
      const nudgeType = `goal_near_completion_${goalId}`;
      if (!(await shouldSendNudge(studentId, nudgeType))) {
        functions.logger.info(
          `Skipping goal completion nudge for ${goalId} (already sent recently)`
        );
        continue;
      }

      // Get student email
      const studentDoc = await db.collection("students").doc(studentId).get();
      if (!studentDoc.exists) continue;

      const student = studentDoc.data();
      const htmlContent = emailTemplates.goalNearCompletion(
        student.name || "Learner",
        goal.subject || "Your Goal",
        Math.round(goal.progress * 100)
      );

      const result = await sendEmail(
        student.email,
        "🎉 You're Almost There! Finish Strong!",
        htmlContent
      );

      await logNudge(studentId, nudgeType, student.email, result.success);
    }

    functions.logger.info("Goal near-completion nudge check completed");
  } catch (error) {
    functions.logger.error(
      `Error checking goal near-completion nudges: ${error}`
    );
  }
}

module.exports = {
  sendEmail,
  checkAndSendDay7Nudge,
  checkAndSendInactivityNudge,
  checkAndSendGoalNearCompletionNudge,
  shouldSendNudge,
  logNudge,
};
