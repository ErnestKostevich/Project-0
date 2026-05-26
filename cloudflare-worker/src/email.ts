/**
 * Tiny Resend client. Free tier = 3K emails/month, more than enough for
 * indie-scale license delivery.
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 */

interface SendArgs {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(a: SendArgs): Promise<void> {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${a.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: a.from,
      to: a.to,
      subject: a.subject,
      html: a.html,
      text: a.text,
    }),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "<unreadable>");
    throw new Error(`Resend ${r.status}: ${text.slice(0, 300)}`);
  }
}

export function licenseEmailHtml(opts: {
  brand: string;
  licenseKey: string;
  plan: "pro" | "dlc";
  productId?: string;
}): string {
  const planLine =
    opts.plan === "pro"
      ? `<strong>${opts.brand} Pro</strong> is active for the next 31 days.`
      : `Your <strong>${opts.productId ?? "character"}</strong> unlock is yours forever.`;

  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,sans-serif;line-height:1.5;color:#2a1a2a;max-width:520px;margin:0 auto;padding:32px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#FF85A1,#FF6789);box-shadow:0 4px 14px rgba(255,103,137,0.4);"></div>
  </div>
  <h1 style="font-family:Quicksand,sans-serif;font-size:24px;margin:0 0 12px;background:linear-gradient(135deg,#FF6789,#B575C7);-webkit-background-clip:text;color:transparent;">Thanks for supporting ${opts.brand} ✨</h1>
  <p>${planLine}</p>
  <p style="margin:24px 0 8px;font-weight:600;font-size:13px;color:#5b4a5b;">Your license key</p>
  <div style="font-family:JetBrains Mono,Courier,monospace;font-size:12px;background:#FFF6F8;border:1px solid #FFCBDB;border-radius:10px;padding:14px;word-break:break-all;color:#2a1a2a;">${opts.licenseKey}</div>
  <p style="margin-top:24px;font-size:14px;">Open ${opts.brand}, hit ⚙ Settings, paste this key in the "License" field. ${opts.plan === "pro" ? "Renewal email arrives ~1 day before period end." : ""}</p>
  <p style="font-size:12px;color:#8e7e8e;margin-top:32px;border-top:1px solid #e5e5e5;padding-top:16px;">Need help? Reply to this email.<br/>${opts.brand} is an indie project, your support keeps it alive.</p>
</body></html>`;
}
