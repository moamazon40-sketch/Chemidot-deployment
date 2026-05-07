import { db } from "@workspace/db";
import { projectsTable } from "@workspace/db";

const projects = [
  {
    title: "High-Performance Epoxy Coating for Marine Infrastructure",
    slug: "epoxy-coating-marine-infrastructure",
    summary: "Developed a two-component epoxy system that extended the lifespan of offshore platforms by 15 years in the Arabian Gulf's harsh environment.",
    description: `Saudi Aramco required a corrosion-protection solution for its offshore platform structures in the Arabian Gulf, where temperatures exceed 45°C and saltwater exposure is relentless. Traditional coatings failed within 3–5 years, causing costly downtime and maintenance.

Chemidot connected Aramco's procurement team with a European specialty coatings supplier offering a high-solids epoxy system with outstanding chemical and UV resistance. The product was pre-qualified under NACE standards and available with full SDS/TDS documentation within 24 hours via the platform.

After successful laboratory testing and a 6-month pilot on two platform sections, the coating demonstrated zero corrosion penetration at 18 months. Full deployment across 14 structures began in Q2 2024. Projected maintenance cycle extended from 5 years to 20+ years, saving an estimated $12M in lifecycle costs.`,
    heroImageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=600&fit=crop",
    industryTags: ["Oil & Energy", "Paints & Coatings"],
    chemicalsUsed: ["Bisphenol A Epoxy Resin", "Polyamine Hardener", "Zinc Phosphate Primer", "Silane Adhesion Promoter"],
    supplierId: null,
    featured: true,
  },
  {
    title: "Sustainable Biopolymer Packaging for Saudi Food Manufacturers",
    slug: "biopolymer-packaging-food-manufacturers",
    summary: "Replaced petroleum-based packaging films with PLA-based compostable alternatives for a major food conglomerate, reducing plastic waste by 80%.",
    description: `A leading Saudi food and beverage manufacturer was under regulatory and market pressure to reduce single-use plastic packaging. Their procurement team needed a drop-in replacement that matched current barrier properties, seal strength, and food-contact certifications — without a significant capital investment in new equipment.

Through Chemidot's marketplace, the buyer discovered a Taiwanese supplier offering PLA (polylactic acid) blown films with excellent moisture barrier properties suitable for dry food packaging. The Chemidot platform facilitated a sample request within 48 hours and provided the supplier's full regulatory dossier, including EU 10/2011 food contact compliance.

After internal testing validated the film's performance in Saudi Arabia's climate conditions (50°C warehouse storage), a 12-month supply agreement was finalized. The manufacturer converted 80% of its dry goods packaging to the new material, reducing annual plastic use by 340 tonnes and qualifying for Vision 2030 sustainability incentives.`,
    heroImageUrl: "https://images.unsplash.com/photo-1591958911259-bee2173bdccc?w=1200&h=600&fit=crop",
    industryTags: ["Food & Feed", "Packaging Materials"],
    chemicalsUsed: ["Polylactic Acid (PLA)", "Nucleating Agents", "Plasticizers", "Anti-blocking Agents"],
    supplierId: null,
    featured: true,
  },
  {
    title: "Pharmaceutical-Grade Excipients for Local Drug Manufacturing",
    slug: "pharma-excipients-local-drug-manufacturing",
    summary: "Secured a reliable supply chain for microcrystalline cellulose and other critical excipients, reducing import dependency for a Riyadh pharmaceutical plant.",
    description: `A Riyadh-based generic pharmaceutical manufacturer was sourcing excipients from European distributors with 10–14 week lead times. Supply disruptions during the pandemic exposed the risk of single-source dependency. The procurement director needed to qualify at least one regional supplier for 8 critical excipients.

Chemidot's supplier discovery tool surfaced four verified regional distributors with appropriate GMP certifications and existing SFDA (Saudi Food and Drug Authority) approvals. The platform's document vault enabled the buyer to request and receive certificates of analysis (CoA), DMFs, and batch records electronically.

Within 6 weeks, the manufacturer qualified two regional suppliers for microcrystalline cellulose (MCC), croscarmellose sodium, magnesium stearate, and lactose monohydrate. Lead times dropped from 10 weeks to 3 weeks, and unit cost savings of 8–12% were achieved through the platform's collective buying mechanism.`,
    heroImageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&h=600&fit=crop",
    industryTags: ["Pharma & Life Science"],
    chemicalsUsed: ["Microcrystalline Cellulose (MCC)", "Croscarmellose Sodium", "Magnesium Stearate", "Lactose Monohydrate", "Povidone (PVP K30)"],
    supplierId: null,
    featured: true,
  },
  {
    title: "Water Treatment Chemicals for NEOM's Desalination Facilities",
    slug: "water-treatment-neom-desalination",
    summary: "Supplied antiscalant and biocide programs for NEOM's pilot reverse osmosis facility, achieving 98.5% recovery rates in the Red Sea environment.",
    description: `NEOM's infrastructure team needed a comprehensive water treatment chemical program for a 50,000 m³/day reverse osmosis desalination pilot. The Red Sea's high-salinity, warm-water conditions create aggressive scaling and biofouling challenges that conventional programs couldn't address.

Using Chemidot's RFQ platform, NEOM's procurement team issued specifications to 12 verified water treatment chemical suppliers simultaneously. Within 72 hours, 6 detailed proposals were received, including dosing calculations, trial protocols, and regional technical support commitments.

The selected antiscalant program — a phosphonate-polyacrylate blend — reduced scaling index by 94% compared to the baseline. The selected biocide (DBNPA-based) achieved 99.8% biological control without forming trihalomethane byproducts. The facility achieved 98.5% water recovery, exceeding the 95% target, and the chemical supply chain was locked in via a 3-year frame agreement.`,
    heroImageUrl: "https://images.unsplash.com/photo-1606206591513-adbfbdd4935b?w=1200&h=600&fit=crop",
    industryTags: ["Water Treatment"],
    chemicalsUsed: ["Antiscalant (Phosphonate-Polyacrylate)", "DBNPA Biocide", "Sodium Bisulfite", "Ferric Sulfate Coagulant", "Hydrochloric Acid (cleaning)"],
    supplierId: null,
    featured: true,
  },
  {
    title: "Automotive Refinish Coatings for Saudi Bodyshop Chain",
    slug: "automotive-refinish-coatings-bodyshop",
    summary: "Equipped a 47-location Saudi bodyshop network with a consistent waterborne basecoat system, reducing VOC emissions by 65% across all locations.",
    description: `Al-Futtaim Automotive Services (Saudi operations) was running 47 bodyshop locations using 6 different coating systems from 4 suppliers. Inconsistent color matching, unpredictable delivery, and varying quality were causing customer complaints and warranty claims.

Through Chemidot, the group procurement team issued a single multi-location RFQ for a standardized waterborne basecoat and clearcoat system. The platform aggregated their combined annual volume (approx. 85,000 liters), qualifying them for Tier-2 pricing that wasn't available to individual locations.

A German automotive coating OEM supplier won the contract with a waterborne 2K basecoat achieving Delta-E ≤0.5 color match across 7,000+ OEM colors. Delivery infrastructure was established via a regional distribution center in Jeddah, with 48-hour replenishment to all locations. VOC emissions dropped 65% and customer color-match satisfaction scores increased from 72% to 94%.`,
    heroImageUrl: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=1200&h=600&fit=crop",
    industryTags: ["Automotive & Transportation", "Paints & Coatings"],
    chemicalsUsed: ["Waterborne Polyurethane Basecoat", "2K Clearcoat (Isocyanate-Acrylic)", "Primer Surfacer", "Adhesion Promoter"],
    supplierId: null,
    featured: false,
  },
  {
    title: "Green Construction Chemicals for Riyadh Metro Infrastructure",
    slug: "green-construction-chemicals-riyadh-metro",
    summary: "Supplied low-VOC concrete admixtures and waterproofing membranes for 6 underground stations, meeting LEED Gold certification requirements.",
    description: `The Riyadh Metro project required construction chemicals meeting LEED Gold standards for its 6 underground stations. The main contractor needed to source concrete admixtures (superplasticizers, retarders, accelerators) and below-grade waterproofing systems that could document low embodied carbon and comply with LEED MR credits.

Chemidot's platform streamlined the supplier qualification process by filtering the catalog for suppliers with Environmental Product Declarations (EPDs) and ISO 14001 certifications. The platform's document request system allowed the project's QA team to collect technical submittals from 8 suppliers simultaneously.

A polycarboxylate ether (PCE) superplasticizer with 25% lower water demand than conventional systems was selected, alongside a crystalline waterproofing admixture eliminating the need for sheet membranes in critical sections. Total chemical cost savings of 18% were achieved vs. the original budget, and all 6 stations achieved LEED Gold certification with chemical contributions well-documented in the platform's audit trail.`,
    heroImageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&h=600&fit=crop",
    industryTags: ["Construction"],
    chemicalsUsed: ["PCE Superplasticizer", "Crystalline Waterproofing Admixture", "Retarding Admixture", "Alkali-Silica Reaction (ASR) Inhibitor"],
    supplierId: null,
    featured: false,
  },
  {
    title: "Specialty Adhesives for Saudi Electronics Assembly Park",
    slug: "specialty-adhesives-electronics-assembly",
    summary: "Qualified UV-cure and thermally conductive adhesives for a new electronics assembly park in Riyadh, cutting assembly cycle time by 40%.",
    description: `A new electronics assembly park established as part of Vision 2030's technology manufacturing initiative needed to source specialty adhesives for PCB assembly, thermal management, and housing encapsulation. The procurement team, unfamiliar with specialty adhesive suppliers, needed both technical guidance and rapid qualification.

Chemidot's expert matching feature connected the procurement manager with two adhesive technology experts who provided a shortlist of 5 globally qualified suppliers available in the region. The platform's sampling workflow enabled physical evaluation of 23 candidate products within 3 weeks.

The selected UV-cure epoxy adhesive achieved 98% first-pass bond rate on aluminium-PCB interfaces, reducing rework from 12% to 0.8%. The thermally conductive paste (4.5 W/m·K) met all IPC-7711/7721 standards. Assembly cycle time dropped 40% compared to heat-cure alternatives, enabling the facility to achieve its rated capacity within 8 months of opening.`,
    heroImageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=600&fit=crop",
    industryTags: ["Electrical & Electronics", "Adhesives & Sealants"],
    chemicalsUsed: ["UV-Cure Epoxy Adhesive", "Thermally Conductive Silicone Paste", "Anaerobic Retaining Compound", "Conformal Coating (Acrylic)"],
    supplierId: null,
    featured: false,
  },
  {
    title: "Agrochemical Inputs for Saudi Vertical Farming Operations",
    slug: "agrochemical-inputs-vertical-farming",
    summary: "Optimized nutrient solution chemistry for an indoor vertical farm producing leafy greens year-round in Qassim, reducing water use by 95%.",
    description: `Pure Harvest Smart Farms (Qassim facility) was scaling its indoor vertical farming operations for leafy greens and was struggling to source consistent-quality hydroponic-grade nutrient salts at viable economics. Imported products from Europe had high freight costs and 8-week lead times.

Chemidot's platform identified three regional suppliers of food-grade ammonium nitrate, potassium nitrate, calcium nitrate, and micronutrient chelates meeting hydroponic application standards. A collective order with two other vertical farming operators in the region was structured through the platform, achieving a 22% cost reduction vs. individual import pricing.

The nutrient formulations were validated by an agrochemist specialist via Chemidot's expert network, and custom dosing protocols were developed for the facility's specific LED spectrum and crop varieties. Water-use efficiency reached 95% vs. conventional agriculture, and yield consistency improved with the stabilized nutrient supply chain.`,
    heroImageUrl: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=1200&h=600&fit=crop",
    industryTags: ["Agriculture", "Food & Feed"],
    chemicalsUsed: ["Potassium Nitrate", "Calcium Nitrate", "Monopotassium Phosphate (MKP)", "Iron EDTA Chelate", "Micronutrient Mix"],
    supplierId: null,
    featured: true,
  },
];

async function seed() {
  console.log("Seeding projects...");
  for (const p of projects) {
    await db.insert(projectsTable).values(p).onConflictDoNothing();
  }
  console.log(`Seeded ${projects.length} projects.`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
