import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { userCanSell } from "@/lib/account-capabilities";
import { useListProducts, useDeleteProduct, useCreateProduct, useListCategories, useUpdateProduct } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Package, MoreVertical, Edit, Trash2, Upload, Download, ArrowLeft, Boxes } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

const APPERANCE_OPTIONS = ["Solid", "Liquid", "Powder", "Granules", "Paste", "Gas", "Flakes", "Pellets", "Crystals"];
const COLOR_OPTIONS = ["Clear / Colorless", "White", "Yellow", "Brown", "Black", "Blue", "Red", "Green", "Orange", "Pink", "Gray", "Amber"];
const INCOTERM_OPTIONS = ["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF"];
const INDUSTRY_OPTIONS = [
  "Additive Manufacturing", "Adhesives & Sealants", "Aerospace", "Agriculture", "Automotive & Transportation",
  "Biotechnology", "Ceramics & Glass", "Chemical Manufacturing", "Cleaning Products", "Construction",
  "Consumer Goods", "Cosmetics & Personal Care", "Electrical & Electronics", "Equipment Manufacturing",
  "Food & Feed", "Lab Materials", "Leather & Textiles", "Lubricants", "Metalworking",
  "Oil & Energy", "Packaging Materials", "Paints & Coatings", "Pharma & Life Science",
  "Plastics", "Pulp & Paper", "Recycling & Waste", "Research Chemicals", "Rubber", "Water Treatment",
];
const PACKAGING_OPTIONS = ["Drum", "IBC", "Bag", "Bottle", "Pail", "Tanker", "Flexibag", "Big Bag", "Can", "Carboy", "Pallet"];
const UNIT_OPTIONS = ["kg", "L", "MT", "g", "mL", "T", "lb", "oz", "drum", "IBC"];
const SUBSTANCE_OPTIONS = ["Organic", "Inorganic", "Polymer", "Surfactant", "Solvent", "Acid", "Base", "Salt", "Ester", "Amine", "Ether", "Ketone", "Aldehyde", "Aromatic"];
const WAREHOUSE_OPTIONS = ["Riyadh", "Jeddah", "Dammam", "Dubai", "Abu Dhabi", "Kuwait City", "Doha", "Muscat", "Riyadh Central Warehouse", "Jeddah Free Zone", "Dammam Storage", "Dubai Hub"];
const COUNTRY_MULTI_OPTIONS = ["Saudi Arabia", "UAE", "Kuwait", "Qatar", "Bahrain", "Oman", "Egypt", "Jordan", "Iraq", "Turkey", "India", "China", "Germany", "United States"];
const DOCUMENTS = ["Safety Data Sheet (SDS)", "Technical Data Sheet (TDS)", "Certificate of Analysis (COA)"];

const TEMPLATE_HEADERS = [
  "Name", "Description", "Minimum Purity", "Minimum Quantity", "Maximum Quantity", "Appearance",
  "Categories", "Deliver Countries", "Incoterms", "Industries", "Packaging", "Units",
  "Substances", "Warehouses",
];

interface ProductFormData {
  name: string;
  description: string;
  minimumPurity: string;
  minimumQuantity: string;
  maximumQuantity: string;
  appearance: string;
  categoryIds: string[];
  colors: string;
  incoterms: string[];
  industries: string;
  packaging: string;
  units: string;
  substances: string;
  warehouses: string;
  deliveryLeadTime: string;
  countryOfOrigin: string;
  basePrice: string;
  availability: "in_stock" | "limited" | "out_of_stock";
  technicalSpecsRaw: string;
}

