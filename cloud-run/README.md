# Cloud Run Service - Study Buddy AI

Express.js backend service for AI Study Companion. Handles chat with RAG, quiz generation, and student interactions.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Fill in:

- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `OPENAI_API_KEY` - OpenAI API key (GPT-4o-mini)
- `PINECONE_API_KEY` - Pinecone API key
- `FIREBASE_SERVICE_ACCOUNT` - Service account JSON (optional for Cloud Run)

### 3. Local Development

```bash
# Terminal 1: Start development server with hot reload
npm run dev

# Server runs on http://localhost:8080
```

### 4. Health Check

```bash
curl http://localhost:8080/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2025-11-06T10:00:00.000Z",
  "service": "study-buddy-ai"
}
```

## API Endpoints

### Chat

**POST /api/chat**

- Sends a message and gets AI response with RAG context
- Requires Firebase ID token in Authorization header
- Returns response, handoff suggestion, and RAG metadata

```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is ionic bonding?"}'
```

Response:

```json
{
  "success": true,
  "response": "Ionic bonding occurs when...",
  "metadata": {
    "handoff_suggested": false,
    "confidence": 0.8,
    "rag_enabled": true,
    "chunks_retrieved": 2
  }
}
```

**GET /api/chat/history**

- Retrieves conversation history for current student
- Requires Firebase ID token

```bash
curl http://localhost:8080/api/chat/history \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

Response:

```json
{
  "messages": [
    { "role": "user", "content": "...", "timestamp": "..." },
    { "role": "assistant", "content": "...", "timestamp": "..." }
  ],
  "conversation_id": "conv_id"
}
```

### Quiz (Phase 4)

- **POST /api/quiz/generate** - Generate adaptive quiz
- **POST /api/quiz/submit** - Submit quiz and get grade

### Health

**GET /health**

- Service health check (no auth required)

## Architecture

### Services

- **chatService.js** - RAG + LLM orchestration
- **embeddingService.js** - OpenAI embeddings
- **pineconeService.js** - Vector DB operations
- **chunkingService.js** - Text chunking

### Middleware

- **auth.js** - Firebase token validation

### Data Flow

```
User Message
  ↓
Express /api/chat endpoint
  ↓
Firebase Auth validation
  ↓
Get student profile & history
  ↓
Embed message (OpenAI)
  ↓
Query Pinecone (RAG retrieval)
  ↓
Format LangChain prompt
  ↓
Call GPT-4o-mini
  ↓
Detect handoff trigger
  ↓
Save to Firestore
  ↓
Return response + metadata
```

## Deployment

### Cloud Run (Google Cloud)

```bash
# Build and deploy
gcloud run deploy study-buddy-ai \
  --source . \
  --platform managed \
  --region us-central1 \
  --set-env-vars OPENAI_API_KEY=sk-...,PINECONE_API_KEY=...
```

### Docker

```bash
# Build image
docker build -t study-buddy-ai .

# Run container
docker run -p 8080:8080 \
  -e OPENAI_API_KEY=sk-... \
  -e PINECONE_API_KEY=... \
  -e FIREBASE_PROJECT_ID=... \
  study-buddy-ai
```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

Status codes:

- `200` - Success
- `400` - Bad request
- `401` - Unauthorized (invalid token)
- `404` - Not found
- `500` - Server error
- `501` - Not implemented

## Performance

Target latencies:

- Chat response: <2 seconds (P95)
- RAG retrieval: <200ms
- Token validation: <50ms

## Security

- All endpoints require Firebase authentication
- Firestore rules enforce user isolation
- Pinecone queries filtered by student_id
- Environment variables stored in Cloud Run secrets

## Testing

```bash
# Run tests (manual for MVP)
npm test

# Test chat endpoint locally
curl -X POST http://localhost:8080/api/chat \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the quadratic formula?"}'
```

## Known Issues

- Cold start latency ~3-5s on Cloud Run first call
- Pinecone free tier: ~1000 vector limit
- OpenAI rate limits: 90K tokens/min (free tier)

## Next Steps (Phase 4)

1. Implement quiz generation endpoint
2. Add quiz submission and grading
3. Auto-complete goals at 85% score
4. Trigger recommendations on goal completion

---

**Last Updated**: November 6, 2025
