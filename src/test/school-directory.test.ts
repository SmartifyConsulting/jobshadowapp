import { expect,it } from "vitest";
import { schoolDirectory } from "@/lib/school-directory";
import type { AccountRow } from "@/lib/users.server";
it("groups current scholar schools without creating accounts or merging different names",()=>{
  const account=(id:string,school:string,roles=["user"],is_spam=false)=>({id,school,roles,is_spam}) as AccountRow;
  const rows=schoolDirectory([account("a","  Example   School "),account("b","example school"),account("c","Another School"),account("d","Unknown"),account("e","School Contact",["school"]),account("spam","Example School",["user"],true)]);
  expect(rows.map((row)=>[row.name,row.scholars.length])).toEqual([["Another School",1],["Example School",2]]);
});
