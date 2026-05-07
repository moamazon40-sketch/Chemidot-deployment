import { db } from "@workspace/db";
import {
  suppliersTable,
  supplierBrandsTable,
  supplierDocumentsTable,
  supplierExpertsTable,
} from "@workspace/db";
import { eq, count } from "drizzle-orm";

function avatar(name: string, bg = "0f172a") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=ffffff&size=128&bold=true&rounded=true`;
}

function brandLogo(name: string, bg = "1d4ed8") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=ffffff&size=200&bold=true&font-size=0.33`;
}

async function seed() {
  console.log("Seeding supplier shop data...");

  const suppliers = await db
    .select({ id: suppliersTable.id, name: suppliersTable.companyName })
    .from(suppliersTable);

  if (suppliers.length === 0) {
    console.log("No suppliers found — run the main seed first.");
    process.exit(0);
  }

  const byName: Record<string, number> = {};
  for (const s of suppliers) byName[s.name] = s.id;

  const sabicId = byName["SABIC Distribution"];
  const nccId = byName["National Chemical Co."];
  const ecpId = byName["Emirates Chem & Polymer"];

  for (const [label, supplierId] of [
    ["SABIC Distribution", sabicId],
    ["National Chemical Co.", nccId],
    ["Emirates Chem & Polymer", ecpId],
  ] as [string, number][]) {
    if (!supplierId) {
      console.log(`Supplier "${label}" not found, skipping.`);
      continue;
    }

    const [existing] = await db
      .select({ c: count() })
      .from(supplierBrandsTable)
      .where(eq(supplierBrandsTable.supplierId, supplierId));

    if (Number(existing?.c) > 0) {
      console.log(`✓ ${label} shop data already seeded, skipping.`);
      continue;
    }

    console.log(`Seeding shop data for ${label} (id=${supplierId})...`);
    await seedSupplierShop(supplierId, label);
  }

  console.log("✅ Supplier shop seed complete!");
  process.exit(0);
}

