import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Egg } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getOnboardingState } from "@/lib/data/onboarding";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_PRICES } from "@/lib/domain/default-prices";
import { farmToday } from "@/lib/format";
import { FarmStep } from "./steps/farm-step";
import { HouseStep } from "./steps/house-step";
import { FlockStep } from "./steps/flock-step";
import { PricingStep } from "./steps/pricing-step";
import { StepProgress } from "./steps/step-progress";

export const metadata: Metadata = { title: "Set up your farm" };

const STEP_INDEX = { farm: 1, house: 2, flock: 3, pricing: 4, done: 4 } as const;

export default async function OnboardingPage() {
  const user = await requireUser();
  const state = await getOnboardingState(user.id);

  if (state.step === "done") redirect("/dashboard");

  const supabase = await createSupabaseServerClient();

  // Only the step being rendered needs supporting data, so nothing else is
  // fetched.
  const houses =
    state.step === "flock" && state.farmId
      ? (
          await supabase
            .from("houses")
            .select("id, name, capacity")
            .eq("farm_id", state.farmId)
            .order("name")
        ).data ?? []
      : [];

  const eggSizes =
    state.step === "pricing" && state.farmId
      ? (
          await supabase
            .from("egg_sizes")
            .select("id, name, code")
            .eq("farm_id", state.farmId)
            .eq("is_active", true)
            .order("sort_order")
        ).data ?? []
      : [];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-4">
        <div className="inline-flex items-center gap-2 font-semibold">
          <Egg className="size-5 text-primary" aria-hidden />
          LayerFlow
        </div>
        <StepProgress current={STEP_INDEX[state.step]} total={4} />
      </header>

      <main id="main" className="flex-1">
        {state.step === "farm" && <FarmStep />}
        {state.step === "house" && <HouseStep farmName={state.farmName ?? "your farm"} />}
        {state.step === "flock" && <FlockStep houses={houses} today={farmToday()} />}
        {state.step === "pricing" && (
          <PricingStep
            sizes={eggSizes.map((size) => ({
              ...size,
              suggested: DEFAULT_PRICES[size.code] ?? { perEgg: 0, perTray: 0 },
            }))}
            today={farmToday()}
          />
        )}
      </main>
    </div>
  );
}
