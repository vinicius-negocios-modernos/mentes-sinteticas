-- ============================================
-- Story 2.6: Create rate_limits table
-- ============================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index for efficient lookups: (user_id, action, window_start)
CREATE INDEX IF NOT EXISTS rate_limits_user_action_window_idx
  ON rate_limits (user_id, action, window_start);

-- No RLS needed — table accessed only via server actions (server-side)
COMMENT ON TABLE rate_limits IS 'Per-user rate limiting with sliding window. Accessed server-side only.';
