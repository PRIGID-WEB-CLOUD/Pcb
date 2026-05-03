import nodemailer from "nodemailer";
import { getSmtpConfig } from "./settings";

async function buildTransport() {
  const smtp = await getSmtpConfig();
  if (!smtp.host || !smtp.user || !smtp.pass) return null;
  const secure = smtp.port === 465;
  return {
    transport: nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure,
      requireTLS: !secure,
      tls: { rejectUnauthorized: false },
      auth: { user: smtp.user, pass: smtp.pass },
    }),
    from: smtp.from ?? `Luxe Boutique <${smtp.user}>`,
  };
}

export async function isSmtpConfigured(): Promise<boolean> {
  const smtp = await getSmtpConfig();
  return !!(smtp.host && smtp.user && smtp.pass);
}

export async function sendCampaignEmail(to: string, subject: string, body: string): Promise<void> {
  const built = await buildTransport();
  const html = buildCampaignHtml(body);

  if (!built) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`  CAMPAIGN EMAIL (dev — SMTP not configured)`);
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:    ${body.slice(0, 80)}…`);
    console.log(`${"─".repeat(50)}\n`);
    return;
  }

  await built.transport.sendMail({ from: built.from, to, subject, html });
}

export async function sendAdminOtp(email: string, code: string, name?: string | null): Promise<{ dev: boolean }> {
  const built = await buildTransport();

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f8f9ff;font-family:Manrope,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#080e0b;padding:32px 40px;text-align:center;">
            <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">✦ Luxe Boutique Admin</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="font-size:13px;color:#7c839b;margin:0 0 6px;">Hello${name ? `, ${name}` : ""},</p>
            <h1 style="font-size:24px;color:#0a0f0d;margin:0 0 8px;font-weight:600;">Your sign-in code</h1>
            <p style="font-size:14px;color:#7c839b;margin:0 0 32px;line-height:1.6;">
              Use the code below to sign in. It expires in <strong style="color:#0a0f0d;">10 minutes</strong>.
            </p>
            <div style="background:#f8f9ff;border:2px dashed #e2e8f0;border-radius:12px;padding:28px;text-align:center;margin-bottom:32px;">
              <span style="font-size:42px;font-weight:800;letter-spacing:0.25em;color:#0a0f0d;font-family:monospace;">${code}</span>
            </div>
            <p style="font-size:12px;color:#7c839b;margin:0;line-height:1.6;">
              If you didn't request this, ignore this email. Never share this code.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9ff;padding:20px 40px;border-top:1px solid #f1f3f9;text-align:center;">
            <p style="font-size:11px;color:#b0b8cc;margin:0;">
              © ${new Date().getFullYear()} Luxe Boutique · Admin Portal
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  if (!built) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`  ADMIN OTP CODE (dev — SMTP not configured)`);
    console.log(`  To:   ${email}`);
    console.log(`  Code: ${code}`);
    console.log(`${"=".repeat(50)}\n`);
    return { dev: true };
  }

  await built.transport.sendMail({
    from: built.from,
    to: email,
    subject: `${code} — Your Luxe Boutique admin sign-in code`,
    html,
  });
  return { dev: false };
}

export async function sendPasswordResetEmail(email: string, resetLink: string, name?: string | null): Promise<{ dev: boolean }> {
  const built = await buildTransport();

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f8f9ff;font-family:Manrope,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#080e0b;padding:32px 40px;text-align:center;">
            <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">✦ Luxe Boutique</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 8px;">
            <p style="font-size:13px;color:#7c839b;margin:0 0 6px;">Hello${name ? `, ${name}` : ""},</p>
            <h1 style="font-size:22px;color:#0a0f0d;margin:0 0 12px;font-weight:600;">Reset your password</h1>
            <p style="font-size:14px;color:#7c839b;margin:0 0 32px;line-height:1.6;">
              Click the button below to create a new password. This link expires in <strong style="color:#0a0f0d;">15 minutes</strong>.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="background:#0a0f0d;border-radius:10px;padding:0;">
                  <a href="${resetLink}" style="display:block;padding:16px 36px;color:#fff;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;">
                    Reset Password →
                  </a>
                </td>
              </tr>
            </table>
            <p style="font-size:11px;color:#b0b8cc;line-height:1.7;margin:0 0 8px;">
              Or copy and paste this link:<br/>
              <a href="${resetLink}" style="color:#006c49;word-break:break-all;">${resetLink}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9ff;padding:20px 40px;border-top:1px solid #f1f3f9;text-align:center;">
            <p style="font-size:11px;color:#b0b8cc;margin:0;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  if (!built) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`  PASSWORD RESET (dev — SMTP not configured)`);
    console.log(`  To:   ${email}`);
    console.log(`  Link: ${resetLink}`);
    console.log(`${"─".repeat(50)}\n`);
    return { dev: true };
  }

  await built.transport.sendMail({
    from: built.from,
    to: email,
    subject: `Reset your Luxe Boutique password`,
    html,
  });
  return { dev: false };
}

export async function sendCustomerResetEmail(email: string, resetLink: string, name?: string | null): Promise<{ dev: boolean }> {
  return sendPasswordResetEmail(email, resetLink, name);
}

export async function sendTeamInvite(
  to: string,
  opts: { invitedBy: string; role: string; name?: string | null; inviteLink: string; expiryDays?: number },
): Promise<{ dev: boolean }> {
  const built = await buildTransport();
  const displayName = opts.name ?? to.split("@")[0];
  const origin = process.env.FRONTEND_URL ?? "https://luxeboutique.com";
  const fullLink = `${origin}${opts.inviteLink}`;
  const expiry = opts.expiryDays ?? 7;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f8f9ff;font-family:Manrope,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#080e0b;padding:32px 40px;text-align:center;">
            <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">✦ Luxe Boutique Admin</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 8px;">
            <p style="font-size:13px;color:#7c839b;margin:0 0 6px;">Hello, ${displayName}!</p>
            <h1 style="font-size:22px;color:#0a0f0d;margin:0 0 12px;font-weight:600;">You've been invited to the team</h1>
            <p style="font-size:14px;color:#7c839b;margin:0 0 8px;line-height:1.6;">
              <strong style="color:#0a0f0d;">${opts.invitedBy}</strong> has invited you to join the
              <strong style="color:#0a0f0d;">Luxe Boutique</strong> admin team as a
              <strong style="color:#006c49;">${opts.role}</strong>.
            </p>
            <p style="font-size:13px;color:#7c839b;margin:0 0 32px;line-height:1.6;">
              This invitation expires in <strong style="color:#0a0f0d;">${expiry} days</strong>.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="background:#0a0f0d;border-radius:10px;padding:0;">
                  <a href="${fullLink}" style="display:block;padding:16px 36px;color:#fff;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;">
                    Accept Invitation →
                  </a>
                </td>
              </tr>
            </table>
            <p style="font-size:11px;color:#b0b8cc;line-height:1.7;margin:0 0 8px;">
              Or copy and paste this link:<br/>
              <a href="${fullLink}" style="color:#006c49;word-break:break-all;">${fullLink}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9ff;padding:20px 40px;border-top:1px solid #f1f3f9;text-align:center;">
            <p style="font-size:11px;color:#b0b8cc;margin:0;">
              If you didn't expect this invitation, you can safely ignore this email.<br/>
              © ${new Date().getFullYear()} Luxe Boutique · Admin Portal
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  if (!built) {
    console.log(`\n${"─".repeat(50)}`);
    console.log(`  TEAM INVITE (dev — SMTP not configured)`);
    console.log(`  To:          ${to}`);
    console.log(`  Invited by:  ${opts.invitedBy}`);
    console.log(`  Role:        ${opts.role}`);
    console.log(`  Link:        ${fullLink}`);
    console.log(`${"─".repeat(50)}\n`);
    return { dev: true };
  }

  await built.transport.sendMail({
    from: built.from,
    to,
    subject: `You're invited to join the Luxe Boutique admin team`,
    html,
  });
  return { dev: false };
}

function buildCampaignHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8f9ff;font-family:Manrope,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#080e0b;padding:28px 40px;text-align:center;">
            <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">✦ Luxe Boutique</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <div style="font-size:15px;color:#2d3748;line-height:1.8;white-space:pre-wrap;">${body}</div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9ff;padding:20px 40px;border-top:1px solid #f1f3f9;text-align:center;">
            <p style="font-size:11px;color:#b0b8cc;margin:0;">
              You're receiving this because you subscribed at Luxe Boutique.<br/>
              © ${new Date().getFullYear()} Luxe Boutique · All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
