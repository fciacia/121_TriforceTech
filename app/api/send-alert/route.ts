import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { sme_name, score, threshold } = await request.json();

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the email for this SME from Supabase
    const { data, error } = await supabase
      .from('sme_profile')
      .select('email')
      .eq('name', sme_name)
      .limit(1)
      .single();

    if (error || !data?.email) {
      console.warn("Supabase Error or No Email:", error);
      console.log("Skipping email alert - SME profile not found. Using fallback.");
      return NextResponse.json({ 
        success: true, 
        message: 'Email alert skipped - profile not found in Supabase' 
      });
    }

    const recipientEmail = data.email;

    // Use configured SMTP; skip silently if not set up
    const smtpHost = process.env.SMTP_HOST
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('SMTP not configured — skipping email alert')
      return NextResponse.json({ success: true, message: 'Email alert skipped - SMTP not configured' })
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: { user: smtpUser, pass: smtpPass }
    });

    const info = await transporter.sendMail({
      from: '"GreenTrust Pulse" <alerts@greentrustpulse.com>',
      to: recipientEmail,
      subject: `🚨 URGENT: ESG Score Dropped Below Threshold`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #DC2626;">ESG Alert for ${sme_name}</h2>
          <p>Your supply chain network was recently scanned, and your ESG score dropped to <strong style="color: #DC2626; font-size: 1.2em;">${score}</strong>, which is below your safety threshold of <strong>${threshold}</strong>.</p>
          <p>Please log in to the dashboard immediately to review the supply chain risk and take remedial action.</p>
          <br/>
          <p>Regards,<br/><strong>GreenTrust Pulse Alert System</strong></p>
        </div>
      `,
    });

    console.log("Email sent successfully!");

    return NextResponse.json({
      success: true,
      email: recipientEmail,
      preview: nodemailer.getTestMessageUrl(info)
    });

  } catch (err: any) {
    console.error("Email send failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
