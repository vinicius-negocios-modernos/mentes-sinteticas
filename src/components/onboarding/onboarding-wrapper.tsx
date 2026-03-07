"use client";

import { useOnboarding } from "@/hooks/use-onboarding";
import OnboardingDialog from "@/components/onboarding/onboarding-dialog";

/**
 * Client wrapper that conditionally renders the onboarding dialog.
 * Place this in the home page layout -- it reads localStorage after mount
 * and only shows the dialog on first visit.
 */
export default function OnboardingWrapper() {
  const { shouldShowOnboarding, completeOnboarding, skipOnboarding } =
    useOnboarding();

  if (!shouldShowOnboarding) return null;

  return (
    <OnboardingDialog
      open={shouldShowOnboarding}
      onComplete={completeOnboarding}
      onSkip={skipOnboarding}
    />
  );
}
