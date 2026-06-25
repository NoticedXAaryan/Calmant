// Redis and BullMQ have been disabled to prevent ECONNREFUSED crashes
// when running locally without a Redis instance.

export const connection = null;
export const entropyQueue = null;
export const scanQueue = null;
export const briefQueue = null;

export async function registerRepeatingJobs() {
  console.log("[BullMQ] Background jobs are disabled in this environment.");
}
