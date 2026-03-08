/**
 * Soundscape controls — volume slider, mute toggle, and master enable/disable.
 *
 * Designed to integrate into the chat header area without disrupting layout.
 * Uses shadcn/ui Slider for volume control.
 *
 * @module soundscape-controls
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import type { UseSoundscapeReturn } from "@/hooks/use-soundscape";

interface SoundscapeControlsProps {
  soundscape: UseSoundscapeReturn;
  className?: string;
}

/** Speaker icon (unmuted state) */
function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

/** Muted speaker icon */
function SpeakerOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

/** Music/soundscape icon for master toggle */
function MusicIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

export default function SoundscapeControls({
  soundscape,
  className,
}: SoundscapeControlsProps) {
  const {
    volume,
    muted,
    enabled,
    autoplayBlocked,
    reducedMotionMuted,
    soundscapeName,
    setVolume,
    toggleMute,
    toggleEnabled,
    activateAudio,
  } = soundscape;

  // Track previous enabled state for aria-live announcements
  const prevEnabledRef = useRef(enabled);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (prevEnabledRef.current !== enabled) {
      setAnnouncement(
        enabled
          ? `${t("soundscape.a11yEnabled")}: ${soundscapeName ?? t("soundscape.ambientSound")}`
          : t("soundscape.a11yDisabled")
      );
      prevEnabledRef.current = enabled;
    }
  }, [enabled, soundscapeName]);

  const volumePercent = Math.round(volume * 100);

  // If autoplay is blocked, show activation button
  if (autoplayBlocked && enabled) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={activateAudio}
        className="text-xs text-muted-foreground hover:text-white shrink-0 gap-1"
        aria-label={t("soundscape.activateAudio")}
      >
        <MusicIcon />
        <span className="hidden sm:inline">{t("soundscape.activateAudio")}</span>
      </Button>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 shrink-0 ${className ?? ""}`}
      role="group"
      aria-label={t("soundscape.controlsLabel")}
    >
      {/* Master toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleEnabled}
        className={`h-8 w-8 p-0 ${
          enabled
            ? "text-primary hover:text-primary/80"
            : "text-muted-foreground hover:text-white"
        }`}
        aria-label={
          enabled
            ? t("soundscape.disableAmbient")
            : t("soundscape.enableAmbient")
        }
        aria-pressed={enabled}
        title={
          enabled
            ? `${t("soundscape.ambientSound")}: ${soundscapeName ?? t("soundscape.on")}`
            : t("soundscape.ambientOff")
        }
      >
        <MusicIcon />
      </Button>

      {enabled && (
        <>
          {/* Mute toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
            aria-label={
              muted
                ? t("soundscape.unmute")
                : t("soundscape.mute")
            }
            aria-pressed={muted}
          >
            {muted ? <SpeakerOffIcon /> : <SpeakerIcon />}
          </Button>

          {/* Volume slider */}
          <div className="w-16 sm:w-20">
            <Slider
              value={[volumePercent]}
              min={0}
              max={100}
              step={5}
              onValueChange={(vals) => setVolume(vals[0] / 100)}
              aria-label={t("soundscape.volumeLabel")}
              aria-valuetext={`${volumePercent}%`}
              disabled={muted}
              className="cursor-pointer"
            />
          </div>

          {/* Reduced motion indicator */}
          {reducedMotionMuted && (
            <span
              className="text-[10px] text-amber-400 hidden sm:inline"
              title={t("soundscape.reducedMotionHint")}
            >
              {t("soundscape.a11yMuted")}
            </span>
          )}
        </>
      )}

      {/* Soundscape state announcements (screen reader only) */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
