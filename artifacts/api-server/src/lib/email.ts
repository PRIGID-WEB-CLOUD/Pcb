import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: { user, pass },
  });
}

export async function sendAdminOtp(email: string, code: string, name?: string | null): Promise<{ dev: boolean }> {
  const transport = getTransport();
  const from = process.env.SMTP_FROM ?? "Luxe Boutique Admin <admin@luxeboutique.com>";

  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"/></head>
  <body style="margin:0;padding:0;background:#f8f9ff;font-family:Manrope,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
      <tr><td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#080e0b;padding:32px 40px;text-align:center;">
              <span style="display:inline-flex;align-items:center;gap:10px;">
                <span style="background:#006c49;width:32px;height:32px;border-radius:6px;display:inline-block;line-height:32px;text-align:center;font-size:16px;">🏪</span>
                <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">Luxe Boutique</span>
              </span>
              <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:8px 0 0;letter-spacing:0.15em;text-transform:uppercase;">Admin Portal</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="font-size:13px;color:#7c839b;margin:0 0 6px;">Hello${name ? `, ${name}` : ""},</p>
              <h1 style="font-size:24px;color:#0a0f0d;margin:0 0 8px;font-weight:600;">Your sign-in code</h1>
              <p style="font-size:14px;color:#7c839b;margin:0 0 32px;line-height:1.6;">
                Use the code below to sign in to the Luxe Boutique admin portal.<br/>
                This code expires in <strong style="color:#0a0f0d;">10 minutes</strong>.
              </p>
              <div style="background:#f8f9ff;border:2px dashed #e2e8f0;border-radius:12px;padding:28px;text-align:center;margin-bottom:32px;">
                <span style="font-size:42px;font-weight:800;letter-spacing:0.25em;color:#0a0f0d;font-family:monospace;">${code}</span>
              </div>
              <p style="font-size:12px;color:#7c839b;margin:0;line-height:1.6;">
                If you didn't request this code, you can safely ignore this email.<br/>
                Never share this code with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9ff;padding:20px 40px;border-top:1px solid #f1f3f9;">
              <p style="font-size:11px;color:#b0b8cc;margin:0;text-align:center;">
                © ${new Date().getFullYear()} Luxe Boutique · Admin Portal · All access is monitored and logged.
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>`;

  if (!transport) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`  ADMIN OTP CODE (dev — no SMTP configured)`);
    console.log(`  To:   ${email}`);
    console.log(`  Code: ${code}`);
    console.log(`${"=".repeat(50)}\n`);
    return { dev: true };
  }

  await transport.sendMail({ from, to: email, subject: `${code} — Your Luxe Boutique admin sign-in code`, html });
  return { dev: false };
}
