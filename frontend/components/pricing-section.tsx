import { getActivePlans } from "@/actions/payments/get-plans";
import { PricingCards } from "./pricing-cards";

interface PricingSectionProps {
  isLoggedIn: boolean;
}

export const PricingSection = async ({ isLoggedIn }: PricingSectionProps) => {
  const { plans } = await getActivePlans();

  if (!plans || plans.length === 0) {
    return null;
  }

  return (
    <section id="pricing" className="w-full py-20 border-t">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Choose Your Plan
          </h2>
          <p className="mt-3 text-muted-foreground">
            Select the perfect plan for your needs. All plans include a 14-day free trial.
          </p>
        </div>

        <div className="mt-12">
          <PricingCards plans={plans} isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </section>
  );
};
