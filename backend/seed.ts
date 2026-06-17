/**
 * Database seeder.
 *
 * Builds a full demo dataset — master data plus transactional history — so
 * every report and dashboard chart has real data points to draw:
 *
 *   - Sections + bin locations            (prereq for inventory & movements)
 *   - Product batches across many expiry   -> Expiry report (dots per month)
 *     months, incl. expired / near-expiry
 *   - Inventory placed into bins, with a    -> Low-stock report (bars) &
 *     few products kept below threshold        Batches & locations report
 *   - ~90 days of stock movements, several  -> Stock-movement report
 *     per day                                   (one dot per day)
 *   - Purchase / sales orders + shipments   -> Inbound / outbound / shipment
 *     so those list pages aren't empty           pages
 *   - A real product photo per product,     -> images downloaded into uploads/
 *     supplier and customer (curated from        and served at /uploads/<file>
 *     Wikimedia Commons)
 *
 * It is re-runnable: transactional tables are cleared first, master data is
 * upserted. Run with:  npm run seed
 *
 * Override behaviour with env vars:
 *   SEED_DAYS              number of days of movement history (default 90)
 *   SEED_PER_DAY_MAX       max movements per day              (default 4)
 *   SEED_SKIP_IMAGES       set "true" to skip image downloads (offline / faster)
 *   SEED_IMAGE_REFRESH     set "true" to re-download cached seed images
 *   SEED_IMAGE_TIMEOUT_MS  per-image download timeout         (default 5000)
 */
import {
  PrismaClient,
  UserRole,
  UOM,
  MovementType,
  LocationType,
  BinRole,
  HazardClass,
  SerialStatus,
  SerialEventType,
  BomStatus,
  WorkOrderType,
  WorkOrderStatus,
  ReferenceType,
  OrderStatus,
  SalesOrderStatus,
  ShipmentStatus,
  GoodsReceiptStatus,
  User,
  Supplier,
  Product,
  Customer,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'password123';
const DAYS = Number(process.env.SEED_DAYS ?? 90);
const PER_DAY_MAX = Number(process.env.SEED_PER_DAY_MAX ?? 4);
// Set SEED_SKIP_IMAGES=true to skip the network image downloads.
const SKIP_IMAGES = process.env.SEED_SKIP_IMAGES === 'true';
const REFRESH_IMAGES = process.env.SEED_IMAGE_REFRESH === 'true';

const configuredImageTimeoutMs = Number(process.env.SEED_IMAGE_TIMEOUT_MS ?? 5000);
const IMAGE_TIMEOUT_MS =
  Number.isFinite(configuredImageTimeoutMs) && configuredImageTimeoutMs > 0
    ? configuredImageTimeoutMs
    : 5000;

// Images are downloaded here and served by the API at /uploads/<file>
// (see app.useStaticAssets in main.ts).
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const IMAGE_UA = 'xstock-wms-seed/1.0 (warehouse demo seeder)';

/**
 * Build the direct upload.wikimedia.org URL for a Commons filename. The storage
 * path is derived from the md5 of the (underscored) filename, exactly how
 * Commons lays files out. We point at the full-size original rather than a
 * `/thumb/` URL because Wikimedia returns 400 for hotlinked thumbnails.
 */
function commonsUrls(filename: string): string[] {
  const fn = filename.replace(/ /g, '_');
  const md5 = crypto.createHash('md5').update(fn, 'utf8').digest('hex');
  const dir = `${md5[0]}/${md5.slice(0, 2)}`;
  const enc = encodeURIComponent(fn);
  return [`https://upload.wikimedia.org/wikipedia/commons/${dir}/${enc}`];
}

async function fetchImage(url: string): Promise<Buffer | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': IMAGE_UA },
        signal: controller.signal,
      });
      if (res.status === 429) return null;
      if (res.status >= 500) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return null;
      if (!(res.headers.get('content-type') || '').startsWith('image/')) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return buf.length >= 1024 ? buf : null;
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

/**
 * Download a specific, curated Wikimedia Commons photo into uploads/ and return
 * its served path (`/uploads/<file>`), mirroring how real uploads are stored.
 * Each `filename` was hand-picked via web search so the image is the actual
 * product — no random placeholders. Falls back to the remote Commons URL if the
 * download fails, so `imagePath` is always populated. Re-runs reuse the local
 * file unless SEED_IMAGE_REFRESH=true is set.
 */
async function resolveImage(
  kind: string,
  code: string,
  filename: string | undefined,
): Promise<string | null> {
  if (!filename) return null;
  const urls = commonsUrls(filename);
  const remoteUrl = urls[urls.length - 1];
  if (SKIP_IMAGES) return remoteUrl;

  const dest = path.join(UPLOADS_DIR, `seed-${kind}-${code}.jpg`);
  const served = `/uploads/seed-${kind}-${code}.jpg`;

  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    if (!REFRESH_IMAGES && fs.existsSync(dest)) return served;

    for (const url of urls) {
      const buf = await fetchImage(url);
      if (buf) {
        fs.writeFileSync(dest, buf);
        return served;
      }
    }
  } catch {
    // fall through to remote URL
  }

  console.warn(`  image download failed for ${kind} ${code}, using remote URL`);
  return remoteUrl;
}

/** Remove previously seeded images so a run never serves stale photos. */
function clearSeedImages(): void {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) return;
    for (const f of fs.readdirSync(UPLOADS_DIR)) {
      if (/^seed-(product|supplier|customer)-/.test(f)) {
        fs.unlinkSync(path.join(UPLOADS_DIR, f));
      }
    }
  } catch {
    // best-effort cleanup
  }
}

