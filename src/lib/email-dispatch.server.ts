/** Delivery is deliberately paused throughout development. Keep messages in-app. */
export async function dispatchQueuedEmails(_ids?: string[]) {
  return { processed: 0, sent: 0, paused: true, results: [] as { id: string; ok: boolean; error?: string }[] };
}
