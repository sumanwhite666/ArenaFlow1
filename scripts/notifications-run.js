/* eslint-disable @typescript-eslint/no-require-imports */
const { processNotifications } = require("./notifications");

const run = async () => {
  try {
    const result = await runNotificationsCycle();
    console.log("[notifications] low balance:", result.lowBalance);
    console.log("[notifications] session reminders:", result.reminders);
  } catch (err) {
    console.error("[notifications] failed:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
