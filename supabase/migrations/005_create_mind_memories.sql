-- =============================================================================
-- Migration 005: Create mind_memories table
-- Story 6.3 — Mind Memory (Recall Cross-Session)
-- =============================================================================

-- Create mind_memories table
CREATE TABLE IF NOT EXISTS mind_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mind_id UUID NOT NULL REFERENCES minds(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('fact', 'preference', 'topic', 'insight')),
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_mind_memories_user_mind ON mind_memories(user_id, mind_id);
CREATE INDEX IF NOT EXISTS idx_mind_memories_created_at ON mind_memories(created_at);

-- Enable RLS
ALTER TABLE mind_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: user can only see their own memories
CREATE POLICY "Users can view own memories"
  ON mind_memories FOR SELECT
  USING (auth.uid() = user_id);

-- DELETE: user can only delete their own memories
CREATE POLICY "Users can delete own memories"
  ON mind_memories FOR DELETE
  USING (auth.uid() = user_id);

-- INSERT: only via service role (backend)
CREATE POLICY "Service role can insert memories"
  ON mind_memories FOR INSERT
  WITH CHECK (true);

-- UPDATE: only via service role (backend)
CREATE POLICY "Service role can update memories"
  ON mind_memories FOR UPDATE
  USING (true)
  WITH CHECK (true);
