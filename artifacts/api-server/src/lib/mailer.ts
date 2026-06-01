import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  await transporter.sendMail({
    from: `"زراعة" <${process.env.GMAIL_USER}>`,
    to,
    subject: "كود التحقق - زراعة",
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
        <h2 style="color: #2d6a4f; margin-bottom: 8px;">منصة زراعة 🌱</h2>
        <p style="color: #374151; margin-bottom: 24px;">استخدم الكود التالي لتسجيل الدخول أو إنشاء حسابك:</p>
        <div style="background: #fff; border: 2px solid #2d6a4f; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #2d6a4f;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px;">الكود صالح لمدة 10 دقائق فقط. لا تشاركه مع أحد.</p>
      </div>
    `,
    text: `كود التحقق الخاص بك على منصة زراعة: ${otp}\n\nالكود صالح لمدة 10 دقائق.`,
  });
}
