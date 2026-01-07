/* eslint-disable @typescript-eslint/no-require-imports */
const { pool, runBillingCycle } = require("./billing");

const run = async () => {
  try {
    const result = await runBillingCycle();
    console.log("[billing] monthly:", result.monthly);
    console.log("[billing] registration:", result.registration);
  } catch (err) {
    console.error("[billing] failed:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
