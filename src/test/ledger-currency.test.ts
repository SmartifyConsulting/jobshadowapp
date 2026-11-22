import { describe, expect, it, vi } from "vitest";
import { countryCurrency, deviceCountry, loadLedgerRate, localLedgerCost, formatLedgerMoney } from "@/lib/ledger-currency";

describe("Local ledger costs", () => {
  it("uses the device time zone rather than treating an English locale as the user's country", () => {
    expect(deviceCountry("en-US", "Africa/Johannesburg")).toBe("ZA");
    expect(countryCurrency("ZA")).toBe("ZAR");
    expect(countryCurrency("GB")).toBe("GBP");
  });
  it("keeps actual, estimated and unknown charges distinct", () => {
    expect(localLedgerCost({ cost_source: "provider", cost_usd: 0.2 }, "provider", 18)).toBeCloseTo(3.6);
    expect(localLedgerCost({ cost_source: "estimated", cost_usd: 0.2 }, "provider", 18)).toBeNull();
    expect(localLedgerCost({ cost_source: "unavailable", cost_usd: null }, "provider", 18)).toBeNull();
    expect(formatLedgerMoney(null, "ZAR")).toBe("Not reported");
  });
  it("validates currency-pair responses and rejects unavailable rates", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ base: "USD", quote: "ZAR", rate: 18, date: "2026-11-20" }) });
    expect((await loadLedgerRate("ZAR", fetcher as typeof fetch)).rate).toBe(18);
    fetcher.mockResolvedValue({ ok: false });
    await expect(loadLedgerRate("ZAR", fetcher as typeof fetch)).rejects.toThrow("unavailable");
    expect((await loadLedgerRate("USD", fetcher as typeof fetch)).rate).toBe(1);
  });
});