const defaultForm: ProductFormData = {
  name: "",
  description: "",
  minimumPurity: "",
  minimumQuantity: "",
  maximumQuantity: "",
  appearance: "",
  categoryIds: [],
  colors: "",
  incoterms: [],
  industries: "",
  packaging: "",
  units: "",
  substances: "",
  warehouses: "",
  deliveryLeadTime: "2-4 weeks",
  countryOfOrigin: "Saudi Arabia",
  basePrice: "",
  availability: "in_stock",
  technicalSpecsRaw: "",
};

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="space-y-1 pb-3">
        <div className="font-semibold">{title}</div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function OptionGrid({
  options,
  selected,
  onChange,
  maxHeight = "max-h-44",
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  maxHeight?: string;
}) {
  return (
    <div className={`grid grid-cols-2 gap-2 overflow-y-auto rounded-md border bg-background p-3 sm:grid-cols-3 ${maxHeight}`}>
      {options.map((option) => (
        <label key={option} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-muted">
          <input
            type="checkbox"
            className="accent-primary"
            checked={selected.includes(option)}
            onChange={(e) => onChange(e.target.checked ? [...selected, option] : selected.filter((value) => value !== option))}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function ProductFormDialog({
  open,
  onClose,
  onSaved,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: any;
}) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: categories = [] } = useListCategories();
  const { toast } = useToast();
  const docInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["Saudi Arabia"]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  const [bulkRows, setBulkRows] = useState<Record<string, string>[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [dragOver, setDragOver] = useState(false);

  const getInitialForm = useCallback((): ProductFormData => {
    if (!initial) return defaultForm;

    const specs = Array.isArray(initial.technicalSpecs) ? initial.technicalSpecs : [];
    const applications = Array.isArray(initial.applications) ? initial.applications : [];
    const incoterms = Array.from(new Set([
      ...specs.filter((spec: any) => spec.name === "Incoterm").map((spec: any) => String(spec.value)),
      ...applications.filter((value: string) => value.startsWith("Incoterm:")).map((value: string) => value.replace("Incoterm:", "")),
    ])).filter(Boolean);
    const additionalCategoryNames = [
      ...specs.filter((spec: any) => spec.name === "Additional Category").map((spec: any) => String(spec.value)),
      ...applications.filter((value: string) => value.startsWith("Category:")).map((value: string) => value.replace("Category:", "")),
    ];
    const categoryIds = [
      ...(initial.categoryId ? [String(initial.categoryId)] : []),
      ...categories
        .filter((category) => additionalCategoryNames.includes(category.name))
        .map((category) => String(category.id)),
    ];

    return {
      name: initial.name ?? "",
      description: initial.description ?? "",
      minimumPurity: "",
      minimumQuantity: String(initial.moq ?? ""),
      maximumQuantity: "",
      appearance: "",
      categoryIds: Array.from(new Set(categoryIds)),
      colors: "",
      incoterms,
      industries: "",
      packaging: initial.packaging ?? "",
      units: initial.moqUnit ?? "",
      substances: initial.casNumber ?? "",
      warehouses: "",
      deliveryLeadTime: initial.deliveryLeadTime ?? "2-4 weeks",
      countryOfOrigin: initial.countryOfOrigin ?? "Saudi Arabia",
      basePrice: initial.basePrice !== null && initial.basePrice !== undefined ? String(initial.basePrice) : "",
      availability: initial.availability ?? "in_stock",
      technicalSpecsRaw: specs
        .filter((spec: any) => spec.name !== "Incoterm" && spec.name !== "Additional Category")
        .map((spec: any) => `${spec.name ?? ""}:${spec.value ?? ""}:${spec.unit ?? ""}`)
        .join("\n"),
    };
  }, [initial, categories]);

  const [form, setForm] = useState<ProductFormData>(getInitialForm);

  useEffect(() => {
    const nextForm = getInitialForm();
    const applications = Array.isArray(initial?.applications) ? initial.applications : [];
    setForm(nextForm);
    setSelectedIndustries(applications.filter((value: string) => !value.startsWith("Incoterm:") && !value.startsWith("Category:")));
    setSelectedCountries(initial?.countryOfOrigin ? [initial.countryOfOrigin] : ["Saudi Arabia"]);
    setSelectedWarehouses([]);
    setDocFiles({});
  }, [getInitialForm, open, initial]);

  const f = (key: keyof ProductFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleDocSelect = (docName: string, file: File | null) => {
    setDocFiles((prev) => ({ ...prev, [docName]: file ?? null }));
  };

  const parseBulkFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
        setBulkRows(json.slice(0, 5));
        setBulkFileName(file.name);
        toast({ title: "File loaded", description: `${file.name} - ${json.length} row(s) found.` });
      } catch {
        toast({ title: "Could not parse file", description: "Please upload a valid .csv or .xlsx file.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [toast]);

  const handleBulkDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseBulkFile(file);
  }, [parseBulkFile]);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "chemidot_product_template.xlsx");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const primaryCategoryId = parseInt(form.categoryIds[0] ?? "", 10);
    if (!Number.isFinite(primaryCategoryId)) {
      toast({ title: "Please select at least one category", variant: "destructive" });
      return;
    }

    const selectedCategoryNames = categories
      .filter((category) => form.categoryIds.includes(String(category.id)))
      .map((category) => category.name);

    const technicalSpecs = form.technicalSpecsRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name = "", value = "", unit = ""] = line.split(":").map((part) => part.trim());
        return { name, value, unit };
      })
      .filter((spec) => spec.name && spec.value);

    const enrichedTechnicalSpecs = [
      ...technicalSpecs,
      ...(form.minimumPurity ? [{ name: "Purity", value: form.minimumPurity, unit: "%" }] : []),
      ...(form.appearance ? [{ name: "Appearance", value: form.appearance, unit: "" }] : []),
      ...(form.colors ? [{ name: "Color", value: form.colors, unit: "" }] : []),
      ...(form.maximumQuantity ? [{ name: "Maximum Quantity", value: form.maximumQuantity, unit: form.units }] : []),
      ...form.incoterms.map((term) => ({ name: "Incoterm", value: term, unit: "" })),
      ...selectedCategoryNames.slice(1).map((categoryName) => ({ name: "Additional Category", value: categoryName, unit: "" })),
    ];

    const payload = {
      name: form.name,
      description: form.description,
      casNumber: form.substances || undefined,
      categoryId: primaryCategoryId,
      moq: parseFloat(form.minimumQuantity || "1"),
      moqUnit: form.units || "kg",
      basePrice: form.basePrice ? parseFloat(form.basePrice) : undefined,
      currency: "USD",
      availability: form.availability,
      deliveryLeadTime: form.deliveryLeadTime,
      collectiveEligible: false,
      countryOfOrigin: form.countryOfOrigin,
      packaging: form.packaging || undefined,
      pricingTiers: [],
      images: [],
      applications: [
        ...selectedIndustries,
        ...form.incoterms.map((term) => `Incoterm:${term}`),
        ...selectedCategoryNames.slice(1).map((categoryName) => `Category:${categoryName}`),
      ],
      technicalSpecs: enrichedTechnicalSpecs,
    };

    const handlers = {
      onSuccess: () => {
        toast({ title: initial?.id ? "Product updated successfully" : "Product created successfully" });
        onSaved();
        onClose();
      },
      onError: (error: any) => toast({
        title: "Failed to save product",
        description: error?.response?.data?.message ?? "Please check the required product fields.",
        variant: "destructive",
      }),
    };

    if (initial?.id) {
      updateProduct.mutate({ id: initial.id, data: payload }, handlers);
      return;
    }

    createProduct.mutate({ data: payload }, handlers);
  };

  const selectedCategoryNames = categories
    .filter((category) => form.categoryIds.includes(String(category.id)))
    .map((category) => category.name);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="gap-2 px-0">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <span className="text-xs uppercase tracking-wider">Supplier catalog</span>
        </div>

        <Tabs defaultValue="manual" className="pt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <form onSubmit={handleSubmit} className="space-y-5">
              <SectionCard title="Basic Information" description="Start with the buyer-facing product basics. Keep the description short and specific.">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Product name *</Label>
                    <Input value={form.name} onChange={f("name")} placeholder="e.g. Sodium Hydroxide 99%" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Substance type <span className="text-muted-foreground">(optional)</span></Label>
                    <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.substances} onChange={f("substances")}>
                      <option value="">Select substance</option>
                      {SUBSTANCE_OPTIONS.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Short description *</Label>
                  <Textarea rows={3} value={form.description} onChange={f("description")} placeholder="Describe the product, grade, and main buyer use in 1-2 sentences." required />
                </div>
                <div className="space-y-1.5">
                  <Label>Category *</Label>
                  <OptionGrid
                    options={categories.map((category) => category.name)}
                    selected={selectedCategoryNames}
                    onChange={(nextNames) => setForm((prev) => ({
                      ...prev,
                      categoryIds: categories.filter((category) => nextNames.includes(category.name)).map((category) => String(category.id)),
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">First selected category is used as the primary category.</p>
                </div>
              </SectionCard>

              <SectionCard title="Product Specifications" description="Add the core technical identity. Optional values can stay empty if buyers should request them.">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Purity <span className="text-muted-foreground">(optional)</span></Label>
                    <Input type="number" min="0" max="100" value={form.minimumPurity} onChange={f("minimumPurity")} placeholder="99.5" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Appearance <span className="text-muted-foreground">(optional)</span></Label>
                    <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.appearance} onChange={f("appearance")}>
                      <option value="">Select appearance</option>
                      {APPERANCE_OPTIONS.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Color <span className="text-muted-foreground">(optional)</span></Label>
                    <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.colors} onChange={f("colors")}>
                      <option value="">Select color</option>
                      {COLOR_OPTIONS.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Additional technical specs <span className="text-muted-foreground">(optional)</span></Label>
                  <Textarea
                    rows={4}
                    value={form.technicalSpecsRaw}
                    onChange={f("technicalSpecsRaw")}
                    placeholder={"Format: Property:Value:Unit\nExample: Chemical Name:Sodium Hydroxide:\nExample: Formula:NaOH:\nExample: Density:1.02:g/cm3"}
                  />
                </div>
              </SectionCard>

              <SectionCard title="Commercial Terms" description="Help buyers understand quantity, delivery, packaging, and quote expectations.">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Minimum quantity *</Label>
                    <Input type="number" min="0" value={form.minimumQuantity} onChange={f("minimumQuantity")} placeholder="1000" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Maximum quantity <span className="text-muted-foreground">(optional)</span></Label>
                    <Input type="number" min="0" value={form.maximumQuantity} onChange={f("maximumQuantity")} placeholder="50000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit *</Label>
                    <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.units} onChange={f("units")} required>
                      <option value="">Select unit</option>
                      {UNIT_OPTIONS.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Packaging</Label>
                    <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.packaging} onChange={f("packaging")}>
                      <option value="">Select packaging</option>
                      {PACKAGING_OPTIONS.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Lead time</Label>
                    <Input value={form.deliveryLeadTime} onChange={f("deliveryLeadTime")} placeholder="2-4 weeks" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Estimated price <span className="text-muted-foreground">(optional)</span></Label>
                    <Input type="number" min="0" step="0.01" value={form.basePrice} onChange={f("basePrice")} placeholder="USD" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Country of origin</Label>
                    <Input value={form.countryOfOrigin} onChange={f("countryOfOrigin")} placeholder="Saudi Arabia" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Availability</Label>
                    <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.availability} onChange={f("availability")}>
                      <option value="in_stock">In Stock</option>
                      <option value="limited">Limited</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Incoterms</Label>
                  <OptionGrid options={INCOTERM_OPTIONS} selected={form.incoterms} onChange={(next) => setForm((prev) => ({ ...prev, incoterms: next }))} maxHeight="max-h-32" />
                </div>
                <div className="space-y-1.5">
                  <Label>Regional availability</Label>
                  <OptionGrid options={COUNTRY_MULTI_OPTIONS} selected={selectedCountries} onChange={setSelectedCountries} maxHeight="max-h-36" />
                </div>
              </SectionCard>

              <SectionCard title="Applications & Industries" description="Choose the buyer markets where this product should appear.">
                <div className="space-y-1.5">
                  <Label>Industries</Label>
                  <OptionGrid options={INDUSTRY_OPTIONS} selected={selectedIndustries} onChange={setSelectedIndustries} />
                </div>
                <div className="space-y-1.5">
                  <Label>Warehouses <span className="text-muted-foreground">(optional)</span></Label>
                  <OptionGrid options={WAREHOUSE_OPTIONS} selected={selectedWarehouses} onChange={setSelectedWarehouses} maxHeight="max-h-36" />
                </div>
              </SectionCard>

              <SectionCard title="Documents" description="Documents help buyers trust your product and request quotes faster. Uploads are optional.">
                <div className="grid gap-3 md:grid-cols-3">
                  {DOCUMENTS.map((doc) => (
                    <div key={doc}>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                        className="hidden"
                        ref={(el) => { docInputRefs.current[doc] = el; }}
                        onChange={(e) => handleDocSelect(doc, e.target.files?.[0] ?? null)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className={`h-auto min-h-16 w-full justify-start gap-2 whitespace-normal text-left ${docFiles[doc] ? "border-primary/50 bg-primary/5" : ""}`}
                        onClick={() => docInputRefs.current[doc]?.click()}
                      >
                        <Upload className="h-4 w-4 shrink-0" />
                        {docFiles[doc] ? (
                          <span className="min-w-0">
                            <span className="block truncate">{docFiles[doc]!.name}</span>
                            <span className="text-xs text-muted-foreground">{(docFiles[doc]!.size / 1024).toFixed(0)} KB</span>
                          </span>
                        ) : (
                          <span>{doc}</span>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Review & Submit" description="Quick check before this product is saved to your catalog.">
                <div className="grid gap-3 rounded-lg bg-muted/30 p-4 text-sm md:grid-cols-3">
                  <div><span className="text-muted-foreground">Product</span><div className="font-medium">{form.name || "Not entered"}</div></div>
                  <div><span className="text-muted-foreground">Category</span><div className="font-medium">{selectedCategoryNames[0] ?? "Not selected"}</div></div>
                  <div><span className="text-muted-foreground">Purity</span><div className="font-medium">{form.minimumPurity ? `${form.minimumPurity}%` : "Optional"}</div></div>
                  <div><span className="text-muted-foreground">MOQ</span><div className="font-medium">{form.minimumQuantity || "Not entered"} {form.units}</div></div>
                  <div><span className="text-muted-foreground">Incoterms</span><div className="font-medium">{form.incoterms.length ? form.incoterms.join(", ") : "Available on request"}</div></div>
                  <div><span className="text-muted-foreground">Documents</span><div className="font-medium">{Object.values(docFiles).filter(Boolean).length || 0} uploaded</div></div>
                </div>
              </SectionCard>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                  {(createProduct.isPending || updateProduct.isPending) ? "Saving..." : initial?.id ? "Save Changes" : "Submit Product"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  ref={bulkInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) parseBulkFile(file);
                    e.target.value = "";
                  }}
                />
                <div
                  className={`rounded-xl border border-dashed p-10 text-center space-y-3 transition-colors ${dragOver ? "border-primary bg-primary/5" : "bg-muted/20"}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleBulkDrop}
                >
                  <Boxes className="w-10 h-10 mx-auto text-primary" />
                  {bulkFileName ? (
                    <>
                      <p className="font-semibold text-primary">{bulkFileName}</p>
                      <p className="text-sm text-muted-foreground">{bulkRows.length} row(s) loaded - preview below.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">Drag and drop CSV / Excel files here</p>
                      <p className="text-sm text-muted-foreground">Upload product data in bulk and preview the first 5 rows before import.</p>
                    </>
                  )}
                  <div className="flex justify-center gap-2 pt-2">
                    <Button type="button" variant="outline" className="gap-2" onClick={downloadTemplate}><Download className="w-4 h-4" /> Download Template</Button>
                    <Button type="button" className="gap-2" onClick={() => bulkInputRef.current?.click()}><Upload className="w-4 h-4" /> {bulkFileName ? "Replace File" : "Upload File"}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">Preview (first 5 rows)</CardHeader>
              <CardContent>
                <div className="overflow-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>{(bulkRows.length > 0 ? Object.keys(bulkRows[0]) : TEMPLATE_HEADERS).map((h) => <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {bulkRows.length > 0 ? bulkRows.map((row, i) => (
                        <tr key={i} className="border-t">
                          {Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 whitespace-nowrap">{String(v) || "-"}</td>)}
                        </tr>
                      )) : [1, 2, 3, 4, 5].map((r) => (
                        <tr key={r} className="border-t">
                          {TEMPLATE_HEADERS.map((h) => <td key={h} className="px-3 py-2 text-muted-foreground">-</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                type="button"
                disabled={!bulkFileName}
                onClick={() => {
                  toast({ title: "Import started", description: `Importing ${bulkRows.length} product(s) from ${bulkFileName}.` });
                  onClose();
                }}
              >
                {bulkFileName ? `Import ${bulkRows.length} Product(s)` : "Upload first"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function SupplierProducts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [supplierProfile, setSupplierProfile] = useState<any>(null);
  const [loadingSupplierId, setLoadingSupplierId] = useState(false);

  useEffect(() => {
    if (!userCanSell(user)) return;
    let cancelled = false;

    const loadSupplierProfile = async () => {
      setLoadingSupplierId(true);
      try {
        const res = await fetch("/api/suppliers/profile", {
          headers: { Authorization: `Bearer ${localStorage.getItem("chemidot_token") ?? ""}` },
        });
        if (!res.ok) throw new Error("Failed to load supplier profile");
        const profile = await res.json();
        if (!cancelled) {
          setSupplierId(profile.id ?? null);
          setSupplierProfile(profile);
        }
      } catch {
        if (!cancelled) {
          setSupplierId(null);
          setSupplierProfile(null);
          toast({ title: "Could not load supplier catalog", variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoadingSupplierId(false);
      }
    };

    void loadSupplierProfile();
    return () => {
      cancelled = true;
    };
  }, [toast, user]);

  const { data, isLoading, refetch } = useListProducts(
    supplierId ? { supplierId, limit: 50 } : undefined,
    { query: { enabled: !!supplierId } as any },
  );
  const deleteMutation = useDeleteProduct();
  const isSuspended = supplierProfile?.subscriptionStatus === "suspended" || supplierProfile?.subscriptionStatus === "cancelled";
  const productLimit = supplierProfile?.productLimit ?? null;
  const currentProductCount = (data?.products ?? []).length;
  const hasReachedLimit = typeof productLimit === "number" ? currentProductCount >= productLimit : false;

  const openCreateDialog = () => {
    if (isSuspended) {
      toast({
        title: "Account suspended",
        description: "Your supplier account is currently suspended. Please contact Chemidot support to reactivate your storefront.",
        variant: "destructive",
      });
      return;
    }
    if (hasReachedLimit) {
      toast({
        title: "Product limit reached",
        description: "You have reached your current plan limit. Please upgrade to publish more products.",
        variant: "destructive",
      });
      return;
    }
    setEditingProduct(null);
    setFormOpen(true);
  };

  const handleEdit = async (product: any) => {
    setFormOpen(true);
    setEditingProduct(product);
    try {
      const res = await fetch(`/api/products/${product.id}`);
      if (!res.ok) throw new Error("Could not load product details");
      const detail = await res.json();
      setEditingProduct({ ...product, ...detail });
    } catch {
      toast({ title: "Loaded basic product details", description: "Some advanced fields may need to be re-entered.", variant: "destructive" });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "Product deleted" }); refetch(); },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  };

  const availBadge = (availability: string) => {
    switch (availability) {
      case "in_stock": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none dark:bg-green-900/30 dark:text-green-400">In Stock</Badge>;
      case "limited": return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-none dark:bg-yellow-900/30 dark:text-yellow-400">Limited</Badge>;
      case "out_of_stock": return <Badge variant="secondary" className="text-muted-foreground">Out of Stock</Badge>;
      default: return <Badge variant="outline">{availability}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {isSuspended && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">
              Your supplier account is currently suspended. Please contact Chemidot support to reactivate your storefront.
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold capitalize">
                Plan: {supplierProfile?.supplierPlan ?? "trial"} | Status: {supplierProfile?.subscriptionStatus ?? "trial"}
              </div>
              <div className="text-muted-foreground">
                Products: {currentProductCount}{typeof productLimit === "number" ? ` / ${productLimit}` : " / Unlimited"}
                {supplierProfile?.trialEndsAt ? ` | Trial ends ${new Date(supplierProfile.trialEndsAt).toLocaleDateString()}` : ""}
              </div>
            </div>
            {hasReachedLimit && (
              <div className="font-medium text-amber-700">
                You have reached your plan limit. Upgrade to publish more products.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Products</h1>
            <p className="text-muted-foreground">Manage your product catalog on the marketplace.</p>
          </div>
          <Button className="shrink-0 gap-2" onClick={openCreateDialog} disabled={isSuspended || hasReachedLimit}>
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading || loadingSupplierId ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : (data?.products ?? []).length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <Package className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No products yet</h3>
                <p className="text-muted-foreground mt-1 mb-6">Add your first product to appear on the marketplace.</p>
                <Button onClick={openCreateDialog} disabled={isSuspended || hasReachedLimit}>
                  <Plus className="w-4 h-4 mr-2" /> Add First Product
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {(data?.products ?? []).map((product) => (
                  <div key={product.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{product.name}</span>
                        {availBadge(product.availability)}
                        {product.collectiveEligible && (
                          <Badge variant="outline" className="text-primary border-primary/30 text-xs">Collective</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
                        {product.casNumber && <span className="font-mono text-xs">{product.casNumber}</span>}
                        <span>MOQ: {product.moq} {product.moqUnit}</span>
                        {product.basePrice && <span>Price: {product.currency} {product.basePrice.toLocaleString()}</span>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { void handleEdit(product); }}>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ProductFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingProduct(null); }}
        onSaved={refetch}
        initial={editingProduct}
      />
    </DashboardLayout>
  );
}
