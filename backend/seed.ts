import { PrismaClient, UserRole, UOM } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Dev password for every seeded account. Override with SEED_ADMIN_PASSWORD.
const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'password123';

const users = [
  { name: 'Admin User', email: 'admin@xstock.test', role: UserRole.ADMIN },
  { name: 'Manager User', email: 'manager@xstock.test', role: UserRole.MANAGER },
  { name: 'Staff User', email: 'staff@xstock.test', role: UserRole.STAFF },
  { name: 'Viewer User', email: 'viewer@xstock.test', role: UserRole.VIEWER },
];

const suppliers = [
  {
    code: 'SUP-001',
    name: 'Sentosa Distribution',
    contact: 'Budi Santoso',
    email: 'sales@sentosa-dist.test',
    phone: '+62-21-5550-1001',
    address: 'Jl. Industri Raya No. 1, Jakarta',
  },
  {
    code: 'SUP-002',
    name: 'Makmur Supply Co',
    contact: 'Siti Rahma',
    email: 'order@makmur-supply.test',
    phone: '+62-31-5550-2002',
    address: 'Jl. Rungkut Industri No. 22, Surabaya',
  },
  {
    code: 'SUP-003',
    name: 'Local Farm Goods',
    contact: 'Agus Pratama',
    email: 'hello@localfarm.test',
    phone: '+62-274-5550-3003',
    address: 'Jl. Kaliurang KM 10, Yogyakarta',
  },
];

const products = [
  {
    sku: 'SKU-001',
    name: 'Mineral Water 600ml',
    category: 'Beverage',
    brand: 'AquaPure',
    uom: UOM.BOTTLE,
    lowStockThreshold: 50,
  },
  {
    sku: 'SKU-002',
    name: 'Instant Noodles Chicken',
    category: 'Food',
    brand: 'TastyMie',
    uom: UOM.PCS,
    lowStockThreshold: 100,
  },
  {
    sku: 'SKU-003',
    name: 'Cooking Oil 1L',
    category: 'Grocery',
    brand: 'GoldenFry',
    uom: UOM.BOTTLE,
    lowStockThreshold: 30,
  },
  {
    sku: 'SKU-004',
    name: 'Premium Rice 5kg',
    category: 'Grocery',
    brand: 'FarmField',
    uom: UOM.BOX,
    lowStockThreshold: 20,
  },
  {
    sku: 'SKU-005',
    name: 'Hand Soap 250ml',
    category: 'Toiletries',
    brand: 'CleanCare',
    uom: UOM.BOTTLE,
    lowStockThreshold: 40,
  },
];

const customers = [
  {
    code: 'CUS-001',
    name: 'Supermart Jaya',
    contact: 'Dewi Lestari',
    email: 'purchasing@supermart-jaya.test',
    phone: '+62-21-5550-4004',
    address: 'Jl. Sudirman No. 88, Jakarta',
  },
  {
    code: 'CUS-002',
    name: 'Toko Berkah',
    contact: 'Hadi Wijaya',
    email: 'tokoberkah@retail.test',
    phone: '+62-22-5550-5005',
    address: 'Jl. Asia Afrika No. 12, Bandung',
  },
  {
    code: 'CUS-003',
    name: 'Grocer Hub',
    contact: 'Maya Putri',
    email: 'orders@grocerhub.test',
    phone: '+62-61-5550-6006',
    address: 'Jl. Gatot Subroto No. 5, Medan',
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { ...u, password: passwordHash },
    });
  }

  for (const s of suppliers) {
    await prisma.supplier.upsert({
      where: { code: s.code },
      update: { ...s },
      create: s,
    });
  }

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: { ...p },
      create: p,
    });
  }

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { code: c.code },
      update: { ...c },
      create: c,
    });
  }

  console.log(
    `Seed complete: ${users.length} users, ${suppliers.length} suppliers, ` +
      `${products.length} products, ${customers.length} customers.`,
  );
  console.log(
    `Dev login: admin@xstock.test / "${SEED_PASSWORD}" (override with SEED_ADMIN_PASSWORD).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
