import { createServerFn } from "@tanstack/react-start";
import { answerSupportQuestion, type ChatMessage } from "./support-chat.server";

export const askSupportChat = createServerFn({ method: "POST" })
  .inputValidator((d: { history: ChatMessage[]; message: string; viewerRole?: string | undefined }) => d)
  .handler(async ({ data }) => {
    const message = data.message.trim().slice(0, 1000);
    if (!message) throw new Error("Please type a question.");
    const reply = await answerSupportQuestion(data.history.slice(-20), message, data.viewerRole);
    return { reply };
  });
