import { PrismaClient } from "@prisma/client";
import { compare, hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@suplymate.com";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log("NO_USER");
    return;
  }
  const valid = await compare("demo123", user.passwordHash);
  console.log("USER_EXISTS", user.email, "PASSWORD_OK", valid);
  if (!valid) {
    await prisma.user.update({
      where: { email },
      data: { passwordHash: await hash("demo123", 12) },
    });
    console.log("PASSWORD_RESET");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
