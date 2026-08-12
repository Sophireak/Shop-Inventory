# ============================================

# 📋 RESET COMMANDS CHEAT SHEET

# ============================================

# 🟢 SAFE RESET (keeps products, deletes data)

npx tsx prisma/seed/reset.ts

# Then choose: 1, 2, or 3

# 🔴 NUCLEAR RESET (delete + re-seed)

del prisma\dev.db
rmdir /s /q prisma\migrations
npx prisma migrate dev --name init
npx prisma generate
npx tsx prisma/seed/products.ts

# 🌱 JUST ADD NEW PRODUCTS

# (After editing products.ts to add new items)

npx tsx prisma/seed/products.ts

# 💾 BACKUP

copy prisma\dev.db prisma\dev.db.backup

# ♻️ RESTORE FROM BACKUP

copy prisma\dev.db.backup prisma\dev.db

# 🎨 VIEW DATA VISUALLY

npx prisma studio
