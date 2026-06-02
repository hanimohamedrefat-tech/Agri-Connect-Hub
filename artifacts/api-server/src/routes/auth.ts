import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { authMiddleware, signToken, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { sendOtpEmail } from "../lib/mailer";

const router: IRouter = Router();

// In-memory OTP store: key = email or phone, value = { otp, expiresAt, attempts }
const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number }>();

// Pre-verified emails for new-user registration (30 min TTL)
const preVerifiedEmails = new Map<string, number>();

// Rate limiter for send-otp: key = email, value = { count, windowStart }
const sendOtpRateLimit = new Map<string, { count: number; windowStart: number }>();

// Rate limiter for verify-otp: max 5 wrong attempts then OTP is invalidated (handled in otpStore.attempts)
const MAX_SEND_PER_HOUR = 3;
const MAX_VERIFY_ATTEMPTS = 5;

function checkSendRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = sendOtpRateLimit.get(key);
  if (!entry || now - entry.windowStart > 60 * 60 * 1000) {
    sendOtpRateLimit.set(key, { count: 1, windowStart: now });
    return true; // allowed
  }
  if (entry.count >= MAX_SEND_PER_HOUR) return false; // blocked
  entry.count++;
  return true;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /auth/send-otp
router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const { emailOrPhone } = req.body as { emailOrPhone: string };
  if (!emailOrPhone) {
    res.status(400).json({ error: "البريد الإلكتروني أو رقم الهاتف مطلوب" });
    return;
  }

  const key = emailOrPhone.trim().toLowerCase();

  // Rate limit: max 3 sends per email per hour
  if (!checkSendRateLimit(key)) {
    res.status(429).json({ error: "تجاوزت الحد المسموح به. انتظر ساعة قبل طلب كود جديد" });
    return;
  }

  const otp = generateOtp();
  otpStore.set(key, { otp, expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 }); // 10 min

  logger.info({ key }, "OTP generated");

  // Check if user exists
  const isEmail = key.includes("@");
  let userExists = false;
  if (isEmail) {
    const [u] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, key));
    userExists = !!u;
  } else {
    const [u] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.phone, key));
    userExists = !!u;
  }

  // Send OTP via email if the identifier is an email address
  const hasEmailCredentials = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  let devOtp: string | undefined;

  if (isEmail) {
    if (hasEmailCredentials) {
      try {
        await sendOtpEmail(key, otp);
        logger.info({ key }, "OTP email sent");
      } catch (err) {
        logger.error({ err, key }, "Failed to send OTP email");
        res.status(500).json({ error: "فشل إرسال الكود، تحقق من البريد الإلكتروني وحاول مجدداً" });
        return;
      }
    } else {
      // Dev mode: no email credentials configured — surface OTP in response
      logger.warn({ key }, "No email credentials configured — returning OTP in response (dev mode)");
      devOtp = otp;
    }
  }

  res.json({
    message: isEmail
      ? (hasEmailCredentials ? "تم إرسال الكود على بريدك الإلكتروني" : "وضع التطوير: استخدم الكود الظاهر أدناه")
      : "تم إرسال الكود",
    userExists,
    ...(devOtp !== undefined && { demoCode: devOtp }),
  });
});

// POST /auth/verify-otp
router.post("/auth/verify-otp", (req, res): void => {
  const { emailOrPhone, otp } = req.body as { emailOrPhone: string; otp: string };
  if (!emailOrPhone || !otp) {
    res.status(400).json({ error: "المعلومات مطلوبة" });
    return;
  }

  const key = emailOrPhone.trim().toLowerCase();
  const stored = otpStore.get(key);

  if (!stored || Date.now() > stored.expiresAt) {
    res.status(400).json({ error: "الكود منتهي الصلاحية أو غير صحيح" });
    return;
  }

  // Brute-force protection: max 5 wrong attempts → invalidate OTP
  if (stored.otp !== otp) {
    stored.attempts++;
    if (stored.attempts >= MAX_VERIFY_ATTEMPTS) {
      otpStore.delete(key);
      res.status(429).json({ error: "تجاوزت عدد المحاولات المسموح بها. اطلب كوداً جديداً" });
    } else {
      res.status(400).json({
        error: "الكود غير صحيح",
        attemptsLeft: MAX_VERIFY_ATTEMPTS - stored.attempts,
      });
    }
    return;
  }

  otpStore.delete(key);

  // Mark email as pre-verified for new-user registration (30 min window)
  preVerifiedEmails.set(key, Date.now() + 30 * 60 * 1000);

  res.json({ valid: true });
});

