import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublicHolidays, syncCountryHolidays } from "@/lib/public-holidays.server";
afterEach(()=>vi.unstubAllGlobals());
describe("automatic country holidays",()=>{
  it("fetches only national public holidays and validates the source year",async()=>{
    const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>[
      {date:"2027-01-01",name:"National",nationalHoliday:true,holidayTypes:["Public"]},
      {date:"2027-02-01",name:"Regional",nationalHoliday:false,holidayTypes:["Public"]},
      {date:"2027-03-01",name:"Optional",nationalHoliday:true,holidayTypes:["Observance"]},
    ]});vi.stubGlobal("fetch",fetcher);
    expect(await fetchPublicHolidays(2027,"GB")).toEqual([{date:"2027-01-01",name:"National"}]);
    expect(fetcher).toHaveBeenCalledWith("https://nagerholidays.com/api/v4/Holidays/GB/2027",expect.any(Object));
    await expect(fetchPublicHolidays(2027,"../GB")).rejects.toThrow("Invalid");
  });
  it("keeps country calendars separate and fetches the current and next year only when stale",async()=>{
    const now=new Date("2026-11-23T10:00:00Z");
    const cache={load:vi.fn(async(country:string)=>country==="ZA"?now.toISOString():null),save:vi.fn(async()=>{})};
    const lookup=vi.fn(async(year:number)=>[{date:`${year}-01-01`,name:"Holiday"}]);
    expect(await syncCountryHolidays(["ZA","GB","GB"],cache,lookup,now)).toEqual({updated:2,failures:[]});
    expect(lookup.mock.calls).toEqual([[2026,"GB"],[2027,"GB"]]);
    expect(cache.save.mock.calls).toEqual([["GB",2026,["2026-01-01"]],["GB",2027,["2027-01-01"]]]);
  });
  it("keeps the saved calendar when the holiday provider fails",async()=>{
    const cache={load:vi.fn(async()=>"2026-01-01T00:00:00Z"),save:vi.fn(async()=>{})};
    const result=await syncCountryHolidays(["GB"],cache,vi.fn().mockRejectedValue(new Error("Offline")),new Date("2026-11-23"));
    expect(result.failures).toHaveLength(2);expect(cache.save).not.toHaveBeenCalled();
  });
});
