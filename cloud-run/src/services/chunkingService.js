/**
 * Chunking Service
 * 
 * Splits long transcripts into smaller chunks (~400 words each)
 * while preserving metadata and providing overlap for context continuity.
 */

/**
 * Split text into chunks by word count with overlap
 * 
 * @param {string} text - The text to chunk
 * @param {number} chunkSize - Target words per chunk (default: 400)
 * @param {number} overlap - Overlap words between chunks (default: 50)
 * @returns {Array<{text: string, wordCount: number, chunkIndex: number}>}
 */
function chunkTranscript(text, chunkSize = 400, overlap = 50) {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text input');
  }

  // Split text into words
  const words = text.trim().split(/\s+/);
  const chunks = [];
  let currentIndex = 0;

  while (currentIndex < words.length) {
    // Get chunk words
    const chunkEnd = Math.min(currentIndex + chunkSize, words.length);
    const chunkWords = words.slice(currentIndex, chunkEnd);
    const chunkText = chunkWords.join(' ');

    chunks.push({
      text: chunkText,
      wordCount: chunkWords.length,
      chunkIndex: chunks.length
    });

    // Move to next chunk start (with overlap)
    currentIndex = chunkEnd - overlap;

    // Prevent infinite loop if we're at the end
    if (chunkEnd === words.length) {
      break;
    }
  }

  return chunks;
}

/**
 * Extract metadata from transcript JSON
 * 
 * @param {Object} transcript - Transcript object from Firestore
 * @returns {Object} Extracted metadata
 */
function extractMetadata(transcript) {
  if (!transcript) {
    throw new Error('Invalid transcript input');
  }

  return {
    student_id: transcript.student_id || 'UNKNOWN',
    transcript_id: transcript.transcript_id || 'UNKNOWN',
    subject: transcript.subject || 'Unknown Subject',
    topics: Array.isArray(transcript.key_topics) ? transcript.key_topics : [],
    date: transcript.session_date || new Date().toISOString(),
    tutor_notes: transcript.tutor_notes || '',
    duration_minutes: transcript.duration_minutes || 0
  };
}

/**
 * Extract full transcript text from transcript object
 * Combines dialogue, explanations, and notes into a single searchable text
 * 
 * @param {Object} transcript - Transcript object
 * @returns {string} Full transcript text
 */
function extractTranscriptText(transcript) {
  const parts = [];

  // Add subject and topic
  if (transcript.subject) {
    parts.push(`Subject: ${transcript.subject}`);
  }
  if (transcript.topic) {
    parts.push(`Topic: ${transcript.topic}`);
  }

  // Add key topics
  if (Array.isArray(transcript.key_topics) && transcript.key_topics.length > 0) {
    parts.push(`Key Topics: ${transcript.key_topics.join(', ')}`);
  }

  // Add dialogue if present
  if (transcript.dialogue) {
    if (Array.isArray(transcript.dialogue)) {
      transcript.dialogue.forEach(item => {
        if (item.speaker && item.text) {
          parts.push(`${item.speaker}: ${item.text}`);
        }
      });
    } else if (typeof transcript.dialogue === 'string') {
      parts.push(transcript.dialogue);
    }
  }

  // Add summary
  if (transcript.summary) {
    parts.push(`Summary: ${transcript.summary}`);
  }

  // Add tutor notes
  if (transcript.tutor_notes) {
    parts.push(`Tutor Notes: ${transcript.tutor_notes}`);
  }

  // Add learning outcomes
  if (Array.isArray(transcript.learning_outcomes)) {
    parts.push(`Learning Outcomes: ${transcript.learning_outcomes.join(', ')}`);
  }

  return parts.filter(p => p).join('\n\n');
}

/**
 * Prepare chunks for embedding
 * Takes raw transcripts and returns chunks ready for OpenAI embedding
 * 
 * @param {Array<Object>} transcripts - Array of transcript objects
 * @param {number} chunkSize - Words per chunk (default: 400)
 * @returns {Array<{chunkText: string, metadata: Object}>}
 */
function prepareChunksForEmbedding(transcripts, chunkSize = 400) {
  if (!Array.isArray(transcripts)) {
    throw new Error('Transcripts must be an array');
  }

  const allChunks = [];

  transcripts.forEach((transcript) => {
    try {
      // Extract metadata
      const metadata = extractMetadata(transcript);

      // Extract full text from transcript
      const fullText = extractTranscriptText(transcript);

      if (!fullText || fullText.trim().length === 0) {
        console.warn(`Skipping empty transcript: ${metadata.transcript_id}`);
        return;
      }

      // Chunk the text
      const chunks = chunkTranscript(fullText, chunkSize);

      // Create prepared chunks with metadata
      chunks.forEach((chunk) => {
        allChunks.push({
          chunkText: chunk.text,
          metadata: {
            ...metadata,
            chunk_index: chunk.chunkIndex,
            word_count: chunk.wordCount
          }
        });
      });

      console.log(`✓ Processed ${metadata.transcript_id}: ${chunks.length} chunks`);
    } catch (error) {
      console.error(`Error processing transcript: ${error.message}`);
    }
  });

  return allChunks;
}

/**
 * Validate chunks before sending to embedding
 * 
 * @param {Array<Object>} chunks - Chunks to validate
 * @returns {boolean} True if all chunks are valid
 */
function validateChunks(chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    console.error('No chunks provided');
    return false;
  }

  let isValid = true;

  chunks.forEach((chunk, idx) => {
    if (!chunk.chunkText || typeof chunk.chunkText !== 'string') {
      console.error(`Chunk ${idx}: Missing or invalid chunkText`);
      isValid = false;
    }

    if (!chunk.metadata || typeof chunk.metadata !== 'object') {
      console.error(`Chunk ${idx}: Missing or invalid metadata`);
      isValid = false;
    }

    if (!chunk.metadata.student_id) {
      console.error(`Chunk ${idx}: Missing student_id`);
      isValid = false;
    }

    if (!chunk.metadata.transcript_id) {
      console.error(`Chunk ${idx}: Missing transcript_id`);
      isValid = false;
    }

    // Check text length (should be reasonable)
    if (chunk.chunkText.length < 50) {
      console.warn(`Chunk ${idx}: Very short text (${chunk.chunkText.length} chars)`);
    }
  });

  return isValid;
}

module.exports = {
  chunkTranscript,
  extractMetadata,
  extractTranscriptText,
  prepareChunksForEmbedding,
  validateChunks
};

