import { PrismaClient } from "@prisma/client";
import readline from "readline";

const db = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log("\n🔄 RESET DATA SCRIPT");
  console.log("====================\n");
  console.log("Choose what to reset:");
  console.log("  1) Reset SALES only (keep products & stock)");
  console.log(
    "  2) Reset SALES + STOCK IN + CHECKS (keep products, reset stock to 0)",
  );
  console.log("  3) Reset EVERYTHING (delete all data, re-seed products)");
  console.log("  4) Cancel\n");

  const choice = await ask("Enter your choice (1-4): ");

  switch (choice.trim()) {
    case "1":
      await resetSalesOnly();
      break;
    case "2":
      await resetAllExceptProducts();
      break;
    case "3":
      await resetEverything();
      break;
    case "4":
      console.log("❌ Cancelled");
      break;
    default:
      console.log("❌ Invalid choice");
  }

  rl.close();
  await db.$disconnect();
}

async function resetSalesOnly() {
  const confirm = await ask("\n⚠️  Delete all sales data? (yes/no): ");
  if (confirm.toLowerCase() !== "yes") {
    console.log("❌ Cancelled");
    return;
  }

  console.log("\n🗑️  Deleting sales...");

  // Restore stock from sales before deleting
  const sales = await db.dailySale.findMany({
    include: { items: true },
  });

  for (const sale of sales) {
    for (const item of sale.items) {
      await db.product.update({
        where: { id: item.productId },
        data: { currentStock: { increment: item.quantity } },
      });
    }
  }

  await db.saleItem.deleteMany();
  await db.dailySale.deleteMany();

  console.log("✅ All sales deleted!");
  console.log("✅ Stock restored to pre-sale amounts");
}

async function resetAllExceptProducts() {
  const confirm = await ask(
    "\n⚠️  Delete all sales, stock-ins, and checks? Stock will reset to 0. (yes/no): ",
  );
  if (confirm.toLowerCase() !== "yes") {
    console.log("❌ Cancelled");
    return;
  }

  console.log("\n🗑️  Deleting all transactions...");

  await db.saleItem.deleteMany();
  await db.dailySale.deleteMany();
  await db.stockIn.deleteMany();
  await db.stockCheck.deleteMany();

  // Reset all product stock to 0
  await db.product.updateMany({
    data: { currentStock: 0 },
  });

  console.log("✅ All transactions deleted!");
  console.log("✅ All product stock reset to 0");
  console.log("✅ Products kept intact");
}

async function resetEverything() {
  const confirm = await ask(
    "\n🔴 DELETE EVERYTHING and re-seed products? (yes/no): ",
  );
  if (confirm.toLowerCase() !== "yes") {
    console.log("❌ Cancelled");
    return;
  }

  console.log("\n🗑️  Deleting everything...");

  await db.saleItem.deleteMany();
  await db.dailySale.deleteMany();
  await db.stockIn.deleteMany();
  await db.stockCheck.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.setting.deleteMany();

  console.log("✅ All data deleted!");
  console.log("\n🌱 Re-seeding products...");
  console.log("Run: npx tsx prisma/seed/products.ts");
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
