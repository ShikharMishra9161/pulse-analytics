import { vi } from "vitest";
import { configureTestDatabase } from "./env";

configureTestDatabase();
process.env.AUTH_SECRET ??= "test-secret-test-secret-test-secret-123";
process.env.UPSTASH_REDIS_REST_URL = "";
process.env.UPSTASH_REDIS_REST_TOKEN = "";

// Keep test output clean: the mock mailer logs every email.
vi.spyOn(console, "info").mockImplementation(() => undefined);
