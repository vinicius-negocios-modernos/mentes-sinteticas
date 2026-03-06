/**
 * Backward compatibility re-export wrapper.
 * All AI logic has been refactored into src/lib/ai/ modules.
 * This file re-exports the public API so existing consumers don't break.
 */
export { createMindChat, getMindManifest, getAvailableMinds } from "@/lib/ai";
