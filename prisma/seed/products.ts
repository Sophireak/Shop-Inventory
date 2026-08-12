import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const products: Array<{
  name: string;
  size: string | null;
  category: string;
  style?: string;
  color?: string;
  sellPrice: number;
  costPrice?: number;
}> = [
  // ==========================================
  // 👧 GIRLS (កុមារី)
  // ==========================================

  // Girl Shirt (អាវស្រី) - 9 sizes
  { name: "អាវស្រី", size: "3", category: "girl", sellPrice: 17500 },
  { name: "អាវស្រី", size: "4", category: "girl", sellPrice: 17500 },
  { name: "អាវស្រី", size: "5", category: "girl", sellPrice: 17500 },
  { name: "អាវស្រី", size: "6", category: "girl", sellPrice: 18500 },
  { name: "អាវស្រី", size: "7", category: "girl", sellPrice: 18500 },
  { name: "អាវស្រី", size: "8", category: "girl", sellPrice: 18500 },
  { name: "អាវស្រី", size: "L", category: "girl", sellPrice: 19500 },
  { name: "អាវស្រី", size: "XL", category: "girl", sellPrice: 19500 },
  { name: "អាវស្រី", size: "XXL", category: "girl", sellPrice: 21000 },

  // Skirt (សំពត់) - 8 sizes
  { name: "សំពត់", size: "6", category: "girl", sellPrice: 10000 },
  { name: "សំពត់", size: "7", category: "girl", sellPrice: 11000 },
  { name: "សំពត់", size: "18", category: "girl", sellPrice: 12000 },
  { name: "សំពត់", size: "20", category: "girl", sellPrice: 13000 },
  { name: "សំពត់", size: "22", category: "girl", sellPrice: 14000 },
  { name: "សំពត់", size: "24", category: "girl", sellPrice: 15000 },
  { name: "សំពត់", size: "26", category: "girl", sellPrice: 15500 },
  { name: "សំពត់", size: "28", category: "girl", sellPrice: 16500 },

  // ==========================================
  // 👦 BOYS (កុមារា)
  // ==========================================

  // Pants (ខោ) - 9 sizes
  { name: "ខោ", size: "10", category: "boy", sellPrice: 13000 },
  { name: "ខោ", size: "12", category: "boy", sellPrice: 13000 },
  { name: "ខោ", size: "14", category: "boy", sellPrice: 13000 },
  { name: "ខោ", size: "16", category: "boy", sellPrice: 13000 },
  { name: "ខោ", size: "18", category: "boy", sellPrice: 13000 },
  { name: "ខោ", size: "20", category: "boy", sellPrice: 13000 },
  { name: "ខោ", size: "L", category: "boy", sellPrice: 15000 },
  { name: "ខោ", size: "XL", category: "boy", sellPrice: 16500 },
  { name: "ខោ", size: "XXL", category: "boy", sellPrice: 16500 },

  // Necktie (ក្រវ៉ាត់ក) - 1 product
  { name: "ក្រវ៉ាត់ក", size: null, category: "boy", sellPrice: 5000 },

  // Boy Shirt WITH pocket (អាវប្រុស មានហោប៉ៅ) - 12 sizes
  {
    name: "អាវប្រុស",
    size: "1",
    style: "pocket",
    category: "boy",
    sellPrice: 11000,
  },
  {
    name: "អាវប្រុស",
    size: "2",
    style: "pocket",
    category: "boy",
    sellPrice: 11000,
  },
  {
    name: "អាវប្រុស",
    size: "3",
    style: "pocket",
    category: "boy",
    sellPrice: 11000,
  },
  {
    name: "អាវប្រុស",
    size: "4",
    style: "pocket",
    category: "boy",
    sellPrice: 11000,
  },
  {
    name: "អាវប្រុស",
    size: "5",
    style: "pocket",
    category: "boy",
    sellPrice: 12000,
  },
  {
    name: "អាវប្រុស",
    size: "6",
    style: "pocket",
    category: "boy",
    sellPrice: 12000,
  },
  {
    name: "អាវប្រុស",
    size: "7",
    style: "pocket",
    category: "boy",
    sellPrice: 12000,
  },
  {
    name: "អាវប្រុស",
    size: "8",
    style: "pocket",
    category: "boy",
    sellPrice: 12000,
  },
  {
    name: "អាវប្រុស",
    size: "M",
    style: "pocket",
    category: "boy",
    sellPrice: 14000,
  },
  {
    name: "អាវប្រុស",
    size: "L",
    style: "pocket",
    category: "boy",
    sellPrice: 14000,
  },
  {
    name: "អាវប្រុស",
    size: "XL",
    style: "pocket",
    category: "boy",
    sellPrice: 14500,
  },
  {
    name: "អាវប្រុស",
    size: "XXL",
    style: "pocket",
    category: "boy",
    sellPrice: 15000,
  },

  // Boy Shirt NO pocket (អាវប្រុស គ្មានហោប៉ៅ) - 5 sizes
  {
    name: "អាវប្រុស",
    size: "S",
    style: "no-pocket",
    category: "boy",
    sellPrice: 16500,
  },
  {
    name: "អាវប្រុស",
    size: "M",
    style: "no-pocket",
    category: "boy",
    sellPrice: 16500,
  },
  {
    name: "អាវប្រុស",
    size: "L",
    style: "no-pocket",
    category: "boy",
    sellPrice: 16500,
  },
  {
    name: "អាវប្រុស",
    size: "XL",
    style: "no-pocket",
    category: "boy",
    sellPrice: 17000,
  },
  {
    name: "អាវប្រុស",
    size: "XXL",
    style: "no-pocket",
    category: "boy",
    sellPrice: 17500,
  },

  // ==========================================
  // 👦👧 BOTH (កុមារា និងកុមារី)
  // ==========================================

  // Shoes (ស្បែកជើង) - 13 sizes
  { name: "ស្បែកជើង", size: "30", category: "both", sellPrice: 22000 },
  { name: "ស្បែកជើង", size: "31", category: "both", sellPrice: 22000 },
  { name: "ស្បែកជើង", size: "32", category: "both", sellPrice: 22000 },
  { name: "ស្បែកជើង", size: "33", category: "both", sellPrice: 22000 },
  { name: "ស្បែកជើង", size: "34", category: "both", sellPrice: 22000 },
  { name: "ស្បែកជើង", size: "35", category: "both", sellPrice: 22000 },
  { name: "ស្បែកជើង", size: "36", category: "both", sellPrice: 22000 },
  { name: "ស្បែកជើង", size: "37", category: "both", sellPrice: 22000 },
  { name: "ស្បែកជើង", size: "38", category: "both", sellPrice: 22000 },
  { name: "ស្បែកជើង", size: "39", category: "both", sellPrice: 27000 },
  { name: "ស្បែកជើង", size: "40", category: "both", sellPrice: 27000 },
  { name: "ស្បែកជើង", size: "41", category: "both", sellPrice: 27000 },
  { name: "ស្បែកជើង", size: "42", category: "both", sellPrice: 27000 },

  // Socks (ស្រោមជើង) - 1 product
  { name: "ស្រោមជើង", size: null, category: "both", sellPrice: 2000 },

  // Sport Uniform (ឈុតកីឡា) - 9 sizes × 3 colors = 27 products
  // Blue (ទី១ ទី២)
  {
    name: "ឈុតកីឡា",
    size: "20",
    color: "blue",
    category: "both",
    sellPrice: 16000,
  },
  {
    name: "ឈុតកីឡា",
    size: "22",
    color: "blue",
    category: "both",
    sellPrice: 16000,
  },
  {
    name: "ឈុតកីឡា",
    size: "24",
    color: "blue",
    category: "both",
    sellPrice: 16000,
  },
  {
    name: "ឈុតកីឡា",
    size: "26",
    color: "blue",
    category: "both",
    sellPrice: 17000,
  },
  {
    name: "ឈុតកីឡា",
    size: "28",
    color: "blue",
    category: "both",
    sellPrice: 18000,
  },
  {
    name: "ឈុតកីឡា",
    size: "30",
    color: "blue",
    category: "both",
    sellPrice: 18000,
  },
  {
    name: "ឈុតកីឡា",
    size: "M",
    color: "blue",
    category: "both",
    sellPrice: 20000,
  },
  {
    name: "ឈុតកីឡា",
    size: "L",
    color: "blue",
    category: "both",
    sellPrice: 20000,
  },
  {
    name: "ឈុតកីឡា",
    size: "XL",
    color: "blue",
    category: "both",
    sellPrice: 20000,
  },

  // Orange (ទី៣ ទី៤)
  {
    name: "ឈុតកីឡា",
    size: "20",
    color: "orange",
    category: "both",
    sellPrice: 16000,
  },
  {
    name: "ឈុតកីឡា",
    size: "22",
    color: "orange",
    category: "both",
    sellPrice: 16000,
  },
  {
    name: "ឈុតកីឡា",
    size: "24",
    color: "orange",
    category: "both",
    sellPrice: 16000,
  },
  {
    name: "ឈុតកីឡា",
    size: "26",
    color: "orange",
    category: "both",
    sellPrice: 17000,
  },
  {
    name: "ឈុតកីឡា",
    size: "28",
    color: "orange",
    category: "both",
    sellPrice: 18000,
  },
  {
    name: "ឈុតកីឡា",
    size: "30",
    color: "orange",
    category: "both",
    sellPrice: 18000,
  },
  {
    name: "ឈុតកីឡា",
    size: "M",
    color: "orange",
    category: "both",
    sellPrice: 20000,
  },
  {
    name: "ឈុតកីឡា",
    size: "L",
    color: "orange",
    category: "both",
    sellPrice: 20000,
  },
  {
    name: "ឈុតកីឡា",
    size: "XL",
    color: "orange",
    category: "both",
    sellPrice: 20000,
  },

  // Green (ទី៥ ទី៦)
  {
    name: "ឈុតកីឡា",
    size: "20",
    color: "green",
    category: "both",
    sellPrice: 16000,
  },
  {
    name: "ឈុតកីឡា",
    size: "22",
    color: "green",
    category: "both",
    sellPrice: 16000,
  },
  {
    name: "ឈុតកីឡា",
    size: "24",
    color: "green",
    category: "both",
    sellPrice: 16000,
  },
  {
    name: "ឈុតកីឡា",
    size: "26",
    color: "green",
    category: "both",
    sellPrice: 17000,
  },
  {
    name: "ឈុតកីឡា",
    size: "28",
    color: "green",
    category: "both",
    sellPrice: 18000,
  },
  {
    name: "ឈុតកីឡា",
    size: "30",
    color: "green",
    category: "both",
    sellPrice: 18000,
  },
  {
    name: "ឈុតកីឡា",
    size: "M",
    color: "green",
    category: "both",
    sellPrice: 20000,
  },
  {
    name: "ឈុតកីឡា",
    size: "L",
    color: "green",
    category: "both",
    sellPrice: 20000,
  },
  {
    name: "ឈុតកីឡា",
    size: "XL",
    color: "green",
    category: "both",
    sellPrice: 20000,
  },

  // Badge stuff (កាតសិស្ស) - 3 products
  { name: "ឈុតកាតសិស្ស", size: "Full Set", category: "both", sellPrice: 6500 },
  {
    name: "ស៊ុមកាត",
    size: null,
    category: "both",
    sellPrice: 1500,
    costPrice: 1400,
  },
  {
    name: "ខ្សែកាត",
    size: null,
    category: "both",
    sellPrice: 5000,
    costPrice: 4800,
  },
];

async function main() {
  console.log("🌱 Seeding products...");

  for (const product of products) {
    const costPrice = product.costPrice ?? product.sellPrice - 300;

    await db.product.upsert({
      where: {
        name_size_style: {
          name: product.name,
          size: product.size ?? "",
          style: product.style ?? "",
        },
      },
      update: {},
      create: {
        name: product.name,
        size: product.size,
        style: product.style ?? product.color ?? null,
        category: product.category,
        sellPrice: product.sellPrice,
        costPrice: costPrice,
        currentStock: 0,
        minStock: 5,
      },
    });
  }

  const count = await db.product.count();
  console.log(`✅ Seeded ${count} products successfully!`);

  // Show breakdown
  const girls = await db.product.count({ where: { category: "girl" } });
  const boys = await db.product.count({ where: { category: "boy" } });
  const both = await db.product.count({ where: { category: "both" } });

  console.log(`\n📊 Breakdown:`);
  console.log(`   👧 Girls: ${girls}`);
  console.log(`   👦 Boys: ${boys}`);
  console.log(`   👦👧 Both: ${both}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