// POST /auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const { username, email, password, displayName, specialty, phone } = req.body;
  if (!username || !email || !password || !displayName) {
    res.status(400).json({ error: "الحقول المطلوبة ناقصة" });
    return;
  }

  // Require prior OTP email verification
  const emailKey = email.trim().toLowerCase();
  const verifiedUntil = preVerifiedEmails.get(emailKey);
  if (!verifiedUntil || Date.now() > verifiedUntil) {
    res.status(400).json({ error: "يجب التحقق من بريدك الإلكتروني أولاً عبر الكود المُرسَل" });
    return;
  }
  preVerifiedEmails.delete(emailKey);

  const [existingEmail] = await db.select().from(usersTable).where(eq(usersTable.email, emailKey));
  if (existingEmail) {
    res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
    return;
  }
  const [existingUsername] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existingUsername) {
    res.status(400).json({ error: "اسم المستخدم محجوز" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    username,
    email,
    passwordHash,
    displayName,
    specialty: specialty || null,
    phone: phone || null,
  }).returning();

  const token = signToken(user.id);
  logger.info({ userId: user.id }, "User registered");
  res.status(201).json({ user: sanitizeUser(user), token });
});

// POST /auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "البريد وكلمة المرور مطلوبان" });
    return;
  }

  // Allow login with email or phone
  const isEmail = email.includes("@");
  let user: typeof usersTable.$inferSelect | undefined;
  if (isEmail) {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    user = u;
  } else {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.phone, email));
    user = u;
  }

  if (!user) {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }

  const token = signToken(user.id);
  logger.info({ userId: user.id }, "User logged in");
  res.json({ user: sanitizeUser(user), token });
});

// POST /auth/otp-login  — passwordless login after OTP verification
router.post("/auth/otp-login", async (req, res): Promise<void> => {
  const { email, otp } = req.body as { email: string; otp: string };
  if (!email || !otp) {
    res.status(400).json({ error: "البريد والكود مطلوبان" });
    return;
  }
  const key = email.trim().toLowerCase();
  const stored = otpStore.get(key);
  if (!stored || Date.now() > stored.expiresAt) {
    res.status(400).json({ error: "الكود منتهي الصلاحية أو غير صحيح" });
    return;
  }
  if (stored.otp !== otp) {
    res.status(400).json({ error: "الكود غير صحيح" });
    return;
  }
  otpStore.delete(key);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, key));
  if (!user) {
    res.status(404).json({ error: "لا يوجد حساب بهذا البريد" });
    return;
  }
  const token = signToken(user.id);
  logger.info({ userId: user.id }, "User logged in via OTP");
  res.json({ user: sanitizeUser(user), token });
});

// POST /auth/reset-password
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { email, newPassword } = req.body as { email: string; newPassword: string };
  if (!email || !newPassword) {
    res.status(400).json({ error: "البريد وكلمة المرور الجديدة مطلوبان" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "كلمة المرور يجب أن تكون ٦ أحرف على الأقل" });
    return;
  }
  const key = email.trim().toLowerCase();
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, key));
  if (!user) {
    res.status(404).json({ error: "لا يوجد حساب مرتبط بهذا البريد" });
    return;
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));
  logger.info({ userId: user.id }, "Password reset");
  res.json({ message: "تم تغيير كلمة المرور بنجاح" });
});

// POST /auth/logout
router.post("/auth/logout", (_req, res): void => {
  res.json({ message: "تم تسجيل الخروج" });
});

// GET /auth/me
router.get("/auth/me", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }
  res.json(sanitizeUser(user));
});

export function sanitizeUser(
  user: typeof usersTable.$inferSelect,
  _currentUserId?: number,
  extra?: Partial<{ followersCount: number; followingCount: number; postsCount: number; isFollowing: boolean }>,
) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    phone: user.phone ?? null,
    bio: user.bio,
    avatar: user.avatar,
    coverPhoto: user.coverPhoto,
    specialty: user.specialty,
    location: user.location,
    website: user.website,
    isVerified: user.isVerified,
    followersCount: extra?.followersCount ?? 0,
    followingCount: extra?.followingCount ?? 0,
    postsCount: extra?.postsCount ?? 0,
    isFollowing: extra?.isFollowing ?? false,
    createdAt: user.createdAt.toISOString(),
  };
}

// POST /auth/request-verification — grant verification to the authenticated user (demo)
router.post("/auth/request-verification", authMiddleware, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.userId!;
    await db.update(usersTable).set({ isVerified: true }).where(eq(usersTable.id, userId));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to verify user" });
  }
});

export default router;
