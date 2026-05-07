import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  usersTable, suppliersTable, categoriesTable, productsTable,
  rfqsTable, quotationsTable, collectiveOrdersTable,
  collectiveOrderParticipantsTable, ordersTable,
} from "@workspace/db";
import { seedSupplierShop } from "./seed-supplier-shop.js";

async function seed() {
  console.log("Seeding database...");

  // ── Categories ──────────────────────────────────────────────────────────────
  const categoryData = [
    { name: "Industrial Chemicals", nameAr: "المواد الكيميائية الصناعية", slug: "industrial-chemicals", iconUrl: "🏭" },
    { name: "Petrochemicals", nameAr: "البتروكيماويات", slug: "petrochemicals", iconUrl: "⚗️" },
    { name: "Agricultural Chemicals", nameAr: "المواد الكيميائية الزراعية", slug: "agricultural-chemicals", iconUrl: "🌾" },
    { name: "Specialty Chemicals", nameAr: "المواد الكيميائية المتخصصة", slug: "specialty-chemicals", iconUrl: "🔬" },
    { name: "Polymers & Plastics", nameAr: "البوليمرات والبلاستيك", slug: "polymers-plastics", iconUrl: "🧪" },
    { name: "Solvents", nameAr: "المذيبات", slug: "solvents", iconUrl: "💧" },
    { name: "Acids & Bases", nameAr: "الأحماض والقواعد", slug: "acids-bases", iconUrl: "⚡" },
    { name: "Food & Feed Additives", nameAr: "إضافات الغذاء والأعلاف", slug: "food-feed-additives", iconUrl: "🌿" },
  ];

  const insertedCategories = await db.insert(categoriesTable).values(categoryData).returning();
  const catMap: Record<string, number> = {};
  for (const c of insertedCategories) catMap[c.slug] = c.id;
  console.log(`✓ ${insertedCategories.length} categories`);

  // ── Users ─────────────────────────────────────────────────────────────────
  const pw = await bcrypt.hash("password123", 10);

  const userData = [
    { email: "admin@chemidot.com", passwordHash: pw, role: "admin", firstName: "Admin", lastName: "User", companyName: "Chemidot", country: "SA", phone: "+966500000001", industry: "Technology", status: "active" },
    { email: "buyer1@example.com", passwordHash: pw, role: "buyer", firstName: "Ahmed", lastName: "Al-Rashidi", companyName: "Saudi Industrial Corp", country: "SA", phone: "+966501234567", industry: "Manufacturing", status: "active" },
    { email: "buyer2@example.com", passwordHash: pw, role: "buyer", firstName: "Fatima", lastName: "Al-Zahrani", companyName: "Gulf Chemicals Trading", country: "AE", phone: "+971551234567", industry: "Trading", status: "active" },
    { email: "supplier1@example.com", passwordHash: pw, role: "supplier", firstName: "Mohammed", lastName: "Al-Otaibi", companyName: "SABIC Distribution", country: "SA", phone: "+966509876543", industry: "Petrochemicals", status: "active" },
    { email: "supplier2@example.com", passwordHash: pw, role: "supplier", firstName: "Khalid", lastName: "Al-Ghamdi", companyName: "National Chemical Co.", country: "SA", phone: "+966512345678", industry: "Industrial Chemicals", status: "active" },
    { email: "supplier3@example.com", passwordHash: pw, role: "supplier", firstName: "Sara", lastName: "Hassan", companyName: "Emirates Chem & Polymer", country: "AE", phone: "+971521234567", industry: "Polymers", status: "active" },
  ];

  const insertedUsers = await db.insert(usersTable).values(userData as any).returning();
  const userMap: Record<string, number> = {};
  for (const u of insertedUsers) userMap[u.email] = u.id;
  console.log(`✓ ${insertedUsers.length} users`);

  // ── Suppliers ─────────────────────────────────────────────────────────────
  const supplierData = [
    {
      userId: userMap["supplier1@example.com"],
      companyName: "SABIC Distribution",
      logoUrl: null,
      country: "SA",
      commercialRegNumber: "CR-1010000001",
      warehouseLocation: "Jubail Industrial City, Saudi Arabia",
      certifications: ["ISO 9001:2015", "ISO 14001:2015", "REACH Compliant"],
      verified: true,
      featured: true,
      responseRate: "94",
      avgResponseTime: "2 hours",
      yearsInBusiness: 35,
    },
    {
      userId: userMap["supplier2@example.com"],
      companyName: "National Chemical Co.",
      logoUrl: null,
      country: "SA",
      commercialRegNumber: "CR-1010000002",
      warehouseLocation: "Riyadh, Saudi Arabia",
      certifications: ["ISO 9001:2015", "OHSAS 18001"],
      verified: true,
      featured: true,
      responseRate: "88",
      avgResponseTime: "4 hours",
      yearsInBusiness: 20,
    },
    {
      userId: userMap["supplier3@example.com"],
      companyName: "Emirates Chem & Polymer",
      logoUrl: null,
      country: "AE",
      commercialRegNumber: "CR-9010000003",
      warehouseLocation: "Jebel Ali Free Zone, Dubai",
      certifications: ["ISO 9001:2015", "GMP Certified"],
      verified: true,
      featured: false,
      responseRate: "91",
      avgResponseTime: "3 hours",
      yearsInBusiness: 15,
    },
  ];

  const insertedSuppliers = await db.insert(suppliersTable).values(supplierData as any).returning();
  const sup = insertedSuppliers;
  console.log(`✓ ${sup.length} suppliers`);

  // ── Products ──────────────────────────────────────────────────────────────
  const pricingTiers3 = [
    { minQuantity: 1, maxQuantity: 9, pricePerUnit: 450, discountPercent: 0 },
    { minQuantity: 10, maxQuantity: 49, pricePerUnit: 420, discountPercent: 7 },
    { minQuantity: 50, maxQuantity: null, pricePerUnit: 385, discountPercent: 14 },
  ];
  const pricingTiers2 = [
    { minQuantity: 1, maxQuantity: 19, pricePerUnit: 320, discountPercent: 0 },
    { minQuantity: 20, maxQuantity: 99, pricePerUnit: 295, discountPercent: 8 },
    { minQuantity: 100, maxQuantity: null, pricePerUnit: 270, discountPercent: 16 },
  ];

  const productData = [
    {
      supplierId: sup[0].id, categoryId: catMap["acids-bases"],
      name: "Sodium Hydroxide (Caustic Soda)", casNumber: "1310-73-2",
      description: "High-purity sodium hydroxide (NaOH) flakes and pellets for industrial applications. Used in chemical manufacturing, pulp & paper, textiles, and water treatment.",
      imageUrl: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=400",
      images: ["https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800"],
      moq: "1", moqUnit: "MT", basePrice: "450", currency: "USD",
      availability: "in_stock", deliveryLeadTime: "7-14 days",
      collectiveEligible: true, featured: true,
      pricingTiers: pricingTiers3,
      technicalSpecs: [
        { property: "Purity", value: "99.5%", unit: "%" },
        { property: "Form", value: "Flakes/Pellets", unit: "" },
        { property: "pH (5% solution)", value: "13-14", unit: "" },
      ],
      applications: ["Water Treatment", "Soap Manufacturing", "Paper Industry", "Chemical Synthesis"],
      packaging: "25kg bags or 1000kg bulk bags",
      countryOfOrigin: "SA",
    },
    {
      supplierId: sup[0].id, categoryId: catMap["petrochemicals"],
      name: "Polyethylene (HDPE)", casNumber: "9002-88-4",
      description: "High-density polyethylene for packaging, containers, and industrial applications. Excellent chemical resistance and high strength-to-density ratio.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
      images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"],
      moq: "5", moqUnit: "MT", basePrice: "1250", currency: "USD",
      availability: "in_stock", deliveryLeadTime: "14-21 days",
      collectiveEligible: true, featured: true,
      pricingTiers: pricingTiers2,
      technicalSpecs: [
        { property: "Melt Flow Index", value: "0.3-8", unit: "g/10min" },
        { property: "Density", value: "0.941-0.965", unit: "g/cm³" },
        { property: "Tensile Strength", value: "28-38", unit: "MPa" },
      ],
      applications: ["Pipes & Fittings", "Packaging", "Containers", "Wire Insulation"],
      packaging: "25kg bags",
      countryOfOrigin: "SA",
    },
    {
      supplierId: sup[1].id, categoryId: catMap["acids-bases"],
      name: "Sulfuric Acid (H₂SO₄)", casNumber: "7664-93-9",
      description: "Industrial-grade sulfuric acid for chemical synthesis, fertilizer production, and metal processing. Available in various concentrations.",
      imageUrl: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400",
      images: ["https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800"],
      moq: "2", moqUnit: "MT", basePrice: "280", currency: "USD",
      availability: "in_stock", deliveryLeadTime: "7-10 days",
      collectiveEligible: false, featured: true,
      pricingTiers: [
        { minQuantity: 1, maxQuantity: 9, pricePerUnit: 280, discountPercent: 0 },
        { minQuantity: 10, maxQuantity: null, pricePerUnit: 245, discountPercent: 13 },
      ],
      technicalSpecs: [
        { property: "Concentration", value: "98", unit: "%" },
        { property: "Density", value: "1.84", unit: "g/mL" },
        { property: "Iron Content", value: "<5", unit: "ppm" },
      ],
      applications: ["Fertilizer Production", "Metal Processing", "Chemical Synthesis", "Battery Manufacturing"],
      packaging: "IBC containers (1000L) or bulk tanker",
      countryOfOrigin: "SA",
    },
    {
      supplierId: sup[1].id, categoryId: catMap["agricultural-chemicals"],
      name: "Urea (Fertilizer Grade)", casNumber: "57-13-6",
      description: "High-purity granular urea for agricultural and industrial applications. 46% nitrogen content. SABIC quality certified.",
      imageUrl: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400",
      images: ["https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800"],
      moq: "20", moqUnit: "MT", basePrice: "350", currency: "USD",
      availability: "in_stock", deliveryLeadTime: "10-14 days",
      collectiveEligible: true, featured: false,
      pricingTiers: [
        { minQuantity: 20, maxQuantity: 99, pricePerUnit: 350, discountPercent: 0 },
        { minQuantity: 100, maxQuantity: 499, pricePerUnit: 320, discountPercent: 9 },
        { minQuantity: 500, maxQuantity: null, pricePerUnit: 295, discountPercent: 16 },
      ],
      technicalSpecs: [
        { property: "Nitrogen Content", value: "46", unit: "%" },
        { property: "Biuret", value: "<1", unit: "%" },
        { property: "Moisture", value: "<0.5", unit: "%" },
      ],
      applications: ["Crop Fertilization", "Animal Feed", "Industrial Synthesis", "Resins"],
      packaging: "50kg bags or bulk",
      countryOfOrigin: "SA",
    },
    {
      supplierId: sup[2].id, categoryId: catMap["polymers-plastics"],
      name: "Polypropylene (PP Homopolymer)", casNumber: "9003-07-0",
      description: "General purpose polypropylene for injection molding and extrusion applications. Excellent rigidity, heat resistance, and chemical resistance.",
      imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400",
      images: ["https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800"],
      moq: "5", moqUnit: "MT", basePrice: "1100", currency: "USD",
      availability: "in_stock", deliveryLeadTime: "14-21 days",
      collectiveEligible: true, featured: true,
      pricingTiers: pricingTiers2,
      technicalSpecs: [
        { property: "Melt Flow Index", value: "12", unit: "g/10min" },
        { property: "Density", value: "0.905", unit: "g/cm³" },
        { property: "Flexural Modulus", value: "1400", unit: "MPa" },
      ],
      applications: ["Packaging", "Automotive Parts", "Consumer Goods", "Pipes"],
      packaging: "25kg bags",
      countryOfOrigin: "AE",
    },
    {
      supplierId: sup[2].id, categoryId: catMap["solvents"],
      name: "Methanol (Industrial Grade)", casNumber: "67-56-1",
      description: "High-purity methanol for industrial use, biodiesel production, formaldehyde manufacturing, and as a solvent. IMPCA and ASTM compliant.",
      imageUrl: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=400",
      images: ["https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800"],
      moq: "10", moqUnit: "MT", basePrice: "520", currency: "USD",
      availability: "in_stock", deliveryLeadTime: "7-14 days",
      collectiveEligible: false, featured: false,
      pricingTiers: [
        { minQuantity: 10, maxQuantity: 49, pricePerUnit: 520, discountPercent: 0 },
        { minQuantity: 50, maxQuantity: null, pricePerUnit: 480, discountPercent: 8 },
      ],
      technicalSpecs: [
        { property: "Purity", value: "99.9", unit: "%" },
        { property: "Density", value: "0.791", unit: "g/mL" },
        { property: "Water Content", value: "<0.1", unit: "%" },
      ],
      applications: ["Biodiesel Production", "Formaldehyde Manufacturing", "Solvent Applications", "Fuel Additive"],
      packaging: "IBC (1000L) or flexi-tank",
      countryOfOrigin: "AE",
    },
    {
      supplierId: sup[0].id, categoryId: catMap["industrial-chemicals"],
      name: "Chlorine (Liquid)", casNumber: "7782-50-5",
      description: "Liquid chlorine for water treatment, PVC manufacturing, and pulp bleaching. Delivered in pressure cylinders or ISO tanks.",
      imageUrl: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400",
      images: [],
      moq: "1", moqUnit: "MT", basePrice: "380", currency: "USD",
      availability: "in_stock", deliveryLeadTime: "5-10 days",
      collectiveEligible: false, featured: false,
      pricingTiers: [
        { minQuantity: 1, maxQuantity: 9, pricePerUnit: 380, discountPercent: 0 },
        { minQuantity: 10, maxQuantity: null, pricePerUnit: 345, discountPercent: 9 },
      ],
      technicalSpecs: [
        { property: "Purity", value: "99.5", unit: "%" },
        { property: "Form", value: "Liquid", unit: "" },
      ],
      applications: ["Water Treatment", "PVC Manufacturing", "Bleaching", "Disinfection"],
      packaging: "Ton cylinders or ISO tanks",
      countryOfOrigin: "SA",
    },
    {
      supplierId: sup[1].id, categoryId: catMap["specialty-chemicals"],
      name: "Titanium Dioxide (TiO₂)", casNumber: "13463-67-7",
      description: "Rutile-grade TiO₂ for paints, coatings, plastics, and paper. High whiteness and opacity, excellent UV resistance.",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
      images: [],
      moq: "1", moqUnit: "MT", basePrice: "2800", currency: "USD",
      availability: "limited", deliveryLeadTime: "21-28 days",
      collectiveEligible: true, featured: true,
      pricingTiers: [
        { minQuantity: 1, maxQuantity: 4, pricePerUnit: 2800, discountPercent: 0 },
        { minQuantity: 5, maxQuantity: 19, pricePerUnit: 2600, discountPercent: 7 },
        { minQuantity: 20, maxQuantity: null, pricePerUnit: 2400, discountPercent: 14 },
      ],
      technicalSpecs: [
        { property: "TiO₂ Content", value: "98.5", unit: "%" },
        { property: "Oil Absorption", value: "22", unit: "g/100g" },
        { property: "Whiteness (L*)", value: "98.5", unit: "" },
      ],
      applications: ["Paints & Coatings", "Plastics Pigmentation", "Paper Coating", "Cosmetics"],
      packaging: "25kg bags",
      countryOfOrigin: "SA",
    },
  ];

  const insertedProducts = await db.insert(productsTable).values(productData as any).returning();
  console.log(`✓ ${insertedProducts.length} products`);

  // ── Collective Orders ─────────────────────────────────────────────────────
  const coData = [
    {
      productId: insertedProducts[0].id,
      supplierId: sup[0].id,
      targetQuantity: "500",
      currentQuantity: "180",
      unit: "MT",
      basePrice: "450",
      currentPrice: "420",
      pricingTiers: [
        { minQuantity: 100, maxQuantity: 299, pricePerUnit: 430, discountPercent: 4 },
        { minQuantity: 300, maxQuantity: 499, pricePerUnit: 415, discountPercent: 8 },
        { minQuantity: 500, maxQuantity: null, pricePerUnit: 385, discountPercent: 14 },
      ],
      status: "open",
      deadline: new Date(Date.now() + 25 * 24 * 3600000),
      deliveryRegion: "GCC",
      moqPerParticipant: "5",
      packagingOptions: ["25kg bags", "1000kg bulk bags"],
    },
    {
      productId: insertedProducts[3].id,
      supplierId: sup[1].id,
      targetQuantity: "2000",
      currentQuantity: "650",
      unit: "MT",
      basePrice: "350",
      currentPrice: "335",
      pricingTiers: [
        { minQuantity: 500, maxQuantity: 999, pricePerUnit: 340, discountPercent: 3 },
        { minQuantity: 1000, maxQuantity: 1999, pricePerUnit: 320, discountPercent: 9 },
        { minQuantity: 2000, maxQuantity: null, pricePerUnit: 295, discountPercent: 16 },
      ],
      status: "open",
      deadline: new Date(Date.now() + 18 * 24 * 3600000),
      deliveryRegion: "Saudi Arabia",
      moqPerParticipant: "20",
      packagingOptions: ["50kg bags", "Bulk"],
    },
    {
      productId: insertedProducts[4].id,
      supplierId: sup[2].id,
      targetQuantity: "100",
      currentQuantity: "45",
      unit: "MT",
      basePrice: "1100",
      currentPrice: "1050",
      pricingTiers: [
        { minQuantity: 20, maxQuantity: 49, pricePerUnit: 1060, discountPercent: 4 },
        { minQuantity: 50, maxQuantity: 99, pricePerUnit: 1020, discountPercent: 7 },
        { minQuantity: 100, maxQuantity: null, pricePerUnit: 970, discountPercent: 12 },
      ],
      status: "open",
      deadline: new Date(Date.now() + 12 * 24 * 3600000),
      deliveryRegion: "UAE",
      moqPerParticipant: "5",
      packagingOptions: ["25kg bags"],
    },
  ];

  const insertedCOs = await db.insert(collectiveOrdersTable).values(coData as any).returning();
  console.log(`✓ ${insertedCOs.length} collective orders`);

  // ── RFQs ─────────────────────────────────────────────────────────────────
  const rfqData = [
    {
      buyerId: userMap["buyer1@example.com"],
      productName: "Sodium Hydroxide",
      casNumber: "1310-73-2",
      quantity: "50",
      unit: "MT",
      deliveryDestination: "Riyadh, Saudi Arabia",
      deliveryDeadline: new Date(Date.now() + 30 * 24 * 3600000),
      description: "Looking for food-grade NaOH for soap manufacturing. Must have REACH certification.",
      specifications: "Purity >= 99%, flakes preferred",
      categoryId: catMap["acids-bases"],
      status: "active",
    },
    {
      buyerId: userMap["buyer2@example.com"],
      productName: "HDPE Resin",
      casNumber: "9002-88-4",
      quantity: "20",
      unit: "MT",
      deliveryDestination: "Dubai, UAE",
      deliveryDeadline: new Date(Date.now() + 21 * 24 * 3600000),
      description: "Need HDPE for pipe manufacturing, grade PE100.",
      specifications: "MFI 0.3, density 0.955 min",
      categoryId: catMap["petrochemicals"],
      status: "active",
    },
  ];

  const insertedRfqs = await db.insert(rfqsTable).values(rfqData as any).returning();
  console.log(`✓ ${insertedRfqs.length} RFQs`);

  // ── Quotations ────────────────────────────────────────────────────────────
  const quotationData = [
    {
      rfqId: insertedRfqs[0].id,
      supplierId: sup[0].id,
      pricePerUnit: "440",
      currency: "USD",
      deliveryTime: "10-14 days",
      validUntil: new Date(Date.now() + 15 * 24 * 3600000),
      notes: "We can supply REACH-certified NaOH. Minimum 25MT per order.",
      status: "pending",
    },
    {
      rfqId: insertedRfqs[0].id,
      supplierId: sup[1].id,
      pricePerUnit: "455",
      currency: "USD",
      deliveryTime: "7-10 days",
      validUntil: new Date(Date.now() + 14 * 24 * 3600000),
      notes: "Stock available immediately. Free delivery to Riyadh for orders above 30MT.",
      status: "pending",
    },
    {
      rfqId: insertedRfqs[1].id,
      supplierId: sup[0].id,
      pricePerUnit: "1260",
      currency: "USD",
      deliveryTime: "14-21 days",
      validUntil: new Date(Date.now() + 10 * 24 * 3600000),
      notes: "HDPE PE100 available. Certificate of analysis provided with each shipment.",
      status: "pending",
    },
  ];

  await db.insert(quotationsTable).values(quotationData as any);
  console.log(`✓ ${quotationData.length} quotations`);

  // ── Collective participants ────────────────────────────────────────────────
  const participantData = [
    { collectiveOrderId: insertedCOs[0].id, buyerId: userMap["buyer1@example.com"], quantity: "30", deliveryDestination: "Riyadh, Saudi Arabia", paymentTerms: "30 days net" },
    { collectiveOrderId: insertedCOs[0].id, buyerId: userMap["buyer2@example.com"], quantity: "20", deliveryDestination: "Dubai, UAE", paymentTerms: "Letter of Credit" },
    { collectiveOrderId: insertedCOs[1].id, buyerId: userMap["buyer1@example.com"], quantity: "100", deliveryDestination: "Riyadh, Saudi Arabia", paymentTerms: "30 days net" },
    { collectiveOrderId: insertedCOs[2].id, buyerId: userMap["buyer2@example.com"], quantity: "15", deliveryDestination: "Dubai, UAE", paymentTerms: "Advance payment" },
  ];

  await db.insert(collectiveOrderParticipantsTable).values(participantData as any);
  console.log(`✓ ${participantData.length} collective order participants`);

  // ── Supplier Shop (Brands, Documents, Experts) ────────────────────────────
  await seedSupplierShop(sup[0].id, "SABIC Distribution");
  await seedSupplierShop(sup[1].id, "National Chemical Co.");
  await seedSupplierShop(sup[2].id, "Emirates Chem & Polymer");
  console.log("✓ supplier shop (brands, documents, experts)");

  console.log("✅ Seed complete!");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
