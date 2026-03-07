-- ============================================
-- Story 4.8: Create token_usage table
-- ============================================

CREATE TABLE IF NOT EXISTS token_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  model TEXT NOT NULL,
  cost_usd NUMERIC(10,6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indices
CREATE INDEX idx_token_usage_user_date ON token_usage(user_id, created_at);
CREATE INDEX idx_token_usage_conversation ON token_usage(conversation_id);

-- RLS
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own token usage"
  ON token_usage FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service can insert token usage"
  ON token_usage FOR INSERT
  WITH CHECK (true);
