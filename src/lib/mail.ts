import "server-only";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Mock mail transport: prints messages to the server console.
 * Swap the body of `sendMail` for Resend / Postmark / SES in production —
 * callers don't need to change.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const divider = "─".repeat(64);
  console.info(
    `\n${divider}\n📧  To: ${message.to}\n    Subject: ${message.subject}\n\n${message.text}\n${divider}\n`,
  );
}

export function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}
