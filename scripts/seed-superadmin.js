/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DATABASE_URL_DOCKER,
});

async function seedSuperadmin() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const fullName = process.env.SUPERADMIN_NAME || "Super Admin";

  if (!email || !password) {
    console.log("SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD env vars are required.");
    process.exit(0);
  }

  try {
    const { rows: existing } = await pool.query(
      "SELECT id FROM public.profiles WHERE email = $1",
      [email]
    );

    if (existing.length > 0) {
      console.log(`User ${email} exists. Updating to superadmin...`);
      await pool.query(
        "UPDATE public.profiles SET is_superadmin = true WHERE email = $1",
        [email]
      );
    } else {
      console.log(`Creating superadmin ${email}...`);
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query(
        `INSERT INTO public.profiles (email, password_hash, full_name, is_superadmin)
         VALUES ($1, $2, $3, true)`,
        [email, passwordHash, fullName]
      );
    }
    console.log("Superadmin seeded successfully.");
  } catch (error) {
    console.error("Error seeding superadmin:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedSuperadmin();
