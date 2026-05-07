import { db, categoriesTable } from "@workspace/db";

const DEFAULT_CATEGORIES = [
  { name: "Industrial Chemicals", nameAr: "Industrial Chemicals", slug: "industrial-chemicals", iconUrl: null },
  { name: "Petrochemicals", nameAr: "Petrochemicals", slug: "petrochemicals", iconUrl: null },
  { name: "Agricultural Chemicals", nameAr: "Agricultural Chemicals", slug: "agricultural-chemicals", iconUrl: null },
  { name: "Specialty Chemicals", nameAr: "Specialty Chemicals", slug: "specialty-chemicals", iconUrl: null },
  { name: "Polymers & Plastics", nameAr: "Polymers & Plastics", slug: "polymers-plastics", iconUrl: null },
  { name: "Solvents", nameAr: "Solvents", slug: "solvents", iconUrl: null },
  { name: "Acids & Bases", nameAr: "Acids & Bases", slug: "acids-bases", iconUrl: null },
  { name: "Food & Feed Additives", nameAr: "Food & Feed Additives", slug: "food-feed-additives", iconUrl: null },
];

async function ensureBaseData() {
  await db.insert(categoriesTable).values(DEFAULT_CATEGORIES).onConflictDoNothing({
    target: categoriesTable.slug,
  });

  console.log("Ensured baseline categories exist.");
}

ensureBaseData().catch((error) => {
  console.error(error);
  process.exit(1);
});
