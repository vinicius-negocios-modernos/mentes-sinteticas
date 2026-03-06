-- ============================================
-- Story 2.3: Enable RLS on conversations & messages
-- ============================================

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- CONVERSATIONS: owner-only access
-- ----------------------------------------

CREATE POLICY "conversations_select_own"
  ON conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "conversations_insert_own"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "conversations_update_own"
  ON conversations FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "conversations_delete_own"
  ON conversations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ----------------------------------------
-- MESSAGES: owner-only via conversation join
-- ----------------------------------------

CREATE POLICY "messages_select_own"
  ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert_own"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_delete_own"
  ON messages FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );
