import { connect as connectNet, type Socket } from "node:net";
import { connect as connectTls, type TLSSocket } from "node:tls";
import { db, appSettingsTable } from "@workspace/db";

type SmtpSocket = Socket | TLSSocket;

type Email = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

async function smtpSettings() {
  const rows = await db.select().from(appSettingsTable);
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const host = settings.smtp_host?.trim();
  const user = settings.smtp_user?.trim();
  const pass = settings.smtp_pass;
  const port = Number(settings.smtp_port || 587);
  if (!host || !user || !pass || !Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("SMTP is not configured.");
  }
  return { host, user, pass, port, from: settings.smtp_from?.trim() || user };
}

class SmtpClient {
  private socket: SmtpSocket | null = null;
  private buffer = "";
  private pending: { resolve: (value: string) => void; reject: (error: Error) => void } | null = null;

  private attach(socket: SmtpSocket) {
    this.socket = socket;
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      this.buffer += chunk;
      this.consume();
    });
    socket.on("error", (error) => this.pending?.reject(error));
    socket.on("close", () => this.pending?.reject(new Error("SMTP connection closed unexpectedly.")));
  }

  private consume() {
    if (!this.pending) return;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? "";
    const complete = lines.find((line) => /^\d{3} /.test(line));
    if (!complete) {
      this.buffer = `${lines.join("\r\n")}${this.buffer ? `\r\n${this.buffer}` : ""}`;
      return;
    }
    const response = [...lines, complete].join("\n");
    this.buffer = "";
    const pending = this.pending;
    this.pending = null;
    pending.resolve(response);
  }

  private readResponse() {
    return new Promise<string>((resolve, reject) => {
      this.pending = { resolve, reject };
      this.consume();
    });
  }

  private async command(command: string, expected: number) {
    if (!this.socket) throw new Error("SMTP connection is not open.");
    this.socket.write(`${command}\r\n`);
    const response = await this.readResponse();
    const code = Number(response.slice(0, 3));
    if (code !== expected) throw new Error(`SMTP rejected ${command.split(" ")[0]} with code ${code}.`);
    return response;
  }

  async connect(host: string, port: number) {
    const raw = port === 465
      ? connectTls({ host, port, servername: host })
      : connectNet({ host, port });
    await new Promise<void>((resolve, reject) => {
      raw.once("error", reject);
      raw.once(port === 465 ? "secureConnect" : "connect", () => resolve());
    });
    this.attach(raw);
    const greeting = await this.readResponse();
    if (Number(greeting.slice(0, 3)) !== 220) throw new Error("SMTP server did not send a greeting.");
    const ehlo = await this.command("EHLO luxeboutique.com", 250);
    if (port !== 465 && !/\bSTARTTLS\b/i.test(ehlo)) {
      throw new Error("SMTP server does not support STARTTLS.");
    }
    if (port !== 465) {
      await this.command("STARTTLS", 220);
      const old = this.socket as Socket;
      old.removeAllListeners("data");
      old.removeAllListeners("error");
      old.removeAllListeners("close");
      const secure = connectTls({ socket: old, servername: host });
      await new Promise<void>((resolve, reject) => {
        secure.once("error", reject);
        secure.once("secureConnect", resolve);
      });
      this.attach(secure);
      await this.command("EHLO luxeboutique.com", 250);
    }
  }

  async send(from: string, email: Email, user: string, pass: string) {
    await this.command("AUTH LOGIN", 334);
    await this.command(Buffer.from(user).toString("base64"), 334);
    await this.command(Buffer.from(pass).toString("base64"), 235);
    await this.command(`MAIL FROM:<${from}>`, 250);
    await this.command(`RCPT TO:<${email.to}>`, 250);
    await this.command("DATA", 354);
    const boundary = `=_LUXE_${Date.now().toString(36)}`;
    const body = email.html
      ? `--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${email.text}\r\n--${boundary}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${email.html}\r\n--${boundary}--`
      : email.text;
    const headers = [
      `From: ${from}`,
      `To: ${email.to}`,
      `Subject: =?UTF-8?B?${Buffer.from(email.subject).toString("base64")}?=`,
      "MIME-Version: 1.0",
      email.html ? `Content-Type: multipart/alternative; boundary="${boundary}"` : "Content-Type: text/plain; charset=utf-8",
      "",
      body,
    ].join("\r\n").replace(/^\./gm, "..");
    this.socket?.write(`${headers}\r\n.\r\n`);
    const response = await this.readResponse();
    if (Number(response.slice(0, 3)) !== 250) throw new Error("SMTP server rejected the message.");
    await this.command("QUIT", 221).catch(() => undefined);
    this.socket?.end();
  }
}

export async function sendEmail(email: Email) {
  const settings = await smtpSettings();
  const client = new SmtpClient();
  await client.connect(settings.host, settings.port);
  await client.send(settings.from, email, settings.user, settings.pass);
}

export async function getConfiguredSender() {
  return (await smtpSettings()).from;
}