/* eslint-disable @typescript-eslint/no-require-imports */
const cron = require("node-cron");
const { processBillingRun } = require("./billing");
const { processNotifications } = require("./notifications");

const { runBillingCycle } = require("./billing");
const { runNotificationsCycle } = require("./notifications");

const billingSchedule = process.env.BILLING_CRON || "0 2 * * *";
const billingTimezone = process.env.BILLING_TZ || "UTC";
const notifySchedule = process.env.NOTIFY_CRON || "0 * * * *";
const notifyTimezone = process.env.NOTIFY_TZ || billingTimezone;

const runBillingJob = async () => {
  try {
    const result = await runBillingCycle();
    console.log(
      `[billing] run complete. monthly: ${JSON.stringify(
        result.monthly,
      )} registration: ${JSON.stringify(result.registration)}`,
    );
  } catch (err) {
    console.error("[billing] run failed:", err);
  }
};

const runNotificationsJob = async () => {
  try {
    const result = await runNotificationsCycle();
    console.log(
      `[notifications] run complete. low balance: ${JSON.stringify(
        result.lowBalance,
      )} reminders: ${JSON.stringify(result.reminders)}`,
    );
  } catch (err) {
    console.error("[notifications] run failed:", err);
  }
};

console.log(
  `[billing] scheduler active (${billingSchedule}, ${billingTimezone})`,
);
console.log(
  `[notifications] scheduler active (${notifySchedule}, ${notifyTimezone})`,
);

cron.schedule(billingSchedule, runBillingJob, { timezone: billingTimezone });
cron.schedule(notifySchedule, runNotificationsJob, { timezone: notifyTimezone });
runBillingJob();
runNotificationsJob();
