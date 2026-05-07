import { Router, type IRouter } from "express";
import { Resend } from "resend";
import { z } from "zod";

const router: IRouter = Router();

const ContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(254),
  phone: z.string().max(30).optional().default(""),
  company: z.string().min(1).max(200),
  subject: z.string().min(1).max(100),
  message: z.string().min(1).max(5000),
});

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const ipTimestamps = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const times = (ipTimestamps.get(ip) ?? []).filter(t => t > cutoff);
  if (times.length >= RATE_LIMIT_MAX) return true;
  times.push(now);
  ipTimestamps.set(ip, times);
  return false;
}

router.post("/contact", async (req, res) => {
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown";

  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return;
  }

  const parsed = ContactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { firstName, lastName, email, phone, company, subject, message } = parsed.data;

  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    req.log.info({ firstName, lastName, email, company, subject, message }, "Contact form submission (email service not configured — logged only)");
    res.json({ success: true });
    return;
  }

  const to = process.env["CONTACT_EMAIL_TO"] ?? "hello@chemidot.com";
  const resend = new Resend(apiKey);

  const safeName = esc(`${firstName} ${lastName}`);
  const safeEmail = esc(email);
  const safePhone = esc(phone ?? "");
  const safeCompany = esc(company);
  const safeSubject = esc(subject);
  const safeMessage = esc(message);

  try {
    const { error } = await resend.emails.send({
      from: "Chemidot Contact Form <onboarding@resend.dev>",
      to,
      replyTo: email,
      subject: `[Contact Form] ${safeSubject} — ${safeName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
          <h2 style="color: #0f4c81; margin-bottom: 4px;">New Contact Form Submission</h2>
          <p style="color: #666; margin-top: 0; margin-bottom: 24px; font-size: 14px;">Received via chemidot.com/contact</p>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; font-weight: 600; width: 140px; color: #555;">Name</td>
              <td style="padding: 10px 0;">${safeName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; font-weight: 600; color: #555;">Email</td>
              <td style="padding: 10px 0;"><a href="mailto:${safeEmail}" style="color: #0f4c81;">${safeEmail}</a></td>
            </tr>
            ${safePhone ? `<tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; font-weight: 600; color: #555;">Phone</td>
              <td style="padding: 10px 0;">${safePhone}</td>
            </tr>` : ""}
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; font-weight: 600; color: #555;">Company</td>
              <td style="padding: 10px 0;">${safeCompany}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; font-weight: 600; color: #555;">Subject</td>
              <td style="padding: 10px 0;">${safeSubject}</td>
            </tr>
          </table>

          <div style="margin-top: 24px;">
            <p style="font-weight: 600; color: #555; margin-bottom: 8px;">Message</p>
            <div style="background: #f7f7f7; border-left: 4px solid #0f4c81; padding: 16px; border-radius: 0 6px 6px 0; white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${safeMessage}</div>
          </div>

          <p style="margin-top: 32px; font-size: 12px; color: #999;">
            Reply directly to this email to respond to ${esc(firstName)}.
          </p>
        </div>
      `,
    });

    if (error) {
      req.log.error({ error }, "Resend API error");
      res.status(500).json({ error: "Failed to send email" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Unexpected error sending contact email");
    res.status(500).json({ error: "Failed to send email" });
  }
});

export default router;
