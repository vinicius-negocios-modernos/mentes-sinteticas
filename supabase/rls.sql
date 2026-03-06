-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
-- NOTE: These policies require Supabase Auth (Story 2.2).
-- Apply AFTER auth is configured. Until then, tables are
-- accessible only via service_role key (server-side).
-- ============================================

-- ----------------------------------------
-- Enable RLS on all tables
-- ----------------------------------------

ALTER TABLE minds ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uri_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- PUBLIC READ: minds, knowledge_documents, file_uri_cache
-- These are reference data — any authenticated or anon user can read.
-- ----------------------------------------

CREATE POLICY "minds_public_read"
  ON minds
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "knowledge_documents_public_read"
  ON knowledge_documents
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "file_uri_cache_public_read"
  ON file_uri_cache
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- ----------------------------------------
-- CONVERSATIONS: owner-only access (user_id = auth.uid())
-- ----------------------------------------

CREATE POLICY "conversations_select_own"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "conversations_insert_own"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "conversations_update_own"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "conversations_delete_own"
  ON conversations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ----------------------------------------
-- MESSAGES: owner-only access (via conversation join)
-- ----------------------------------------

CREATE POLICY "messages_select_own"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert_own"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_delete_own"
  ON messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );
