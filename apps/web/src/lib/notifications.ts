import { createStoredNotification } from "./notifications-store";

type EmailInput = {
  tenantId: string;
  to: string;
  subject: string;
  text: string;
};

export async function sendEmailNotification(input: EmailInput) {
  let status: "queued" | "sent" | "failed" = "queued";
  let providerError: string | undefined;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim();
  const fromName = process.env.SENDGRID_FROM_NAME?.trim() || "Bella Roma Orders";
  const toEmail = input.to.trim();

  if (!toEmail) {
    status = "failed";
    providerError = "Missing recipient email address.";
  } else if (!process.env.SENDGRID_API_KEY) {
    status = "failed";
    providerError = "Missing SENDGRID_API_KEY environment variable.";
  } else if (!fromEmail) {
    status = "failed";
    providerError = "Missing SENDGRID_FROM_EMAIL environment variable.";
  }

  if (!providerError) {
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: toEmail }] }],
          from: { email: fromEmail, name: fromName },
          subject: input.subject,
          content: [{ type: "text/plain", value: input.text }]
        })
      });

      if (response.ok) {
        status = "sent";
      } else {
        status = "failed";

        const responseText = await response.text();

        providerError =
          responseText.trim() ||
          `SendGrid rejected the email with status ${response.status}.`;
      }
    } catch (error) {
      status = "failed";
      providerError = error instanceof Error ? error.message : "Unknown SendGrid request failure.";
    }
  }

  return createStoredNotification(input.tenantId, {
    channel: "email",
    to: toEmail,
    subject: input.subject,
    text: input.text,
    status,
    providerError
  });
}
