import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CareerDetailDialog } from "@/components/CareerDetailDialog";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("keeps favourite and complete-guide download actions working in the compact dialog", () => {
  const favourite = vi.fn();
  const originalCreate = Object.getOwnPropertyDescriptor(URL, "createObjectURL"),
    originalRevoke = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
  const create = vi.fn(() => "blob:career-guide"),
    revoke = vi.fn();
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: create });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revoke });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  try {
    render(
      <CareerDetailDialog
        open
        onOpenChange={vi.fn()}
        title="Accountant"
        category="Business"
        description="Financial records and reporting."
        availabilityLabel="0 of 3 mentors available"
        isFavourite={false}
        onToggleFavourite={favourite}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save Accountant to favourites" }));
    expect(favourite).toHaveBeenCalledOnce();
    const download = screen.getByRole("button", { name: "Download" });
    expect(download).toBeVisible();
    fireEvent.click(download);
    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe(
      "accountant-career-guide.txt",
    );
    expect(revoke).toHaveBeenCalledWith("blob:career-guide");
  } finally {
    if (originalCreate) Object.defineProperty(URL, "createObjectURL", originalCreate);
    else Reflect.deleteProperty(URL, "createObjectURL");
    if (originalRevoke) Object.defineProperty(URL, "revokeObjectURL", originalRevoke);
    else Reflect.deleteProperty(URL, "revokeObjectURL");
  }
});
