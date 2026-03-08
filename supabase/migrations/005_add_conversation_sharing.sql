-- Migration: Add conversation sharing support
-- Story 6.6: Conversation Sharing (Link Publico)
-- Adds share_token and shared_at columns to conversations table

-- Add sharing columns
ALTER TABLE conversations
  ADD COLUMN share_token VARCHAR(64) DEFAULT NULL,
  ADD COLUMN shared_at TIMESTAMPTZ DEFAULT NULL;

-- Create unique partial index on share_token (only non-null values)
CREATE UNIQUE INDEX idx_conversations_share_token
  ON conversations (share_token)
  WHERE share_token IS NOT NULL;

-- RPC function to fetch a shared conversation by token (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION get_shared_conversation(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation RECORD;
  v_messages JSON;
  v_mind RECORD;
BEGIN
  -- Find the conversation by share_token
  SELECT id, user_id, mind_id, title, share_token, shared_at, created_at, updated_at
    INTO v_conversation
    FROM conversations
    WHERE share_token = p_token
      AND share_token IS NOT NULL;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Fetch the mind info
  SELECT id, name, slug, title, era, nationality, avatar_url
    INTO v_mind
    FROM minds
    WHERE id = v_conversation.mind_id;

  -- Fetch messages ordered chronologically
  SELECT json_agg(
    json_build_object(
      'id', m.id,
      'role', m.role,
      'content', m.content,
      'created_at', m.created_at
    ) ORDER BY m.created_at ASC
  )
  INTO v_messages
  FROM messages m
  WHERE m.conversation_id = v_conversation.id;

  -- Return combined result
  RETURN json_build_object(
    'conversation', json_build_object(
      'id', v_conversation.id,
      'title', v_conversation.title,
      'share_token', v_conversation.share_token,
      'shared_at', v_conversation.shared_at,
      'created_at', v_conversation.created_at
    ),
    'mind', json_build_object(
      'id', v_mind.id,
      'name', v_mind.name,
      'slug', v_mind.slug,
      'title', v_mind.title,
      'era', v_mind.era,
      'nationality', v_mind.nationality,
      'avatar_url', v_mind.avatar_url
    ),
    'messages', COALESCE(v_messages, '[]'::json)
  );
END;
$$;
