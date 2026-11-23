import { expect,it,vi } from "vitest";
import { dispatchQueuedEmails } from "@/lib/email-dispatch.server";
it("does not contact Resend or process user emails during development",async()=>{
  const network=vi.spyOn(globalThis,"fetch");
  expect(await dispatchQueuedEmails(["any-queued-id"])).toEqual({processed:0,sent:0,paused:true,results:[]});
  expect(network).not.toHaveBeenCalled();network.mockRestore();
});
