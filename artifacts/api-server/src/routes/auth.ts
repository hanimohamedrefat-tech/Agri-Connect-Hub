import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { authMiddleware, signToken, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { sendOtpEmail } from "../lib/mailer";

const router: IRouter = Router();

// In-memory OTP store: key = email or phone, value = { otp, expiresAt }
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

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
  const otp = generateOtp();
  otpStore.set(key, { otp, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 min

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

  if (stored.otp !== otp) {
    res.status(400).json({ error: "الكود غير صحيح" });
    return;
  }

  otpStore.delete(key);
  res.json({ valid: true });
});

// POST /auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const { username, email, password, displayName, specialty, phone } = req.body;
  if (!username || !email || !password || !displayName) {
    res.status(400).json({ error: "الحقول المطلوبة ناقصة" });
    return;
  }

  const [existingEmail] = await db.select().from(usersTable).where(eq(usersTable.email, email));
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
