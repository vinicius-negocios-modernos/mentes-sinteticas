-- Migration 006: Create debates and debate_participants tables
-- Story 6.2: Multi-Mind Debates V1 (Round-Robin)

-- Add mind_slug column to messages table for debate message identification
ALTER TABLE messages ADD COLUMN mind_slug VARCHAR(255);

-- Create debates table
CREATE TABLE debates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  max_rounds INTEGER NOT NULL DEFAULT 5,
  current_round INTEGER NOT NULL DEFAULT 0,
  current_turn INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'setup'
    CHECK (status IN ('setup', 'active', 'paused', 'completed')),
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create debate_participants table
CREATE TABLE debate_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  mind_id UUID NOT NULL REFERENCES minds(id),
  turn_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(debate_id, mind_id),
  UNIQUE(debate_id, turn_order)
);

-- RLS policies for debates
ALTER TABLE debates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debates"
  ON debates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own debates"
  ON debates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own debates"
  ON debates FOR UPDATE
  USING (user_id = auth.uid());

-- RLS policies for debate_participants (via debate ownership)
ALTER TABLE debate_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants of own debates"
  ON debate_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM debates
      WHERE debates.id = debate_participants.debate_id
      AND debates.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert participants to own debates"
  ON debate_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM debates
      WHERE debates.id = debate_participants.debate_id
      AND debates.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_debates_user_id ON debates(user_id);
CREATE INDEX idx_debates_status ON debates(status);
CREATE INDEX idx_debate_participants_debate_id ON debate_participants(debate_id);
CREATE INDEX idx_messages_mind_slug ON messages(mind_slug) WHERE mind_slug IS NOT NULL;
