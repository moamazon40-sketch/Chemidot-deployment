/**
 * One-time migration script for existing demo databases that were seeded before
 * seed-supplier-shop.ts was updated with real URLs.
 *
 * Run once with: pnpm --filter @workspace/scripts run update:supplier-shop-urls
 *
 * Fresh databases seeded with `pnpm seed` do not need this script.
 */
import { db } from "@workspace/db";
import {
  suppliersTable,
  supplierBrandsTable,
  supplierDocumentsTable,
  supplierExpertsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

function avatar(name: string, bg = "0f172a") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=ffffff&size=128&bold=true&rounded=true`;
}

function brandLogo(name: string, bg = "1d4ed8") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=ffffff&size=200&bold=true&font-size=0.33`;
}

async function update() {
  console.log("Updating supplier shop URLs...");

  // ── Brand logos ──────────────────────────────────────────────────────────
  const brandUpdates: { name: string; logoUrl: string }[] = [
    { name: "SABIC Petrochemicals", logoUrl: brandLogo("SABIC Petrochem", "1d4ed8") },
    { name: "SABIC Agri-Nutrients", logoUrl: brandLogo("SABIC Agri", "15803d") },
    { name: "SABIC Specialties", logoUrl: brandLogo("SABIC Spec", "7c3aed") },
    { name: "NCC Industrial Grade", logoUrl: brandLogo("NCC Industrial", "b45309") },
    { name: "NCC AgroSolutions", logoUrl: brandLogo("NCC Agro", "15803d") },
    { name: "ECP Polymers", logoUrl: brandLogo("ECP Polymers", "0f766e") },
    { name: "ECP Solvents", logoUrl: brandLogo("ECP Solvents", "0369a1") },
  ];
  for (const { name, logoUrl } of brandUpdates) {
    await db.update(supplierBrandsTable).set({ logoUrl }).where(eq(supplierBrandsTable.name, name));
  }
  console.log("✓ brand logos updated");

  // ── Expert avatars ───────────────────────────────────────────────────────
  const expertUpdates: { name: string; avatarUrl: string }[] = [
    { name: "Dr. Nasser Al-Qahtani", avatarUrl: avatar("Nasser Al-Qahtani", "1d4ed8") },
    { name: "Eng. Reem Al-Harbi", avatarUrl: avatar("Reem Al-Harbi", "0369a1") },
    { name: "Ahmed Bin Saleh", avatarUrl: avatar("Ahmed Bin Saleh", "7c3aed") },
    { name: "Khalid Al-Ghamdi", avatarUrl: avatar("Khalid Al-Ghamdi", "b45309") },
    { name: "Mona Al-Shehri", avatarUrl: avatar("Mona Al-Shehri", "be185d") },
    { name: "Sara Hassan", avatarUrl: avatar("Sara Hassan", "0f766e") },
    { name: "Omar Farouk", avatarUrl: avatar("Omar Farouk", "0369a1") },
  ];
  for (const { name, avatarUrl } of expertUpdates) {
    await db.update(supplierExpertsTable).set({ avatarUrl }).where(eq(supplierExpertsTable.name, name));
  }
  console.log("✓ expert avatars updated");

  // ── Document URLs for existing records ───────────────────────────────────
  const docUpdates: { title: string; fileUrl: string; type: string }[] = [
    { title: "ISO 9001:2015 Certificate", fileUrl: "https://www.iso.org/iso-9001-quality-management.html", type: "certification" },
    { title: "ISO 14001:2015 Environmental Certificate", fileUrl: "https://www.iso.org/iso-14001-environmental-management.html", type: "certification" },
    { title: "REACH Compliance Declaration", fileUrl: "https://echa.europa.eu/regulations/reach/understanding-reach", type: "compliance" },
    { title: "SABIC Product Catalogue 2024", fileUrl: "https://www.sabic.com/en/products", type: "catalogue" },
    { title: "Quality Management Manual", fileUrl: "https://www.iso.org/iso-9001-quality-management.html", type: "technical" },
    { title: "OHSAS 18001 Health & Safety Certificate", fileUrl: "https://www.bsigroup.com/en-GB/ohsas-18001-occupational-health-and-safety/", type: "certification" },
    { title: "NCC Product Portfolio 2024", fileUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/1118", type: "catalogue" },
    { title: "Safety Data Sheets \u2014 Acids & Bases", fileUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/1118#section=Safety-and-Hazards", type: "sds" },
    { title: "GMP Certificate \u2014 Pharmaceutical Solvents", fileUrl: "https://www.ema.europa.eu/en/human-regulatory-overview/research-and-development/scientific-guidelines/good-manufacturing-practice", type: "certification" },
    { title: "ECP Polymer Databook 2024", fileUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/9002-07-7", type: "catalogue" },
    { title: "Chemical Safety & Handling Guide", fileUrl: "https://echa.europa.eu/substance-information/-/substanceinfo/100.105.994", type: "sds" },
  ];
  for (const { title, fileUrl, type } of docUpdates) {
    await db.update(supplierDocumentsTable).set({ fileUrl, type }).where(eq(supplierDocumentsTable.title, title));
  }
  console.log("✓ document URLs updated");

  // ── Insert missing TDS/SDS for suppliers that lack them ──────────────────
  const suppliers = await db
    .select({ id: suppliersTable.id, name: suppliersTable.companyName })
    .from(suppliersTable);
  const byName: Record<string, number> = {};
  for (const s of suppliers) byName[s.name] = s.id;

  const sabicId = byName["SABIC Distribution"];
  const nccId = byName["National Chemical Co."];
  const ecpId = byName["Emirates Chem & Polymer"];

  if (sabicId) {
    const existing = await db
      .select({ title: supplierDocumentsTable.title })
      .from(supplierDocumentsTable)
      .where(eq(supplierDocumentsTable.supplierId, sabicId));
    const titles = new Set(existing.map(d => d.title));

    if (!titles.has("Sodium Hydroxide \u2014 Safety Data Sheet (SDS)")) {
      await db.insert(supplierDocumentsTable).values({
        supplierId: sabicId,
        title: "Sodium Hydroxide \u2014 Safety Data Sheet (SDS)",
        type: "sds",
        fileUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/14798#section=Safety-and-Hazards",
        fileSize: "245 KB",
      });
      console.log("  + Added SDS for SABIC Distribution");
    }
    if (!titles.has("Polyethylene HDPE \u2014 Technical Data Sheet (TDS)")) {
      await db.insert(supplierDocumentsTable).values({
        supplierId: sabicId,
        title: "Polyethylene HDPE \u2014 Technical Data Sheet (TDS)",
        type: "tds",
        fileUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/14482#section=Chemical-and-Physical-Properties",
        fileSize: "312 KB",
      });
      console.log("  + Added TDS for SABIC Distribution");
    }
  }

  if (nccId) {
    const existing = await db
      .select({ title: supplierDocumentsTable.title })
      .from(supplierDocumentsTable)
      .where(eq(supplierDocumentsTable.supplierId, nccId));
    const titles = new Set(existing.map(d => d.title));

    if (!titles.has("Urea (Fertilizer Grade) \u2014 Technical Data Sheet (TDS)")) {
      await db.insert(supplierDocumentsTable).values({
        supplierId: nccId,
        title: "Urea (Fertilizer Grade) \u2014 Technical Data Sheet (TDS)",
        type: "tds",
        fileUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/1176#section=Chemical-and-Physical-Properties",
        fileSize: "198 KB",
      });
      console.log("  + Added TDS for National Chemical Co.");
    }
  }

  if (ecpId) {
    const existing = await db
      .select({ title: supplierDocumentsTable.title })
      .from(supplierDocumentsTable)
      .where(eq(supplierDocumentsTable.supplierId, ecpId));
    const titles = new Set(existing.map(d => d.title));

    if (!titles.has("Methanol (Industrial Grade) \u2014 Technical Data Sheet (TDS)")) {
      await db.insert(supplierDocumentsTable).values({
        supplierId: ecpId,
        title: "Methanol (Industrial Grade) \u2014 Technical Data Sheet (TDS)",
        type: "tds",
        fileUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/887#section=Chemical-and-Physical-Properties",
        fileSize: "185 KB",
      });
      console.log("  + Added TDS for Emirates Chem & Polymer");
    }
  }

  console.log("✓ TDS/SDS records ensured for all suppliers");
  console.log("✅ Update complete!");
  process.exit(0);
}

update().catch(err => { console.error(err); process.exit(1); });
