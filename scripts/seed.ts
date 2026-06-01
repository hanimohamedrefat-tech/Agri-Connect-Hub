import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pg from "pg";
import * as schema from "../lib/db/src/schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const { usersTable } = schema;

async function seed() {
  const hash = (p: string) => bcrypt.hash(p, 10);

  const users = [
    {
      username: "ahmed",
      email: "ahmed@zira3a.com",
      passwordHash: await hash("secret"),
      displayName: "أحمد محمد",
      specialty: "زراعة الحبوب",
      location: "القاهرة، مصر",
      bio: "مزارع بخبرة 15 سنة في زراعة القمح والذرة",
      isVerified: true,
    },
    {
      username: "sara",
      email: "sara@zira3a.com",
      passwordHash: await hash("secret"),
      displayName: "سارة أحمد",
      specialty: "هندسة زراعية",
      location: "الإسكندرية، مصر",
      bio: "مهندسة زراعية متخصصة في الزراعة المائية والبيوت المحمية",
      isVerified: true,
    },
    {
      username: "khalid",
      email: "khalid@zira3a.com",
      passwordHash: await hash("secret"),
      displayName: "خالد العمري",
      specialty: "بستنة وفاكهة",
      location: "الرياض، المملكة العربية السعودية",
      bio: "خبير في زراعة النخيل وأشجار الفاكهة في المناطق الجافة",
      isVerified: false,
    },
  ];

  for (const user of users) {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, user.email));

    if (existing.length > 0) {
      console.log(`✓ ${user.email} already exists`);
      continue;
    }

    await db.insert(usersTable).values(user);
    console.log(`✅ Created ${user.email}`);
  }

  await pool.end();
  console.log("Seeding complete!");
}

seed().catch((e) => { console.error(e); process.exit(1); });
