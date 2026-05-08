import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { useListProducts, useDeleteProduct, useCreateProduct, useListCategories, useUpdateProduct } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Package, MoreVertical, Edit, Trash2, Upload, FileText, Download, ArrowLeft, Boxes, ClipboardList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";

const APPERANCE_OPTIONS = ["Solid", "Liquid", "Powder", "Granules", "Paste", "Gas", "Flakes", "Pellets", "Crystals"];
const CATEGORY_OPTIONS = ["Industrial Chemicals", "Construction Chemicals", "Solvents", "Polymers", "Fine Chemicals", "Additives", "Surfactants", "Agrochemicals", "Specialty Chemicals", "Pharmaceuticals"];
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
const DOCUMENTS = ["Safety Data Sheet", "Technical Data Sheet", "Additional Document"];

const TEMPLATE_HEADERS = [
  "Name", "Description", "Minimum Purity", "Minimum Quantity", "Maximum Quantity", "Appearance",
  "Categories", "Deliver Countries", "Incoterms", "Industries", "Packaging", "Units",
  "Substances", "Warehouses",
];

const COUNTRY_MULTI_OPTIONS = ["Saudi Arabia", "UAE", "Kuwait", "Qatar", "Bahrain", "Oman", "Egypt", "Jordan", "Iraq", "Turkey", "India", "China", "Germany", "United States"];

interface ProductFormData {
  name: string; description: string; minimumPurity: string; minimumQuantity: string; maximumQuantity: string;
  appearance: string; categoryIds: string[]; colors: string; deliverCountries: string; incoterms: string[];
  industries: string; packaging: string; units: string; substances: string; warehouses: string;
  deliveryLeadTime: string; countryOfOrigin: string; basePrice: string; availability: "in_stock" | "limited" | "out_of_stock";
  technicalSpecsRaw: string;
}

const defaultForm: ProductFormData = {
  name: "", description: "", minimumPurity: "", minimumQuantity: "", maximumQuantity: "",
  appearance: "", categoryIds: [], colors: "", deliverCountries: "", incoterms: [],
  industries: "", packaging: "", units: "", substances: "", warehouses: "",
  deliveryLeadTime: "2-4 weeks", countryOfOrigin: "Saudi Arabia", basePrice: "", availability: "in_stock",
  technicalSpecsRaw: "",
};

const PRODUCT_TEMPLATES = [
  "Solvent / Diluent",
  "Resin / Binder",
  "Additive / Modifier",
  "Surfactant / Wetting Agent",
  "Industrial Intermediate",
  "Specialty Chemical",
];

