#!/bin/bash

###############################################################################
# 🚀 Complete Setup Script: Create All Users & Upload Data
#
# This script automates the complete setup process:
# 1. Creates 6 Firebase Auth test users (including Ankit Rijal)
# 2. Extracts their UIDs
# 3. Uploads mock data (students, transcripts, goals) to Firestore
# 4. Generates embeddings for Pinecone
#
# Usage:
#   bash scripts/setup-all-users.sh
#
###############################################################################

set -e  # Exit on any error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         🚀 Complete User & Data Setup                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📁 Project root: ${PROJECT_ROOT}${NC}\n"

# Step 1: Create test users
echo -e "${BLUE}Step 1: Creating Firebase Auth users...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

USER_OUTPUT=$(node scripts/create-test-users.js 2>&1)
echo "$USER_OUTPUT"

# Extract UIDs from output
UIDS=()
while IFS= read -r line; do
  if [[ $line =~ ^[[:space:]]*UID\ \(use\ as\ student_id\):\ ([a-zA-Z0-9]+) ]]; then
    UIDS+=("${BASH_REMATCH[1]}")
  fi
done <<< "$USER_OUTPUT"

if [ ${#UIDS[@]} -ne 6 ]; then
  echo -e "${RED}❌ Error: Expected 6 UIDs but got ${#UIDS[@]}${NC}"
  echo -e "${YELLOW}Make sure all 6 test users were created successfully${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Created 6 test users${NC}"
echo -e "${GREEN}✅ Extracted UIDs: ${#UIDS[@]}${NC}\n"

# Step 2: Upload mock data
echo -e "${BLUE}Step 2: Uploading mock data to Firestore...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! node scripts/upload-mock-data.js "${UIDS[@]}"; then
  echo -e "${RED}❌ Failed to upload mock data${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Mock data uploaded to Firestore${NC}\n"

# Step 3: Generate embeddings
echo -e "${BLUE}Step 3: Generating embeddings for Pinecone...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! node scripts/embedTranscripts.js; then
  echo -e "${RED}❌ Failed to generate embeddings${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Embeddings generated${NC}\n"

# Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   ✨ Setup Complete! ✨                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}📊 Summary:${NC}"
echo "   • 6 Firebase Auth users created"
echo "   • 6 student profiles uploaded"
echo "   • 18 session transcripts uploaded"
echo "   • 6+ goals created"
echo "   • Pinecone vectors generated"
echo ""
echo -e "${YELLOW}📝 Test Users:${NC}"
echo "   1. alex.chen@example.com - SAT Math, Physics"
echo "   2. jordan.patel@example.com - (Custom setup)"
echo "   3. samantha.kim@example.com - (Custom setup)"
echo "   4. marcus.johnson@example.com - (Custom setup)"
echo "   5. priya.sharma@example.com - (Custom setup)"
echo "   6. ankitrijal2054@gmail.com - CS, Statistics ✨ NEW!"
echo ""
echo -e "${BLUE}🎯 Next Steps:${NC}"
echo "   1. Frontend: npm run dev (from frontend/ directory)"
echo "   2. Cloud Run: npm run dev (from cloud-run/ directory)"
echo "   3. Emulators: firebase emulators:start"
echo "   4. Test login with any of the email addresses above"
echo ""
echo -e "${GREEN}🚀 Ready to begin Phase 8 testing!${NC}\n"

