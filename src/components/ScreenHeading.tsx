import { ChevronDown } from "lucide-react";
export function ScreenHeading({ title }: { title: string }) {
  return (
    <div className="bg-teal text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
        <ChevronDown className="h-6 w-6 shrink-0" aria-hidden />
        <h1 className="screen-heading font-display text-2xl">{title}</h1>
      </div>
    </div>
  );
}