function ProductFormDialog({
  open, onClose, onSaved, initial,
}: {
  open: boolean; onClose: () => void; onSaved: () => void; initial?: any;
}) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: categories = [] } = useListCategories();
  const { toast } = useToast();
  const getInitialForm = useCallback((): ProductFormData => (
    initial ? {
      name: initial.name ?? "", description: initial.description ?? "", minimumPurity: "",
      minimumQuantity: String(initial.moq ?? ""), maximumQuantity: "", appearance: "", categoryIds: initial.categoryId ? [String(initial.categoryId)] : [], colors: "",
      deliverCountries: "", incoterms: [], industries: "", packaging: initial.packaging ?? "", units: initial.moqUnit ?? "", substances: "",
      warehouses: "", deliveryLeadTime: initial.deliveryLeadTime ?? "2-4 weeks", countryOfOrigin: initial.countryOfOrigin ?? "Saudi Arabia",
      basePrice: initial.basePrice ? String(initial.basePrice) : "", availability: initial.availability ?? "in_stock",
      technicalSpecsRaw: Array.isArray(initial.technicalSpecs)
        ? initial.technicalSpecs.map((spec: any) => `${spec.name ?? ""}:${spec.value ?? ""}:${spec.unit ?? ""}`).join("\n")
        : "",
    } : defaultForm
  ), [initial]);
  const [form, setForm] = useState<ProductFormData>(getInitialForm);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["Saudi Arabia"]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  const [bulkRows, setBulkRows] = useState<Record<string, string>[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const docInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setForm(getInitialForm());
  }, [getInitialForm, open]);

  const handleDocSelect = (docName: string, file: File | null) => {
    setDocFiles(prev => ({ ...prev, [docName]: file ?? null }));
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
        toast({ title: "File loaded", description: `${file.name} — ${json.length} row(s) found.` });
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

  const f = (key: keyof ProductFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

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
      ...form.incoterms.map((term) => ({ name: "Incoterm", value: term, unit: "" })),
      ...selectedCategoryNames.slice(1).map((categoryName) => ({ name: "Additional Category", value: categoryName, unit: "" })),
    ];

    const createPayload = {
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
      updateProduct.mutate({
        id: initial.id,
        data: {
          name: form.name,
          description: form.description,
          moq: parseFloat(form.minimumQuantity || "1"),
          basePrice: form.basePrice ? parseFloat(form.basePrice) : undefined,
          availability: form.availability,
          deliveryLeadTime: form.deliveryLeadTime,
          collectiveEligible: false,
        }
      }, handlers);
      return;
    }

    createProduct.mutate({ data: createPayload }, handlers);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="gap-2 px-0">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <span className="text-xs uppercase tracking-wider">Add Product</span>
        </div>
        <Tabs defaultValue="manual" className="pt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
          </TabsList>
          <TabsContent value="manual">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /> Basic Information</div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* ── Row 1: Name · Description · Minimum Purity ── */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={f("name")} /></div>
                    <div className="space-y-1.5"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={f("description")} /></div>
                    <div className="space-y-1.5"><Label>Minimum Purity (%)</Label><Input type="number" min="0" max="100" value={form.minimumPurity} onChange={f("minimumPurity")} /></div>
                  </div>

                  {/* ── Row 2: Min Qty · Max Qty ── */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5"><Label>Minimum Quantity</Label><Input type="number" value={form.minimumQuantity} onChange={f("minimumQuantity")} /></div>
                    <div className="space-y-1.5"><Label>Maximum Quantity</Label><Input type="number" value={form.maximumQuantity} onChange={f("maximumQuantity")} /></div>
                  </div>

                  {/* ── Row 3: Appearance · Colors · Categories ── */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Appearance</Label>
                      <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.appearance} onChange={f("appearance")}>
                        <option value="">Select appearance</option>
                        {APPERANCE_OPTIONS.map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Color</Label>
                      <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.colors} onChange={f("colors")}>
                        <option value="">Select color</option>
                        {COLOR_OPTIONS.map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 rounded-md border p-3 max-h-48 overflow-y-auto">
                        {categories.map((category) => {
                          const id = String(category.id);
                          return (
                            <label key={category.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground text-foreground/80">
                              <input
                                type="checkbox"
                                className="accent-primary"
                                checked={form.categoryIds.includes(id)}
                                onChange={(e) => setForm((prev) => ({
                                  ...prev,
                                  categoryIds: e.target.checked
                                    ? [...prev.categoryIds, id]
                                    : prev.categoryIds.filter((value) => value !== id),
                                }))}
                              />
                              {category.name}
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">First selected category is used as the primary category.</p>
                    </div>
                  </div>

                  {/* ── Row 4: Substance · Units · Packaging ── */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Substance Type</Label>
                      <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.substances} onChange={f("substances")}>
                        <option value="">Select substance</option>
                        {SUBSTANCE_OPTIONS.map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Units</Label>
                      <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.units} onChange={f("units")}>
                        <option value="">Select unit</option>
                        {UNIT_OPTIONS.map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Packaging</Label>
                      <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.packaging} onChange={f("packaging")}>
                        <option value="">Select packaging</option>
                        {PACKAGING_OPTIONS.map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* ── Row 5: Incoterms ── */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5"><Label>Base Price (USD)</Label><Input type="number" min="0" step="0.01" value={form.basePrice} onChange={f("basePrice")} /></div>
                    <div className="space-y-1.5"><Label>Country of Origin</Label><Input value={form.countryOfOrigin} onChange={f("countryOfOrigin")} /></div>
                    <div className="space-y-1.5"><Label>Delivery Lead Time</Label><Input value={form.deliveryLeadTime} onChange={f("deliveryLeadTime")} /></div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Incoterms</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 rounded-md border p-3">
                        {INCOTERM_OPTIONS.map((term) => (
                          <label key={term} className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground text-foreground/80">
                            <input
                              type="checkbox"
                              className="accent-primary"
                              checked={form.incoterms.includes(term)}
                              onChange={(e) => setForm((prev) => ({
                                ...prev,
                                incoterms: e.target.checked
                                  ? [...prev.incoterms, term]
                                  : prev.incoterms.filter((value) => value !== term),
                              }))}
                            />
                            {term}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Availability</Label>
                      <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.availability} onChange={f("availability")}>
                        <option value="in_stock">In Stock</option>
                        <option value="limited">Limited</option>
                        <option value="out_of_stock">Out of Stock</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Technical Specs</Label>
                    <Textarea
                      rows={4}
                      value={form.technicalSpecsRaw}
                      onChange={f("technicalSpecsRaw")}
                      placeholder={"Format: Property:Value:Unit\nExample: Purity:99.5:%\nExample: Density:1.02:g/cm3"}
                    />
                  </div>

                  {/* ── Row 6: Industries (multi-checkbox) ── */}
                  <div className="space-y-1.5">
                    <Label>Industries</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 rounded-md border p-3 max-h-48 overflow-y-auto">
                      {INDUSTRY_OPTIONS.map(industry => (
                        <label key={industry} className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground text-foreground/80">
                          <input
                            type="checkbox"
                            className="accent-primary"
                            checked={selectedIndustries.includes(industry)}
                            onChange={e => setSelectedIndustries(prev => e.target.checked ? [...prev, industry] : prev.filter(x => x !== industry))}
                          />
                          {industry}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* ── Row 7: Delivery Countries (multi-checkbox) ── */}
                  <div className="space-y-1.5">
                    <Label>Delivery Countries</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 rounded-md border p-3">
                      {COUNTRY_MULTI_OPTIONS.map(country => (
                        <label key={country} className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground text-foreground/80">
                          <input
                            type="checkbox"
                            className="accent-primary"
                            checked={selectedCountries.includes(country)}
                            onChange={e => setSelectedCountries(prev => e.target.checked ? [...prev, country] : prev.filter(x => x !== country))}
                          />
                          {country}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* ── Row 8: Warehouses (multi-checkbox) ── */}
                  <div className="space-y-1.5">
                    <Label>Warehouses</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 rounded-md border p-3">
                      {WAREHOUSE_OPTIONS.map(wh => (
                        <label key={wh} className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground text-foreground/80">
                          <input
                            type="checkbox"
                            className="accent-primary"
                            checked={selectedWarehouses.includes(wh)}
                            onChange={e => setSelectedWarehouses(prev => e.target.checked ? [...prev, wh] : prev.filter(x => x !== wh))}
                          />
                          {wh}
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Documentation</div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {DOCUMENTS.map(doc => (
                    <div key={doc}>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                        className="hidden"
                        ref={el => { docInputRefs.current[doc] = el; }}
                        onChange={e => handleDocSelect(doc, e.target.files?.[0] ?? null)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className={`w-full justify-start gap-2 ${docFiles[doc] ? "border-primary/50 bg-primary/5" : ""}`}
                        onClick={() => docInputRefs.current[doc]?.click()}
                      >
                        <Upload className="w-4 h-4" />
                        {docFiles[doc] ? (
                          <span className="flex items-center gap-2 truncate">
                            <span className="truncate">{docFiles[doc]!.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">({(docFiles[doc]!.size / 1024).toFixed(0)} KB)</span>
                          </span>
                        ) : doc}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={createProduct.isPending}>{createProduct.isPending ? "Saving…" : "Save Product"}</Button>
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
                  onChange={e => { const file = e.target.files?.[0]; if (file) parseBulkFile(file); e.target.value = ""; }}
                />
                <div
                  className={`rounded-2xl border-2 border-dashed p-10 text-center space-y-3 transition-colors ${dragOver ? "border-primary bg-primary/5" : "bg-muted/20"}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleBulkDrop}
                >
                  <Boxes className="w-10 h-10 mx-auto text-primary" />
                  {bulkFileName ? (
                    <>
                      <p className="font-semibold text-primary">{bulkFileName}</p>
                      <p className="text-sm text-muted-foreground">{bulkRows.length} row(s) loaded — preview below.</p>
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
                      <tr>{(bulkRows.length > 0 ? Object.keys(bulkRows[0]) : TEMPLATE_HEADERS).map(h => <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {bulkRows.length > 0 ? bulkRows.map((row, i) => (
                        <tr key={i} className="border-t">
                          {Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 whitespace-nowrap">{String(v) || "-"}</td>)}
                        </tr>
                      )) : [1,2,3,4,5].map(r => (
                        <tr key={r} className="border-t">
                          {TEMPLATE_HEADERS.map(h => <td key={h} className="px-3 py-2 text-muted-foreground">-</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="button" disabled={!bulkFileName} onClick={() => { toast({ title: "Import started", description: `Importing ${bulkRows.length} product(s) from ${bulkFileName}.` }); onClose(); }}>{bulkFileName ? `Import ${bulkRows.length} Product(s)` : "Upload first"}</Button>
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
  const [loadingSupplierId, setLoadingSupplierId] = useState(false);

  useEffect(() => {
    if (user?.role !== "supplier") return;
    let cancelled = false;

    const loadSupplierProfile = async () => {
      setLoadingSupplierId(true);
      try {
        const res = await fetch("/api/suppliers/profile", {
          headers: { Authorization: `Bearer ${localStorage.getItem("chemidot_token") ?? ""}` },
        });
        if (!res.ok) throw new Error("Failed to load supplier profile");
        const profile = await res.json();
        if (!cancelled) setSupplierId(profile.id ?? null);
      } catch {
        if (!cancelled) {
          setSupplierId(null);
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
  }, [user?.role, toast]);

  const { data, isLoading, refetch } = useListProducts(
    supplierId ? { supplierId, limit: 50 } : undefined,
    { query: { enabled: !!supplierId } as any },
  );
  const deleteMutation = useDeleteProduct();

  const handleDelete = (id: number) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "Product deleted" }); refetch(); },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    });
  };

  const availBadge = (av: string) => {
    switch (av) {
      case "in_stock": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none dark:bg-green-900/30 dark:text-green-400">In Stock</Badge>;
      case "limited": return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-none dark:bg-yellow-900/30 dark:text-yellow-400">Limited</Badge>;
      case "out_of_stock": return <Badge variant="secondary" className="text-muted-foreground">Out of Stock</Badge>;
      default: return <Badge variant="outline">{av}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Products</h1>
            <p className="text-muted-foreground">Manage your product catalog on the marketplace.</p>
          </div>
          <Button className="shrink-0 gap-2" onClick={() => { setEditingProduct(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>

        <Card className="border-orange-500/10 shadow-sm">
          <CardContent className="p-0">
            {isLoading || loadingSupplierId ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : (data?.products ?? []).length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <Package className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No products yet</h3>
                <p className="text-muted-foreground mt-1 mb-6">Add your first product to appear on the marketplace.</p>
                <Button onClick={() => { setEditingProduct(null); setFormOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" /> Add First Product
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {(data?.products ?? []).map(p => (
                  <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {p.imageUrl
                        ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        : <Package className="w-5 h-5 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{p.name}</span>
                        {availBadge(p.availability)}
                        {p.collectiveEligible && (
                          <Badge variant="outline" className="text-primary border-primary/30 text-xs">Collective</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
                        {p.casNumber && <span className="font-mono text-xs">{p.casNumber}</span>}
                        <span>MOQ: {p.moq} {p.moqUnit}</span>
                        {p.basePrice && <span>Price: {p.currency} {p.basePrice.toLocaleString()}</span>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingProduct(p); setFormOpen(true); }}>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(p.id)}>
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
