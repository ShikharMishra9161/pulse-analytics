import { execSync } from "node:child_process";
import { configureTestDatabase } from "./env";

/** Applies migrations to the test database once per run. */
export default function setup() {
  const url = configureTestDatabase();
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });
}