// ---------------------------------------------------------------------------
// Deterministic RNG so re-runs produce the same demo dataset.
// ---------------------------------------------------------------------------
let _seed = 0x9e3779b9;
function rng(): number {
  // mulberry32
  _seed |= 0;
  _seed = (_seed + 0x6d2b79f5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function weighted<T>(entries: Array<[T, number]>): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [value, w] of entries) {
    if ((r -= w) <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

// ---------------------------------------------------------------------------
// Date helpers (all derived from "now" at run time).
// ---------------------------------------------------------------------------
const NOW = new Date();
function daysAgo(n: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}
function atDay(base: Date, hour: number, minute: number): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}
function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ---------------------------------------------------------------------------
// Master data
// ---------------------------------------------------------------------------
const users = [
  { name: 'Admin Gudang', email: 'admin@xstock.test', role: UserRole.ADMIN },
  { name: 'Manager Operasional', email: 'manager@xstock.test', role: UserRole.MANAGER },
  { name: 'Staff Warehouse', email: 'staff@xstock.test', role: UserRole.STAFF },
];

const suppliers = [
  { code: 'SUP-001', name: 'Nusantara Workwear', contact: 'Budi Santoso', email: 'sales@nusantara-workwear.test', phone: '+62-21-5550-1101', address: 'Jl. Industri Tekstil No. 12, Tangerang' },
  { code: 'SUP-002', name: 'BersihPro Chemical Supply', contact: 'Siti Rahma', email: 'order@bersihpro.test', phone: '+62-21-5550-2202', address: 'Jl. Raya Bekasi KM 22, Jakarta' },
  { code: 'SUP-003', name: 'Securicom Radio Indonesia', contact: 'Agus Pratama', email: 'hello@securicom-radio.test', phone: '+62-31-5550-3303', address: 'Jl. Ngagel Industri No. 8, Surabaya' },
  { code: 'SUP-004', name: 'IDCraft Lanyard & Badge', contact: 'Rina Hartati', email: 'cs@idcraft-badge.test', phone: '+62-22-5550-4404', address: 'Jl. Buah Batu No. 45, Bandung' },
];

// Facility-operation catalogue: uniforms, cleaning supplies, communication
// devices and ID accessories used by offices, malls, factories and hospitals.
const products = [
  { sku: 'SKU-001', name: 'Worker Uniform Shirt', category: 'Uniform', brand: 'NusaWear', uom: UOM.PCS, lowStockThreshold: 80, unitVolume: 0.004, unitWeight: 0.35 },
  { sku: 'SKU-002', name: 'Worker Uniform Pants', category: 'Uniform', brand: 'NusaWear', uom: UOM.PCS, lowStockThreshold: 80, unitVolume: 0.005, unitWeight: 0.45 },
  { sku: 'SKU-003', name: 'Reflective Safety Vest', category: 'PPE', brand: 'SafeLine', uom: UOM.PCS, lowStockThreshold: 60, unitVolume: 0.003, unitWeight: 0.2 },
  { sku: 'SKU-004', name: 'Satpam Uniform Set', category: 'Security Uniform', brand: 'GuardPro', uom: UOM.BOX, lowStockThreshold: 25, unitVolume: 0.02, unitWeight: 1.8 },
  { sku: 'SKU-005', name: 'Security Boots', category: 'PPE', brand: 'GuardPro', uom: UOM.PCS, lowStockThreshold: 30, unitVolume: 0.018, unitWeight: 1.4 },
  { sku: 'SKU-006', name: 'Cleaner Uniform Set', category: 'Uniform', brand: 'CleanWear', uom: UOM.BOX, lowStockThreshold: 30, unitVolume: 0.018, unitWeight: 1.5 },
  { sku: 'SKU-007', name: 'Mop Head Refill', category: 'Janitorial Tools', brand: 'CleanPro', uom: UOM.PCS, lowStockThreshold: 50, unitVolume: 0.01, unitWeight: 0.3 },
  { sku: 'SKU-008', name: 'Microfiber Cloth Pack', category: 'Janitorial Tools', brand: 'CleanPro', uom: UOM.BOX, lowStockThreshold: 40, unitVolume: 0.012, unitWeight: 0.8 },
  { sku: 'SKU-009', name: 'Floor Cleaner 5L', category: 'Cleaning Chemical', brand: 'ChemClean', uom: UOM.BOTTLE, lowStockThreshold: 35, unitVolume: 0.006, unitWeight: 5.2 },
  { sku: 'SKU-010', name: 'Disinfectant 5L', category: 'Cleaning Chemical', brand: 'ChemClean', uom: UOM.BOTTLE, lowStockThreshold: 35, unitVolume: 0.006, unitWeight: 5.2 },
  { sku: 'SKU-011', name: 'Glass Cleaner Spray 500ml', category: 'Cleaning Chemical', brand: 'ChemClean', uom: UOM.BOTTLE, lowStockThreshold: 45, unitVolume: 0.001, unitWeight: 0.55 },
  { sku: 'SKU-012', name: 'Walkie Talkie Unit', category: 'Communication', brand: 'RadioLink', uom: UOM.PCS, lowStockThreshold: 20, unitVolume: 0.002, unitWeight: 0.28 },
  { sku: 'SKU-013', name: 'Walkie Talkie Battery Pack', category: 'Communication', brand: 'RadioLink', uom: UOM.PCS, lowStockThreshold: 25, unitVolume: 0.001, unitWeight: 0.12 },
  { sku: 'SKU-014', name: 'Printed Lanyard Pack', category: 'ID Accessories', brand: 'IDCraft', uom: UOM.BOX, lowStockThreshold: 60, unitVolume: 0.01, unitWeight: 0.6 },
];

const customers = [
  { code: 'CUS-001', name: 'Gedung Prima Facilities', contact: 'Dewi Lestari', email: 'procurement@gedungprima-fm.test', phone: '+62-21-5550-4004', address: 'Jl. Sudirman No. 88, Jakarta' },
  { code: 'CUS-002', name: 'Mall Nusantara Operations', contact: 'Hadi Wijaya', email: 'ops-purchasing@mallnusantara.test', phone: '+62-22-5550-5005', address: 'Jl. Asia Afrika No. 12, Bandung' },
  { code: 'CUS-003', name: 'Cakra Industrial Estate', contact: 'Maya Putri', email: 'warehouse@cakra-estate.test', phone: '+62-61-5550-6006', address: 'Jl. Gatot Subroto No. 5, Medan' },
  { code: 'CUS-004', name: 'RS Sentosa Support Services', contact: 'Eko Saputra', email: 'support-services@rssentosa.test', phone: '+62-24-5550-8008', address: 'Jl. Pandanaran No. 3, Semarang' },
];

// Specific Wikimedia Commons photos, hand-picked per SKU via web search, so
// each image is the actual product rather than a random placeholder. Values are
// Commons filenames resolved to direct upload.wikimedia.org URLs (see
// commonsUrls).
const PRODUCT_IMAGE_FILES: Record<string, string> = {
  'SKU-001': 'Pink uniform worker Aug 19 2019 02-14PM.jpeg',
  'SKU-002': 'Pink uniform worker Aug 19 2019 02-14PM.jpeg',
  'SKU-003': 'High-visibility vest.jpg',
  'SKU-004': 'Guard at the Prague castle, Prague - 7620 (cropped).jpg',
  'SKU-005': 'Rubber boots 2204-0240.jpg',
  'SKU-006': 'GD 廣東 Guangdong 廣州 Guangzhou 天河路 TianHe Road cleaning worker in blue uniform on vehicle at work October 2024 R12S 01.jpg',
  'SKU-007': 'Mop for wet use, looped microfiber, velcro back, 60 cm.jpg',
  'SKU-008': 'Microfiber cloth.jpg',
  'SKU-009': 'Blue bucket with Bruce hardwood floor cleaner.jpg',
  'SKU-010': 'Bode Sterillium 100ml bottle.JPG',
  'SKU-011': 'Windex (48089717956).jpg',
  'SKU-012': 'Baofeng UV-5R transceiver.jpg',
  'SKU-013': 'Recreational Walkie Talkies.jpg',
  'SKU-014': 'Lanyard (3379981636) (4).jpg',
};
// Supplier and customer photos are cycled across records.
const SUPPLIER_IMAGE_FILES = [
  'Seamstresses at their stations in the Consolidated Garment Company sewing workshop.jpg',
  'Cleaning product refills in Kindly.jpg',
  'Baofeng UV-5R transceiver.jpg',
  'WMDE-Give-Aways Lanyard mit Wikipedia-Logo.jpg',
];
const CUSTOMER_IMAGE_FILES = [
  'Vale Facilities Management, Springwell Road - geograph.org.uk - 4803624.jpg',
  'Office buildings in Schiedam 2016.jpg',
  'Modern warehouse with pallet rack storage system.jpg',
  'Children\'s Hospital Colorado lobby from 4th floor.jpg',
];

// Warehouse layout: each section expands into zone -> aisle -> rack -> level -> bin.
const sections = [
  { code: 'UNIFORM', description: 'Uniform storage and pick faces' },
  { code: 'ID-ACCESS', description: 'ID accessories and high-count consumables' },
  { code: 'ELECTRONICS', description: 'Communication devices and asset pool' },
  { code: 'CHEM-STORE', description: 'Cleaning chemicals and controlled hazmat storage' },
];

// ---------------------------------------------------------------------------

async function clearTransactional() {
  // deepest children first to satisfy FK constraints
  await prisma.movementLock.deleteMany();
  await prisma.washCycle.deleteMany();
  await prisma.returnLine.deleteMany();
  await prisma.return.deleteMany();
  await prisma.contractLine.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.workOrderComponent.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.bomLine.deleteMany();
  await prisma.billOfMaterials.deleteMany();
  await prisma.serialUnitEvent.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.shipmentLine.deleteMany();
  await prisma.goodsReceiptLine.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.serialUnit.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productBatch.deleteMany();
  await prisma.location.deleteMany();
  await prisma.section.deleteMany();
  await prisma.warehouse.deleteMany();
}

async function main() {
  console.log('Clearing transactional data…');
  await clearTransactional();

  // --- Master data (upsert so identities stay stable) ---------------------
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const userRecords: User[] = [];
  for (const u of users) {
    userRecords.push(
      await prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name, role: u.role },
        create: { ...u, password: passwordHash },
      }),
    );
  }
  console.log(`Seeded ${userRecords.length} users: ${users.map((u) => u.email).join(', ')}.`);

  console.log('Preparing images (set SEED_SKIP_IMAGES=true to skip)…');
  if (REFRESH_IMAGES) clearSeedImages();

  const supplierRecords: Supplier[] = [];
  for (let i = 0; i < suppliers.length; i++) {
    const s = suppliers[i];
    const imagePath = await resolveImage(
      'supplier',
      s.code,
      SUPPLIER_IMAGE_FILES[i % SUPPLIER_IMAGE_FILES.length],
    );
    supplierRecords.push(
      await prisma.supplier.upsert({
        where: { code: s.code },
        update: { ...s, imagePath },
        create: { ...s, imagePath },
      }),
    );
  }

  const productRecords: Product[] = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const imagePath = await resolveImage('product', p.sku, PRODUCT_IMAGE_FILES[p.sku]);
    // Phase 1 — the tracking grain each family forces.
    const cat = p.category.toLowerCase();
    const isChem = cat.includes('chemical');
    const tracking = {
      variantTracked: cat.includes('uniform'), // uniforms: color × size matrix
      lotTracked: isChem, // chemicals: expiry / FEFO
      serialTracked: cat.includes('communication'), // radios: asset lifecycle
    };
    // Phase 4 — chemical compliance. Flammable solvent-style vs corrosive cleaners.
    const FLAMMABLE_SKUS = new Set(['SKU-011']); // glass cleaner (alcohol-based)
    const compliance = isChem
      ? {
          hazardClass: FLAMMABLE_SKUS.has(p.sku)
            ? HazardClass.FLAMMABLE
            : HazardClass.CORROSIVE,
          unNumber: FLAMMABLE_SKUS.has(p.sku) ? 'UN1993' : 'UN1760',
          requiresSds: true,
          sdsDocumentPath: `/uploads/sds/${p.sku}-sds.pdf`,
          storageNotes: 'Store upright in a ventilated, hazard-rated bin.',
        }
      : {};
    productRecords.push(
      await prisma.product.upsert({
        where: { sku: p.sku },
        update: { ...p, imagePath, ...tracking, ...compliance },
        create: { ...p, imagePath, ...tracking, ...compliance },
      }),
    );
  }

  // --- Phase 1: variant matrix (color × size) for variant-tracked uniforms --
  const variantConfigs: Record<string, { colors: string[]; sizes: string[] }> = {
    'SKU-001': { colors: ['Navy', 'Grey'], sizes: ['S', 'M', 'L', 'XL'] },
    'SKU-004': { colors: ['Black'], sizes: ['M', 'L', 'XL'] },
    'SKU-006': { colors: ['Blue'], sizes: ['S', 'M', 'L'] },
  };
  let variantCount = 0;
  for (const product of productRecords) {
    const cfg = variantConfigs[product.sku];
    if (!cfg) continue;
    for (const color of cfg.colors) {
      for (const size of cfg.sizes) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: `${product.sku}-${color.slice(0, 3).toUpperCase()}-${size}`,
            name: `${product.name} ${color} ${size}`,
            color,
            size,
          },
        });
        variantCount++;
      }
    }
  }

  const customerRecords: Customer[] = [];
  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    const imagePath = await resolveImage(
      'customer',
      c.code,
      CUSTOMER_IMAGE_FILES[i % CUSTOMER_IMAGE_FILES.length],
    );
    customerRecords.push(
      await prisma.customer.upsert({
        where: { code: c.code },
        update: { ...c, imagePath },
        create: { ...c, imagePath },
      }),
    );
  }
  console.log(
    `Master data ready: ${supplierRecords.length} suppliers, ` +
      `${productRecords.length} products, ${customerRecords.length} customers (with images).`,
  );

  // --- Warehouse + physical location tree --------------------------------
  const warehouse = await prisma.warehouse.create({
    data: {
      code: 'MAIN',
      name: 'Main Warehouse',
      description: 'Single seeded warehouse for the facility-supply catalogue',
    },
  });

  interface SeedLocationRecord {
    id: string;
    code: string;
    sectionId: string;
    family: string;
    role: BinRole;
    hazardClass: HazardClass;
  }

  const locationRecords: SeedLocationRecord[] = [];
  for (const s of sections) {
    const section = await prisma.section.create({
      data: {
        code: s.code,
        description: s.description,
        warehouseId: warehouse.id,
      },
    });

    const zone = await prisma.location.create({
      data: {
        code: `${s.code}-Z01`,
        type: LocationType.ZONE,
        warehouseId: warehouse.id,
        sectionId: section.id,
        sequenceNo: 10,
      },
    });

    const aisle = await prisma.location.create({
      data: {
        code: `${s.code}-A01`,
        type: LocationType.AISLE,
        warehouseId: warehouse.id,
        sectionId: section.id,
        parentId: zone.id,
        sequenceNo: 20,
      },
    });

    const rack = await prisma.location.create({
      data: {
        code: `${s.code}-R01`,
        type: LocationType.RACK,
        warehouseId: warehouse.id,
        sectionId: section.id,
        parentId: aisle.id,
        sequenceNo: 30,
      },
    });

    const level = await prisma.location.create({
      data: {
        code: `${s.code}-L01`,
        type: LocationType.LEVEL,
        warehouseId: warehouse.id,
        sectionId: section.id,
        parentId: rack.id,
        sequenceNo: 40,
      },
    });

    const binTemplates =
      s.code === 'CHEM-STORE'
        ? [
            { role: BinRole.RECEIVING, hazardClass: HazardClass.CORROSIVE },
            { role: BinRole.PICK_FACE, hazardClass: HazardClass.CORROSIVE },
            { role: BinRole.RESERVE, hazardClass: HazardClass.FLAMMABLE },
            { role: BinRole.QUARANTINE, hazardClass: HazardClass.CORROSIVE },
          ]
        : s.code === 'ELECTRONICS'
          ? [
              { role: BinRole.ASSET_POOL, hazardClass: HazardClass.NONE },
              { role: BinRole.PICK_FACE, hazardClass: HazardClass.NONE },
              { role: BinRole.QUARANTINE, hazardClass: HazardClass.NONE },
            ]
          : s.code === 'ID-ACCESS'
            ? [
                { role: BinRole.PICK_FACE, hazardClass: HazardClass.NONE },
                { role: BinRole.RESERVE, hazardClass: HazardClass.NONE },
                { role: BinRole.SHIPPING, hazardClass: HazardClass.NONE },
              ]
            : [
                { role: BinRole.PICK_FACE, hazardClass: HazardClass.NONE },
                { role: BinRole.RESERVE, hazardClass: HazardClass.NONE },
                { role: BinRole.STAGING, hazardClass: HazardClass.NONE },
              ];

    for (let i = 0; i < binTemplates.length; i++) {
      const template = binTemplates[i];
      const isChemical = s.code === 'CHEM-STORE';
      const isElectronics = s.code === 'ELECTRONICS';
      const loc = await prisma.location.create({
        data: {
          code: `${s.code}-B${String(i + 1).padStart(2, '0')}`,
          type: LocationType.BIN,
          warehouseId: warehouse.id,
          sectionId: section.id,
          parentId: level.id,
          x: i + 1,
          y: sections.findIndex((sectionInfo) => sectionInfo.code === s.code) + 1,
          sequenceNo: 100 + i,
          role: template.role,
          maxQty: isChemical ? 800 : isElectronics ? 300 : 700,
          maxVolume: isChemical ? 250 : 400,
          maxWeight: isChemical ? 500 : 250,
          hazardClass: template.hazardClass,
          oneSkuPerBin: false,
          oneLotPerBin: isChemical,
          allowHazmatWithNonHazmat: false,
          allowedUoms: isChemical ? [UOM.BOTTLE] : [UOM.PCS, UOM.BOX],
        },
      });

      locationRecords.push({
        id: loc.id,
        code: loc.code,
        sectionId: section.id,
        family: s.code,
        role: template.role,
        hazardClass: template.hazardClass,
      });
    }
  }
  console.log(
    `Created 1 warehouse, ${sections.length} sections, ` +
      `${locationRecords.length} stock-bearing bins plus hierarchy nodes.`,
  );

  // --- Phase 1: serialized asset register for radios ----------------------
  // Each walkie-talkie / battery pack is an individually tracked SerialUnit,
  // parked IN_STOCK in the electronics asset pool.
  const electronicsBins = locationRecords.filter((l) => l.family === 'ELECTRONICS');
  const assetPoolBin =
    electronicsBins.find((l) => l.role === BinRole.ASSET_POOL) ?? electronicsBins[0];
  const serialUnits: { id: string; productId: string }[] = [];
  for (const product of productRecords.filter((p) => p.serialTracked)) {
    const units = product.sku === 'SKU-012' ? 24 : 16;
    for (let n = 1; n <= units; n++) {
      const su = await prisma.serialUnit.create({
        data: {
          serialNumber: `${product.sku}-SN-${String(n).padStart(4, '0')}`,
          productId: product.id,
          status: SerialStatus.IN_STOCK,
          currentLocationId: assetPoolBin?.id ?? null,
          batteryCycleCount: randInt(0, 200),
          lastChargedAt: daysAgo(randInt(0, 14)),
          warrantyExpiry: addMonths(NOW, randInt(6, 24)),
        },
      });
      serialUnits.push({ id: su.id, productId: su.productId });
    }
  }

  // --- Phase 2: drive a slice of the fleet through the asset lifecycle so the
  // register shows ISSUED / IN_REPAIR / RETIRED units with event history. -----
  let issued = 0;
  let inRepair = 0;
  let retired = 0;
  for (let i = 0; i < serialUnits.length; i++) {
    const su = serialUnits[i];
    if (i % 5 === 1 && issued < 8 && customerRecords.length) {
      const cust = customerRecords[issued % customerRecords.length];
      const holder = `Field officer #${String(i + 1).padStart(3, '0')}`;
      await prisma.serialUnit.update({
        where: { id: su.id },
        data: {
          status: SerialStatus.ISSUED,
          issuedToCustomerId: cust.id,
          currentHolder: holder,
          issuedAt: daysAgo(randInt(1, 40)),
          currentLocationId: null,
        },
      });
      await prisma.serialUnitEvent.create({
        data: {
          serialUnitId: su.id,
          type: SerialEventType.ISSUE,
          fromStatus: SerialStatus.IN_STOCK,
          toStatus: SerialStatus.ISSUED,
          customerId: cust.id,
          holder,
        },
      });
      await prisma.stockMovement.create({
        data: {
          type: MovementType.OUT,
          quantity: 1,
          productId: su.productId,
          serialUnitId: su.id,
          fromLocationId: assetPoolBin?.id ?? null,
          referenceType: ReferenceType.ASSET_ISSUE,
          referenceId: cust.id,
          reason: 'Asset issued',
        },
      });
      issued++;
    } else if (i % 11 === 3 && inRepair < 3) {
      await prisma.serialUnit.update({
        where: { id: su.id },
        data: {
          status: SerialStatus.IN_REPAIR,
          serviceable: false,
          repairVendor: 'RadioLink Service Center',
        },
      });
      await prisma.serialUnitEvent.create({
        data: {
          serialUnitId: su.id,
          type: SerialEventType.SEND_TO_REPAIR,
          fromStatus: SerialStatus.IN_STOCK,
          toStatus: SerialStatus.IN_REPAIR,
          notes: 'Intermittent transmit fault',
        },
      });
      inRepair++;
    } else if (i % 17 === 9 && retired < 2) {
      await prisma.serialUnit.update({
        where: { id: su.id },
        data: {
          status: SerialStatus.RETIRED,
          serviceable: false,
          currentLocationId: null,
        },
      });
      await prisma.serialUnitEvent.create({
        data: {
          serialUnitId: su.id,
          type: SerialEventType.RETIRE,
          fromStatus: SerialStatus.IN_STOCK,
          toStatus: SerialStatus.RETIRED,
          notes: 'Beyond economic repair',
        },
      });
      retired++;
    }
  }
  console.log(
    `Created ${variantCount} product variants, ${serialUnits.length} serialized units ` +
      `(${issued} issued, ${inRepair} in repair, ${retired} retired).`,
  );

  function binsForProduct(product: Product): SeedLocationRecord[] {
    const category = product.category.toLowerCase();
    let family = 'UNIFORM';

    if (category.includes('chemical')) {
      family = 'CHEM-STORE';
    } else if (category.includes('communication')) {
      family = 'ELECTRONICS';
    } else if (category.includes('id accessories')) {
      family = 'ID-ACCESS';
    }

    const matches = locationRecords.filter((loc) => loc.family === family);
    return matches.length ? matches : locationRecords;
  }

  // --- Batches + inventory ------------------------------------------------
  // For each product: a near/expired batch, a mid batch, and a long-dated
  // batch. Spreading expiry across many months populates the expiry chart;
  // a deliberately small total for some products feeds the low-stock chart.
  const lowStockSkus = new Set(['SKU-004', 'SKU-005', 'SKU-010', 'SKU-012', 'SKU-014']);

  interface BatchInfo {
    id: string;
    productId: string;
    locationId: string;
    receivedAt: Date;
    quantity: number;
  }
  const batchInfos: BatchInfo[] = [];

  for (const product of productRecords) {
    const isLow = lowStockSkus.has(product.sku);
    // expiry offsets in months relative to now: one expired/near, then spread out
    const expiryOffsets = [
      pick([-1, 0, 1]), // expired or expiring soon
      randInt(2, 6),
      randInt(7, 15),
    ];

    for (let b = 0; b < expiryOffsets.length; b++) {
      const receivedAt = daysAgo(randInt(5, DAYS));
      // Phase 1 — only lot-tracked families (chemicals) carry an expiry date;
      // uniforms / radios / lanyards no longer get a fabricated one.
      const expiryDate = product.lotTracked ? addMonths(NOW, expiryOffsets[b]) : null;
      const batch = await prisma.productBatch.create({
        data: {
          batchNumber: `B-${product.sku}-${b + 1}`,
          productId: product.id,
          expiryDate,
          receivedAt,
          notes:
            product.lotTracked && b === 0 && expiryOffsets[b] <= 0
              ? 'Check freshness before picking'
              : null,
        },
      });

      // Place this batch into a bin. Keep low-stock products intentionally
      // thin so their summed quantity sits under the reorder threshold.
      const location = pick(binsForProduct(product));
      const quantity = isLow ? randInt(2, 8) : randInt(40, 180);

      await prisma.inventory.create({
        data: {
          productId: product.id,
          batchId: batch.id,
          locationId: location.id,
          quantity,
          reservedQty: randInt(0, Math.min(5, quantity)),
        },
      });

      await prisma.location.update({
        where: { id: location.id },
        data: {
          currentQty: { increment: quantity },
          currentVolume: {
            increment: quantity * (product.unitVolume ?? 0),
          },
          currentWeight: {
            increment: quantity * (product.unitWeight ?? 0),
          },
        },
      });

      batchInfos.push({
        id: batch.id,
        productId: product.id,
        locationId: location.id,
        receivedAt,
        quantity,
      });
    }
  }
  console.log(`Created ${batchInfos.length} batches with inventory.`);

  // --- Phase 3: kitting / BOM --------------------------------------------
  // Define a "Security Onboarding Kit" (1 Satpam uniform variant + 1 lanyard +
  // 1 issued radio), then run one assemble work order so the data shows a
  // completed kit with full cross-grain component genealogy.
  const satpam = productRecords.find((p) => p.sku === 'SKU-004');
  const lanyard = productRecords.find((p) => p.sku === 'SKU-014');
  const radio = productRecords.find((p) => p.sku === 'SKU-012');
  const satpamVariant = await prisma.productVariant.findFirst({
    where: { sku: 'SKU-004-BLA-L' },
  });
  const uniformBin =
    locationRecords.find((l) => l.family === 'UNIFORM') ?? locationRecords[0];

  if (satpam && lanyard && radio && satpamVariant && uniformBin) {
    const KIT_QTY = 3;

    const kit = await prisma.product.upsert({
      where: { sku: 'KIT-SEC-01' },
      update: { isKit: true },
      create: {
        sku: 'KIT-SEC-01',
        name: 'Security Onboarding Kit',
        category: 'Kit',
        uom: UOM.BOX,
        isKit: true,
        lowStockThreshold: 5,
      },
    });

    // Give the chosen Satpam variant its own on-hand stock so the kit consumes
    // a real variant grain (seed inventory is otherwise plain-product).
    const variantBatch = await prisma.productBatch.create({
      data: {
        batchNumber: 'B-SKU-004-VAR-BLA-L',
        productId: satpam.id,
        expiryDate: null,
        notes: 'Variant stock for kitting demo',
      },
    });
    const variantInv = await prisma.inventory.create({
      data: {
        productId: satpam.id,
        productVariantId: satpamVariant.id,
        batchId: variantBatch.id,
        locationId: uniformBin.id,
        quantity: 20,
      },
    });

    const bom = await prisma.billOfMaterials.create({
      data: {
        kitProductId: kit.id,
        version: 1,
        name: 'Security Onboarding Kit v1',
        status: BomStatus.ACTIVE,
        effectiveFrom: NOW,
      },
    });
    await prisma.bomLine.createMany({
      data: [
        {
          bomId: bom.id,
          componentProductId: satpam.id,
          componentProductVariantId: satpamVariant.id,
          quantity: 1,
          sequence: 10,
        },
        { bomId: bom.id, componentProductId: lanyard.id, quantity: 1, sequence: 20 },
        { bomId: bom.id, componentProductId: radio.id, quantity: 1, sequence: 30 },
      ],
    });

    const wo = await prisma.workOrder.create({
      data: {
        number: 'WO-00001',
        type: WorkOrderType.ASSEMBLE,
        status: WorkOrderStatus.COMPLETED,
        kitProductId: kit.id,
        bomId: bom.id,
        quantity: KIT_QTY,
        locationId: uniformBin.id,
        completedAt: NOW,
        notes: 'Demo assembly seeded',
      },
    });

    // Consume the variant uniform.
    await prisma.inventory.update({
      where: { id: variantInv.id },
      data: { quantity: { decrement: KIT_QTY } },
    });
    await prisma.workOrderComponent.create({
      data: {
        workOrderId: wo.id,
        componentProductId: satpam.id,
        componentProductVariantId: satpamVariant.id,
        batchId: variantBatch.id,
        plannedQty: KIT_QTY,
        consumedQty: KIT_QTY,
        locationId: uniformBin.id,
      },
    });
    await prisma.stockMovement.create({
      data: {
        type: MovementType.OUT,
        quantity: KIT_QTY,
        productId: satpam.id,
        batchId: variantBatch.id,
        inventoryId: variantInv.id,
        fromLocationId: uniformBin.id,
        referenceType: ReferenceType.KIT_ASSEMBLE,
        referenceId: wo.id,
        reason: 'Consumed into kit WO-00001',
      },
    });

    // Consume the bulk lanyard.
    const lanyardInv = await prisma.inventory.findFirst({
      where: {
        productId: lanyard.id,
        productVariantId: null,
        serialUnitId: null,
        quantity: { gte: KIT_QTY },
      },
    });
    if (lanyardInv) {
      await prisma.inventory.update({
        where: { id: lanyardInv.id },
        data: { quantity: { decrement: KIT_QTY } },
      });
      await prisma.workOrderComponent.create({
        data: {
          workOrderId: wo.id,
          componentProductId: lanyard.id,
          batchId: lanyardInv.batchId,
          plannedQty: KIT_QTY,
          consumedQty: KIT_QTY,
          locationId: lanyardInv.locationId,
        },
      });
      await prisma.stockMovement.create({
        data: {
          type: MovementType.OUT,
          quantity: KIT_QTY,
          productId: lanyard.id,
          batchId: lanyardInv.batchId,
          inventoryId: lanyardInv.id,
          fromLocationId: lanyardInv.locationId,
          referenceType: ReferenceType.KIT_ASSEMBLE,
          referenceId: wo.id,
          reason: 'Consumed into kit WO-00001',
        },
      });
    }

    // Consume serialized radios (per-unit genealogy).
    const radios = await prisma.serialUnit.findMany({
      where: { productId: radio.id, status: SerialStatus.IN_STOCK, serviceable: true },
      take: KIT_QTY,
    });
    for (const s of radios) {
      await prisma.serialUnit.update({
        where: { id: s.id },
        data: {
          status: SerialStatus.ISSUED,
          currentHolder: 'Kit WO-00001',
          currentLocationId: null,
        },
      });
      await prisma.workOrderComponent.create({
        data: {
          workOrderId: wo.id,
          componentProductId: radio.id,
          serialUnitId: s.id,
          plannedQty: 0,
          consumedQty: 1,
          locationId: s.currentLocationId,
        },
      });
      await prisma.stockMovement.create({
        data: {
          type: MovementType.OUT,
          quantity: 1,
          productId: radio.id,
          serialUnitId: s.id,
          fromLocationId: s.currentLocationId,
          referenceType: ReferenceType.KIT_ASSEMBLE,
          referenceId: wo.id,
          reason: 'Consumed into kit WO-00001',
        },
      });
    }

    // Produce the assembled kits as a fresh batch of stock.
    const kitBatch = await prisma.productBatch.create({
      data: {
        batchNumber: 'KIT-WO-00001',
        productId: kit.id,
        expiryDate: null,
        notes: 'Assembled by WO-00001',
      },
    });
    const kitInv = await prisma.inventory.create({
      data: {
        productId: kit.id,
        batchId: kitBatch.id,
        locationId: uniformBin.id,
        quantity: KIT_QTY,
      },
    });
    await prisma.stockMovement.create({
      data: {
        type: MovementType.IN,
        quantity: KIT_QTY,
        productId: kit.id,
        batchId: kitBatch.id,
        inventoryId: kitInv.id,
        toLocationId: uniformBin.id,
        referenceType: ReferenceType.KIT_ASSEMBLE,
        referenceId: wo.id,
        reason: 'Assembled kit WO-00001',
      },
    });

    console.log(
      `Created kit "${kit.sku}" with a 3-line BOM and assembled ${KIT_QTY} units ` +
        `(consumed 1 variant uniform + 1 lanyard + 1 radio each).`,
    );

    // --- Phase 6: a headcount-driven contract for the kit ------------------
    const client = customerRecords[0];
    if (client) {
      const contract = await prisma.contract.create({
        data: {
          code: 'CTR-2026-001',
          name: `${client.name} — Security Staffing 2026`,
          customerId: client.id,
          headcount: 50,
          status: 'ACTIVE',
          recurring: true,
          notes: '50 guards: each needs one Security Onboarding Kit.',
        },
      });
      await prisma.contractLine.create({
        data: { contractId: contract.id, productId: kit.id, qtyPerHead: 1, fixedQty: 5 },
      });
      console.log(
        `Created contract ${contract.code} (50 guards → 55 onboarding kits of demand).`,
      );
    }

    // --- Phase 7: reverse logistics — returns across families -------------
    const returnedRadio = await prisma.serialUnit.findFirst({
      where: { status: SerialStatus.ISSUED, currentHolder: { startsWith: 'Field officer' } },
    });
    const quarantineBin = locationRecords.find(
      (l) => l.family === 'CHEM-STORE' && l.role === BinRole.QUARANTINE,
    );
    const chem = productRecords.find((p) => p.sku === 'SKU-009');
    const ret = await prisma.return.create({
      data: {
        number: 'RET-00001',
        customerId: client?.id ?? null,
        referenceType: ReferenceType.ASSET_ISSUE,
        status: 'PROCESSED',
        notes: 'Mixed return: radio to pool, uniforms to laundry, chemical to quarantine.',
      },
    });

    // Radio → asset pool (back to IN_STOCK, serviceable).
    if (returnedRadio) {
      await prisma.serialUnit.update({
        where: { id: returnedRadio.id },
        data: { status: SerialStatus.IN_STOCK, serviceable: true, currentHolder: null, currentLocationId: assetPoolBin?.id ?? null, issuedToCustomerId: null, issuedAt: null },
      });
      await prisma.returnLine.create({
        data: { returnId: ret.id, productId: returnedRadio.productId, serialUnitId: returnedRadio.id, quantity: 1, disposition: 'ASSET_POOL', toLocationId: assetPoolBin?.id ?? null, processedAt: NOW },
      });
      await prisma.serialUnitEvent.create({
        data: { serialUnitId: returnedRadio.id, type: SerialEventType.RETURN, fromStatus: SerialStatus.ISSUED, toStatus: SerialStatus.IN_STOCK, toLocationId: assetPoolBin?.id ?? null, notes: 'Returned to asset pool via RET-00001' },
      });
    }

    // Uniforms → laundry rotation, shown washed (READY) and back in the pick face.
    const washLine = await prisma.returnLine.create({
      data: { returnId: ret.id, productId: satpam.id, productVariantId: satpamVariant.id, quantity: 4, disposition: 'LAUNDRY', toLocationId: uniformBin.id, processedAt: NOW },
    });
    const washBatch = await prisma.productBatch.create({
      data: { batchNumber: 'WASH-RET-00001', productId: satpam.id, expiryDate: null, notes: 'Laundered uniforms' },
    });
    const washInv = await prisma.inventory.create({
      data: { productId: satpam.id, productVariantId: satpamVariant.id, batchId: washBatch.id, locationId: uniformBin.id, quantity: 4 },
    });
    await prisma.washCycle.create({
      data: { productId: satpam.id, productVariantId: satpamVariant.id, quantity: 4, state: 'READY', returnLineId: washLine.id, locationId: uniformBin.id },
    });
    await prisma.stockMovement.create({
      data: { type: MovementType.IN, quantity: 4, productId: satpam.id, batchId: washBatch.id, inventoryId: washInv.id, toLocationId: uniformBin.id, referenceType: ReferenceType.RETURN, referenceId: ret.id, reason: 'Washed uniforms returned to pick face' },
    });

    // Damaged chemical → quarantine bin.
    if (chem && quarantineBin) {
      const qBatch = await prisma.productBatch.create({
        data: { batchNumber: 'RET-Q-SKU-009', productId: chem.id, expiryDate: null, notes: 'Returned for quarantine' },
      });
      const qInv = await prisma.inventory.create({
        data: { productId: chem.id, batchId: qBatch.id, locationId: quarantineBin.id, quantity: 5 },
      });
      await prisma.returnLine.create({
        data: { returnId: ret.id, productId: chem.id, batchId: qBatch.id, quantity: 5, disposition: 'QUARANTINE', toLocationId: quarantineBin.id, condition: 'Leaking container', processedAt: NOW },
      });
      await prisma.stockMovement.create({
        data: { type: MovementType.IN, quantity: 5, productId: chem.id, batchId: qBatch.id, inventoryId: qInv.id, toLocationId: quarantineBin.id, referenceType: ReferenceType.RETURN, referenceId: ret.id, reason: 'Damaged chemical to quarantine' },
      });
    }

    console.log(
      'Created return RET-00001 (radio→pool, uniforms→laundry READY, chemical→quarantine).',
    );
  }

  // --- Stock movements ----------------------------------------------------
  const movements: any[] = [];

  // 1) An inbound (GOODS_RECEIPT) movement when each batch was received.
  for (const b of batchInfos) {
    movements.push({
      type: MovementType.IN,
      quantity: b.quantity,
      reason: 'Goods receipt',
      referenceType: ReferenceType.GOODS_RECEIPT,
      productId: b.productId,
      batchId: b.id,
      toLocationId: b.locationId,
      userId: pick(userRecords).id,
      createdAt: atDay(b.receivedAt, randInt(8, 16), randInt(0, 59)),
    });
  }

  // 2) Daily activity across the history window -> one dot per day on the
  //    stock-movement line chart.
  for (let day = DAYS; day >= 0; day--) {
    const date = daysAgo(day);
    const count = randInt(1, PER_DAY_MAX);
    for (let i = 0; i < count; i++) {
      const batch = pick(batchInfos);
      const type = weighted<MovementType>([
        [MovementType.OUT, 5],
        [MovementType.IN, 2],
        [MovementType.TRANSFER, 2],
        [MovementType.ADJUSTMENT, 1],
      ]);
      const quantity = randInt(1, 40);
      const createdAt = atDay(date, randInt(8, 18), randInt(0, 59));
      const user = pick(userRecords).id;

      const base: any = {
        type,
        quantity,
        productId: batch.productId,
        batchId: batch.id,
        userId: user,
        createdAt,
      };

      if (type === MovementType.OUT) {
        base.reason = 'Order fulfilment';
        base.referenceType = ReferenceType.SALES_ORDER;
        base.fromLocationId = batch.locationId;
      } else if (type === MovementType.IN) {
        base.reason = 'Replenishment';
        base.referenceType = ReferenceType.GOODS_RECEIPT;
        base.toLocationId = batch.locationId;
      } else if (type === MovementType.TRANSFER) {
        const dest = pick(locationRecords);
        base.reason = 'Bin transfer';
        base.referenceType = ReferenceType.MANUAL;
        base.fromLocationId = batch.locationId;
        base.toLocationId = dest.id;
      } else {
        base.reason = pick(['Cycle count correction', 'Damaged stock', 'Found stock']);
        base.referenceType = ReferenceType.STOCK_ADJUSTMENT;
        base.toLocationId = batch.locationId;
        base.quantity = randInt(-10, 10) || 1;
      }

      movements.push(base);
    }
  }

  await prisma.stockMovement.createMany({ data: movements });
  console.log(`Created ${movements.length} stock movements across ~${DAYS} days.`);

  // --- Purchase orders + goods receipts ----------------------------------
  let poCount = 0;
  let grnCount = 0;
  for (let i = 0; i < 10; i++) {
    const supplier = pick(supplierRecords);
    const creator = pick(userRecords);
    const orderDate = daysAgo(randInt(1, DAYS));
    const status = weighted<OrderStatus>([
      [OrderStatus.RECEIVED, 4],
      [OrderStatus.PARTIALLY_RECEIVED, 2],
      [OrderStatus.PENDING, 3],
      [OrderStatus.DRAFT, 1],
    ]);

    const itemProducts = [...productRecords]
      .sort(() => rng() - 0.5)
      .slice(0, randInt(2, 4));

    const po = await prisma.purchaseOrder.create({
      data: {
        orderNumber: `PO-${String(1000 + i)}`,
        supplierId: supplier.id,
        status,
        orderDate,
        expectedDate: addMonths(orderDate, 1),
        createdBy: creator.id,
        approvedBy: status === OrderStatus.DRAFT ? null : pick(userRecords).id,
        approvedAt: status === OrderStatus.DRAFT ? null : orderDate,
        items: {
          create: itemProducts.map((p) => ({
            productId: p.id,
            quantity: randInt(20, 200),
            unitPrice: randInt(5, 80) * 1000,
          })),
        },
      },
    });
    poCount++;

    if (status === OrderStatus.RECEIVED || status === OrderStatus.PARTIALLY_RECEIVED) {
      await prisma.goodsReceipt.create({
        data: {
          receiptNumber: `GRN-${String(2000 + i)}`,
          purchaseOrderId: po.id,
          status: GoodsReceiptStatus.RECEIVED,
          receivedById: pick(userRecords).id,
          receivedAt: addMonths(orderDate, 0),
          finalizedById: pick(userRecords).id,
          finalizedAt: addMonths(orderDate, 0),
        },
      });
      grnCount++;
    }
  }
  console.log(`Created ${poCount} purchase orders, ${grnCount} goods receipts.`);

  // --- Sales orders + shipments ------------------------------------------
  let soCount = 0;
  let shipCount = 0;
  for (let i = 0; i < 12; i++) {
    const customer = pick(customerRecords);
    const creator = pick(userRecords);
    const orderDate = daysAgo(randInt(1, DAYS));
    const status = weighted<SalesOrderStatus>([
      [SalesOrderStatus.SHIPPED, 4],
      [SalesOrderStatus.PARTIALLY_SHIPPED, 2],
      [SalesOrderStatus.PENDING, 3],
      [SalesOrderStatus.DRAFT, 1],
    ]);

    const itemProducts = [...productRecords]
      .sort(() => rng() - 0.5)
      .slice(0, randInt(1, 4));

    const so = await prisma.salesOrder.create({
      data: {
        orderNumber: `SO-${String(3000 + i)}`,
        customerId: customer.id,
        status,
        orderDate,
        userId: creator.id,
        items: {
          create: itemProducts.map((p) => ({
            productId: p.id,
            quantity: randInt(5, 60),
            unitPrice: randInt(8, 120) * 1000,
          })),
        },
      },
    });
    soCount++;

    if (
      status === SalesOrderStatus.SHIPPED ||
      status === SalesOrderStatus.PARTIALLY_SHIPPED
    ) {
      const shipped = addMonths(orderDate, 0);
      const delivered = status === SalesOrderStatus.SHIPPED;
      await prisma.shipment.create({
        data: {
          shipmentNumber: `SHP-${String(4000 + i)}`,
          salesOrderId: so.id,
          status: delivered ? ShipmentStatus.DELIVERED : ShipmentStatus.IN_TRANSIT,
          shippedAt: shipped,
          deliveredAt: delivered ? new Date(shipped.getTime() + 2 * 86400000) : null,
          userId: pick(userRecords).id,
        },
      });
      shipCount++;
    }
  }
  console.log(`Created ${soCount} sales orders, ${shipCount} shipments.`);

  console.log('\nDemo seed complete.');
  console.log(
    `Logins: ${users.map((u) => u.email).join(', ')} / "${SEED_PASSWORD}" ` +
      '(override with SEED_ADMIN_PASSWORD).',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
