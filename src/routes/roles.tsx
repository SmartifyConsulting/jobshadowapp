import { createFileRoute } from "@tanstack/react-router";
import { CareerCatalogue } from "@/components/CareerCatalogue";

export const Route = createFileRoute("/roles")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } => ({
    q: typeof s["q"] === "string" ? (s["q"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Careers — See the job shadows you can book | Job Shadow" },
      {
        name: "description",
        content:
          "Browse every career you can shadow, from Accountant to Veterinarian, across business, education, health, design, engineering, ICT and more.",
      },
      { property: "og:title", content: "Careers — Job Shadow" },
      {
        property: "og:description",
        content: "Already have an idea of your dream career? See the job shadows you can book.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CareerCatalogue,
});
