/**
 * Client component that integrates the soundscape hook with the controls UI.
 *
 * Placed in the chat page between header and main content area.
 * Self-contained: manages its own lifecycle, visibility, and state.
 *
 * @module chat-soundscape-bar
 */

"use client";

import { useSoundscape } from "@/hooks/use-soundscape";
import SoundscapeControls from "@/components/chat/soundscape-controls";

interface ChatSoundscapeBarProps {
  mindSlug: string;
}

export default function ChatSoundscapeBar({ mindSlug }: ChatSoundscapeBarProps) {
  const soundscape = useSoundscape(mindSlug);

  return (
    <div className="flex justify-end px-2 -mt-4 mb-2 relative z-10">
      <SoundscapeControls soundscape={soundscape} />
    </div>
  );
}
