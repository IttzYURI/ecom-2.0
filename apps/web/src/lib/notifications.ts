import { createStoredNotification } from "./notifications-store";

type EmailInput = {
  tenantId: string;
  to: string;
  subject: string;
  text: string;
};

export async function sendEmailNotification(input: EmailInput) {
  let status: "queued" | "sent" | "failed" = "queued";

  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: input.to }] }],
          from: { email: process.env.SENDGRID_FROM_EMAIL },
          subject: input.subject,
          content: [{ type: "text/plain", value: input.text }]
        })
      });

      status = response.ok ? "sent" : "failed";
    } catch {
      status = "failed";
    }
  }

  return createStoredNotification(input.tenantId, {
    channel: "email",
    to: input.to,
    subject: input.subject,
    text: input.text,
    status
  });
}
