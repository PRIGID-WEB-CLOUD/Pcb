import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

let resend: Resend | null = null;

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY environment variable is required');
  }
  if (!resend) {
    resend = new Resend(key);
  }
  return resend;
}

export async function POST(req: Request) {
  try {
    const { subject, content } = await req.json();

    if (!subject || !content) {
      return NextResponse.json({ error: "Subject and content are required" }, { status: 400 });
    }

    const subscribers = await prisma.newsletter.findMany();
    const emails = subscribers.map((sub) => sub.email);

    if (emails.length === 0) {
      return NextResponse.json({ error: "No subscribers found" }, { status: 400 });
    }

    const resendClient = getResend();
    const { data, error } = await resendClient.emails.send({
      from: 'newsletter@yourdomain.com', // Need a verified domain
      to: emails,
      subject: subject,
      html: content,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Campaign sent successfully!" });
  } catch (error) {
    console.error("Error sending newsletter:", error);
    return NextResponse.json({ error: "Failed to send newsletter" }, { status: 500 });
  }
}