export async function seedSupplierShop(supplierId: number, name: string) {
  if (name === "SABIC Distribution") {
    await db.insert(supplierBrandsTable).values([
      {
        supplierId,
        name: "SABIC Petrochemicals",
        logoUrl: brandLogo("SABIC Petrochem", "1d4ed8"),
        description: "Flagship petrochemical brand covering ethylene, propylene, and core polymer derivatives.",
      },
      {
        supplierId,
        name: "SABIC Agri-Nutrients",
        logoUrl: brandLogo("SABIC Agri", "15803d"),
        description: "Leading manufacturer of urea, ammonia, and granular fertilizers for agricultural markets.",
      },
      {
        supplierId,
        name: "SABIC Specialties",
        logoUrl: brandLogo("SABIC Spec", "7c3aed"),
        description: "High-value specialty polymers, resins, and engineering thermoplastics for demanding applications.",
      },
    ]);
    await db.insert(supplierDocumentsTable).values([
      {
        supplierId,
        title: "Sodium Hydroxide — Safety Data Sheet (SDS)",
        type: "sds",
        fileUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/14798#section=Safety-and-Hazards",
        fileSize: "245 KB",
      },
      {
        supplierId,
        title: "Polyethylene HDPE — Technical Data Sheet (TDS)",
        type: "tds",
        fileUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/14482#section=Chemical-and-Physical-Properties",
        fileSize: "312 KB",
      },
      {
        supplierId,
        title: "ISO 9001:2015 Quality Management Certificate",
        type: "certification",
        fileUrl: "https://www.iso.org/iso-9001-quality-management.html",
        fileSize: "231 KB",
      },
      {
        supplierId,
        title: "ISO 14001:2015 Environmental Management Certificate",
        type: "certification",
        fileUrl: "https://www.iso.org/iso-14001-environmental-management.html",
        fileSize: "218 KB",
      },
      {
        supplierId,
        title: "REACH Compliance Declaration",
        type: "compliance",
        fileUrl: "https://echa.europa.eu/regulations/reach/understanding-reach",
        fileSize: "180 KB",
      },
    ]);
    await db.insert(supplierExpertsTable).values([
      {
        supplierId,
        name: "Dr. Nasser Al-Qahtani",
        title: "Head of Technical Sales — Polymers",
        email: "n.alqahtani@sabic.example.com",
        avatarUrl: avatar("Nasser Al-Qahtani", "1d4ed8"),
      },
      {
        supplierId,
        name: "Eng. Reem Al-Harbi",
        title: "Regional Sales Manager — GCC",
        email: "r.alharbi@sabic.example.com",
        avatarUrl: avatar("Reem Al-Harbi", "0369a1"),
      },
      {
        supplierId,
        name: "Ahmed Bin Saleh",
        title: "Application Development Engineer",
        email: "a.binsaleh@sabic.example.com",
        avatarUrl: avatar("Ahmed Bin Saleh", "7c3aed"),
      },
    ]);
  }

  if (name === "National Chemical Co.") {
    await db.insert(supplierBrandsTable).values([
      {
        supplierId,
        name: "NCC Industrial Grade",
        logoUrl: brandLogo("NCC Industrial", "b45309"),
        description: "Broad portfolio of industrial-grade acids, bases, and solvents for manufacturing and processing industries.",
      },
      {
        supplierId,
        name: "NCC AgroSolutions",
        logoUrl: brandLogo("NCC Agro", "15803d"),
        description: "Crop nutrition chemicals, soil conditioners, and agrochemical inputs for Saudi agricultural markets.",
      },
    ]);
    await db.insert(supplierDocumentsTable).values([
      {
        supplierId,
        title: "Sulfuric Acid — Safety Data Sheet (SDS)",
        type: "sds",
        fileUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/1118#section=Safety-and-Hazards",
        fileSize: "268 KB",
      },
      {
        supplierId,
        title: "Urea (Fertilizer Grade) — Technical Data Sheet (TDS)",
        type: "tds",
        fileUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/1176#section=Chemical-and-Physical-Properties",
        fileSize: "198 KB",
      },
      {
        supplierId,
        title: "ISO 9001:2015 Quality Management Certificate",
        type: "certification",
        fileUrl: "https://www.iso.org/iso-9001-quality-management.html",
        fileSize: "212 KB",
      },
      {
        supplierId,
        title: "OHSAS 18001 Occupational Health & Safety Certificate",
        type: "certification",
        fileUrl: "https://www.bsigroup.com/en-GB/ohsas-18001-occupational-health-and-safety/",
        fileSize: "198 KB",
      },
    ]);
    await db.insert(supplierExpertsTable).values([
      {
        supplierId,
        name: "Khalid Al-Ghamdi",
        title: "Director of Sales & Business Development",
        email: "k.alghamdi@ncc.example.com",
        avatarUrl: avatar("Khalid Al-Ghamdi", "b45309"),
      },
      {
        supplierId,
        name: "Mona Al-Shehri",
        title: "Technical Support Specialist",
        email: "m.alshehri@ncc.example.com",
        avatarUrl: avatar("Mona Al-Shehri", "be185d"),
      },
    ]);
  }

  if (name === "Emirates Chem & Polymer") {
    await db.insert(supplierBrandsTable).values([
      {
        supplierId,
        name: "ECP Polymers",
        logoUrl: brandLogo("ECP Polymers", "0f766e"),
        description: "Commodity and specialty polymer compounds including PP, PE, PVC, and engineering resins.",
      },
      {
        supplierId,
        name: "ECP Solvents",
        logoUrl: brandLogo("ECP Solvents", "0369a1"),
        description: "Alcohol, ester, and hydrocarbon solvents for industrial cleaning, coatings, and extraction.",
      },
    ]);
    await db.insert(supplierDocumentsTable).values([
      {
        supplierId,
        title: "Polypropylene (PP) — Safety Data Sheet (SDS)",
        type: "sds",
        fileUrl: "https://echa.europa.eu/substance-information/-/substanceinfo/100.105.994",
        fileSize: "224 KB",
      },
      {
        supplierId,
        title: "Methanol (Industrial Grade) — Technical Data Sheet (TDS)",
        type: "tds",
        fileUrl: "https://pubchem.ncbi.nlm.nih.gov/compound/887#section=Chemical-and-Physical-Properties",
        fileSize: "185 KB",
      },
      {
        supplierId,
        title: "ISO 9001:2015 Quality Management Certificate",
        type: "certification",
        fileUrl: "https://www.iso.org/iso-9001-quality-management.html",
        fileSize: "224 KB",
      },
      {
        supplierId,
        title: "GMP Certificate — Pharmaceutical Solvents",
        type: "certification",
        fileUrl: "https://www.ema.europa.eu/en/human-regulatory-overview/research-and-development/scientific-guidelines/good-manufacturing-practice",
        fileSize: "267 KB",
      },
    ]);
    await db.insert(supplierExpertsTable).values([
      {
        supplierId,
        name: "Sara Hassan",
        title: "Key Account Manager — GCC Polymers",
        email: "s.hassan@ecp.example.com",
        avatarUrl: avatar("Sara Hassan", "0f766e"),
      },
      {
        supplierId,
        name: "Omar Farouk",
        title: "Technical Sales Engineer — Solvents",
        email: "o.farouk@ecp.example.com",
        avatarUrl: avatar("Omar Farouk", "0369a1"),
      },
    ]);
  }

  console.log(`  ✓ Brands, documents, experts seeded for ${name}`);
}

seed().catch(err => { console.error(err); process.exit(1); });
