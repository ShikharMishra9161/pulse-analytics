import { config } from "dotenv";

config({ quiet: true });

/** Points Prisma at the dedicated test database — never the dev database. */
export function configureTestDatabase(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
  if (process.env.PULSE_TEST_DB_ACTIVE === "1" && process.env.DATABASE_URL === url) return url;
  if (url === process.env.DIRECT_URL || url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL — tests wipe it.");
  }
  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = url;
  process.env.PULSE_TEST_DB_ACTIVE = "1";
  return url;
}
