import { ensureSeeded } from "../src/lib/seed-check";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("🌱 Starting CLI database seed for Ajaia Docs...");
  await ensureSeeded(true);
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
