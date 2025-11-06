# Product Context - Why We're Building This

## The Problem

Nerdy (our target partner) faces a critical business challenge:

### Churn Analysis

- **52% of students churn** immediately after achieving their initial goal
- Why? **No clear next steps** - student completes Chemistry → disappears
- Result: **Lost lifetime value**, wasted acquisition cost

### Engagement Gaps

- Students only engage **during paid tutoring sessions** (1-2x per week)
- **6-7 day gaps** between sessions = disengagement, knowledge decay
- No continuous learning support or accountability system

### Early Indicator Problem

- Students with **<3 sessions in first 7 days** have 70%+ churn rate
- Currently: No proactive intervention (students just drift away)

## How AI Solves This

### 1. **Prevents Churn via Smart Recommendations**

When a student completes "Master Algebra", the companion suggests:

- **Natural progression**: Geometry → Trigonometry
- **Related STEM**: Physics, Computer Science
- **College prep**: SAT prep, AP courses
- **Personalized**: Based on student's demonstrated strengths

**Expected outcome**: 40%+ adoption of recommended subjects

### 2. **Keeps Students Engaged Between Sessions**

The companion:

- **Remembers** what was taught (session transcripts via RAG)
- **Answers questions** about past lessons 24/7
- **Generates practice** via adaptive quizzes
- **Tracks progress** visually (multi-goal dashboards)

**Expected outcome**: 2+ daily interactions, reduced knowledge decay

### 3. **Nudges Low-Engagement Students**

**Day 7 Email**: "You started strong with 2 sessions! Here's what you can review online..."

- Motivational tone
- Show progress
- CTA to practice quiz or chat

**Expected outcome**: 40%+ of low-engagement students book next session

### 4. **Drives Back to Tutors at Right Moment**

AI knows when to escalate:

- Detects student frustration (3+ "I don't understand")
- Recognizes complex problems needing human touch
- Suggests booking session when student is most motivated

**Expected outcome**: Higher booking rates, better tutor utilization

## User Journeys

### Journey 1: High-Engagement Path

```
1. Student completes Chemistry goal with 90% quiz score
2. → Goal auto-completes, celebration animation
3. → 3 personalized recommendations appear ("Physics", "AP Chemistry", "College Chemistry")
4. → Clicks "Start Physics"
5. → New goal created, progress tracked
6. → Continues learning chain (Chem → Physics → AP Physics)
7. → Higher lifetime value, reduced churn
```

### Journey 2: Low-Engagement Rescue

```
1. Student enrolls, books 2 sessions (below 3)
2. → Day 7 nudge email: "Keep the momentum going! Try these 5 practice questions..."
3. → Click email CTA → Uses chat, takes quiz
4. → Gains confidence, motivation
5. → Decides to book next session
6. → Re-engagement successful
```

### Journey 3: Between-Session Support

```
1. Student completes tutoring session on Algebra
2. Session transcript uploaded to system
3. 3 days later, student logs in to companion
4. Chat: "What was that quadratic formula again?"
5. → AI retrieves relevant transcript context
6. → Explains with examples, guides Socratic-style
7. → Student remembers, gains confidence
8. → Less likely to re-book unnecessarily, more prepared for next session
```

## Value Props

### For Students

- ✅ **24/7 learning companion** - Questions answered anytime
- ✅ **Adaptive practice** - Difficulty scales to their level
- ✅ **Progress visibility** - See how they're doing (multi-goal dashboard)
- ✅ **Smart guidance** - Personalized subject recommendations
- ✅ **Human escalation** - Tutors when needed most

### For Tutors (Nerdy)

- ✅ **Lower churn** - Reduce post-goal abandonment (52% → 20%)
- ✅ **Better utilization** - AI nudges students to book sessions
- ✅ **Smarter tutoring** - AI summarizes progress for tutors
- ✅ **Competitive advantage** - Retain students while competitors don't

### For Nerdy as Business

- ✅ **Lifetime value ↑** - 40%+ more subjects per student
- ✅ **Retention ↑** - 52% churn → 30% (estimate)
- ✅ **Measurable ROI** - Clear before/after metrics

## Business Model (Future)

**MVP**: Feature added to Nerdy platform (no separate billing)

**Phase 2 Options**:

1. **Included in premium tier** - "AI Study Companion" as differentiator
2. **Add-on service** - $9.99/month per student
3. **Tiered access** - Free (limited), Pro ($4.99), Premium ($9.99)

## Success Looks Like

After 48 hours:

- ✅ 5 test students can register and login
- ✅ Chat with AI about their lessons
- ✅ Take adaptive quizzes, get recommendations
- ✅ Receive personalized emails
- ✅ Dashboard shows real-time progress
- ✅ All features working, documented, deployed

After Phase 2 (Nerdy Integration):

- ✅ Real student data flows in
- ✅ Real session transcripts available
- ✅ Actual churn metrics measured
- ✅ ROI validated with stakeholders

## Key Insights

1. **AI is not a tutor replacement** - It's a _bridge_ keeping students engaged between sessions
2. **Personalization drives engagement** - Generic recommendations fail; specific pathways work
3. **Timing matters** - Right nudge at right moment (Day 7, goal near-complete, inactivity)
4. **Continuity is key** - Memory of past lessons (RAG) makes companion valuable
5. **Transparency wins** - Students want to see progress (dashboard with multi-goal tracking)

---

**Last Updated**: November 5, 2025
