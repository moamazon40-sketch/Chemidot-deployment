import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth, getStoredToken } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useApiError } from "@/hooks/use-api-error";
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, FileText, Lock, Trash2, Upload, User, Users } from "lucide-react";

type SupplierBrand = {
  id: number;
  name: string;
  logoUrl?: string | null;
  description?: string | null;
};

type SupplierDocument = {
  id: number;
  title: string;
  type: string;
  fileUrl: string;
  fileSize?: string | null;
};

type SupplierExpert = {
  id: number;
  name: string;
  title: string;
  email: string;
  avatarUrl?: string | null;
};

type SupplierProfileData = {
  id: number;
  companyName: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  country: string;
  description?: string | null;
  warehouseLocation?: string | null;
  commercialRegNumber?: string | null;
  certifications: string[];
  yearsInBusiness?: number | null;
  avgResponseTime?: string | null;
  brands: SupplierBrand[];
  documents: SupplierDocument[];
  experts: SupplierExpert[];
};

const DOCUMENT_TYPES = ["TDS", "SDS", "Brochure", "Certificate", "Other"];

async function uploadAsset(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);

  const res = await fetch("/api/suppliers/upload-image", {
    method: "POST",
    headers: { Authorization: `Bearer ${getStoredToken()}` },
    body: fd,
  });

  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url as string;
}

function AssetUploadField({
  label,
  accept,
  value,
  onChange,
  helper,
}: {
  label: string;
  accept: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadAsset(file);
      onChange(url);
      toast({ title: `${label} uploaded` });
    } catch {
      toast({ title: `Could not upload ${label.toLowerCase()}`, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={`Paste ${label.toLowerCase()} URL or upload a file`} />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading} className="gap-2 shrink-0">
          <Upload className="w-4 h-4" />
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.currentTarget.value = "";
        }}
      />
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

export default function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { handleError } = useApiError();

  const [profile, setProfile] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    companyName: user?.companyName ?? "",
    phone: user?.phone ?? "",
    country: user?.country ?? "",
  });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [supplierProfile, setSupplierProfile] = useState<SupplierProfileData | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    companyName: "",
    country: "",
    description: "",
    warehouseLocation: "",
    commercialRegNumber: "",
    certifications: "",
    yearsInBusiness: "",
    avgResponseTime: "",
    logoUrl: "",
    coverUrl: "",
  });
  const [brandForm, setBrandForm] = useState({ name: "", logoUrl: "", description: "" });
  const [documentForm, setDocumentForm] = useState({ title: "", type: "TDS", fileUrl: "", fileSize: "" });
  const [expertForm, setExpertForm] = useState({ name: "", title: "", email: "", avatarUrl: "" });
  const [loadingSupplier, setLoadingSupplier] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [savingStorefront, setSavingStorefront] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [savingDocument, setSavingDocument] = useState(false);
  const [savingExpert, setSavingExpert] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  useEffect(() => {
    setProfile({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      companyName: user?.companyName ?? "",
      phone: user?.phone ?? "",
      country: user?.country ?? "",
    });
  }, [user?.firstName, user?.lastName, user?.companyName, user?.phone, user?.country]);

  const isSupplier = user?.role === "supplier";

  const syncSupplierForm = (data: SupplierProfileData) => {
    setSupplierProfile(data);
    setSupplierForm({
      companyName: data.companyName ?? "",
      country: data.country ?? "",
      description: data.description ?? "",
      warehouseLocation: data.warehouseLocation ?? "",
      commercialRegNumber: data.commercialRegNumber ?? "",
      certifications: (data.certifications ?? []).join(", "),
      yearsInBusiness: data.yearsInBusiness ? String(data.yearsInBusiness) : "",
      avgResponseTime: data.avgResponseTime ?? "",
      logoUrl: data.logoUrl ?? "",
      coverUrl: data.coverUrl ?? "",
    });
  };

  const loadSupplierProfile = async () => {
    if (!isSupplier) return;
    setLoadingSupplier(true);
    try {
      const res = await fetch("/api/suppliers/profile", {
        headers: { Authorization: `Bearer ${getStoredToken()}` },
      });
      if (!res.ok) throw new Error("Could not load supplier profile");
      const data = await res.json();
      syncSupplierForm(data);
    } catch (err) {
      handleError(err, "Could not load supplier storefront settings");
    } finally {
      setLoadingSupplier(false);
    }
  };

  useEffect(() => {
    void loadSupplierProfile();
  }, [isSupplier]);

  const storefrontCompletion = useMemo(() => {
    const fields = [
      supplierForm.companyName,
      supplierForm.country,
      supplierForm.description,
      supplierForm.logoUrl,
      supplierForm.coverUrl,
      supplierForm.warehouseLocation,
    ];
    const filled = fields.filter((value) => value.trim()).length;
    return Math.round((filled / fields.length) * 100);
  }, [supplierForm]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Profile updated successfully" });
    } catch (err) {
      handleError(err, "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (passwords.next.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.next }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed");
      }
      toast({ title: "Password updated successfully" });
      setPasswords({ current: "", next: "", confirm: "" });
    } catch (err) {
      handleError(err, "Could not update password");
    } finally {
      setSavingPw(false);
    }
  };

  const handleSaveStorefront = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStorefront(true);
    try {
      const res = await fetch("/api/suppliers/profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName: supplierForm.companyName,
          country: supplierForm.country,
          description: supplierForm.description,
          warehouseLocation: supplierForm.warehouseLocation,
          commercialRegNumber: supplierForm.commercialRegNumber,
          certifications: supplierForm.certifications
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          yearsInBusiness: supplierForm.yearsInBusiness ? parseInt(supplierForm.yearsInBusiness, 10) : undefined,
          avgResponseTime: supplierForm.avgResponseTime || undefined,
          logoUrl: supplierForm.logoUrl || undefined,
          coverUrl: supplierForm.coverUrl || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Storefront updated" });
      await loadSupplierProfile();
    } catch (err) {
      handleError(err, "Could not update storefront");
    } finally {
      setSavingStorefront(false);
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBrand(true);
    try {
      const res = await fetch("/api/suppliers/profile/brands", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(brandForm),
      });
      if (!res.ok) throw new Error("Failed");
      setBrandForm({ name: "", logoUrl: "", description: "" });
      toast({ title: "Brand added" });
      await loadSupplierProfile();
    } catch (err) {
      handleError(err, "Could not add brand");
    } finally {
      setSavingBrand(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDocument(true);
    try {
      const res = await fetch("/api/suppliers/profile/documents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(documentForm),
      });
      if (!res.ok) throw new Error("Failed");
      setDocumentForm({ title: "", type: "TDS", fileUrl: "", fileSize: "" });
      toast({ title: "Document added" });
      await loadSupplierProfile();
    } catch (err) {
      handleError(err, "Could not add document");
    } finally {
      setSavingDocument(false);
    }
  };

  const handleCreateExpert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingExpert(true);
    try {
      const res = await fetch("/api/suppliers/profile/experts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expertForm),
      });
      if (!res.ok) throw new Error("Failed");
      setExpertForm({ name: "", title: "", email: "", avatarUrl: "" });
      toast({ title: "Expert added" });
      await loadSupplierProfile();
    } catch (err) {
      handleError(err, "Could not add expert");
    } finally {
      setSavingExpert(false);
    }
  };

  const handleDelete = async (resource: "brands" | "documents" | "experts", id: number) => {
    setDeletingKey(`${resource}:${id}`);
    try {
      const res = await fetch(`/api/suppliers/profile/${resource}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getStoredToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Item removed" });
      await loadSupplierProfile();
    } catch (err) {
      handleError(err, `Could not remove ${resource.slice(0, -1)}`);
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account, storefront, and supplier-facing content.</p>
        </div>

        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" /> Account Information
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">{user?.role}</Badge>
                <Badge className="bg-green-100 text-green-800 border-none dark:bg-green-900/30 dark:text-green-400">
                  {user?.status === "active" ? "Active" : user?.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm">
              <span className="text-muted-foreground">Email address: </span>
              <span className="font-medium">{user?.email}</span>
              <span className="ml-2 text-xs text-muted-foreground">(cannot be changed)</span>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={profile.firstName} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={profile.lastName} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" value={profile.companyName} onChange={(e) => setProfile((p) => ({ ...p, companyName: e.target.value }))} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={profile.country} onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value }))} />
                </div>
              </div>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Button>
            </form>
          </CardContent>
        </Card>

        {isSupplier && (
          <>
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Storefront Profile
                  </CardTitle>
                  <Badge variant="outline">{storefrontCompletion}% complete</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {loadingSupplier && !supplierProfile ? (
                  <p className="text-sm text-muted-foreground">Loading storefront settings...</p>
                ) : (
                  <form onSubmit={handleSaveStorefront} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Company Name</Label>
                        <Input value={supplierForm.companyName} onChange={(e) => setSupplierForm((p) => ({ ...p, companyName: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Country</Label>
                        <Input value={supplierForm.country} onChange={(e) => setSupplierForm((p) => ({ ...p, country: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>About the Company</Label>
                      <Textarea rows={5} value={supplierForm.description} onChange={(e) => setSupplierForm((p) => ({ ...p, description: e.target.value }))} placeholder="Tell buyers who you are, what you sell, and where you operate." />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Warehouse / Main Location</Label>
                        <Input value={supplierForm.warehouseLocation} onChange={(e) => setSupplierForm((p) => ({ ...p, warehouseLocation: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Commercial Registration Number</Label>
                        <Input value={supplierForm.commercialRegNumber} onChange={(e) => setSupplierForm((p) => ({ ...p, commercialRegNumber: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Certifications</Label>
                        <Input value={supplierForm.certifications} onChange={(e) => setSupplierForm((p) => ({ ...p, certifications: e.target.value }))} placeholder="ISO 9001, REACH, Halal" />
                        <p className="text-xs text-muted-foreground">Separate items with commas.</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Years in Business</Label>
                        <Input type="number" min="0" value={supplierForm.yearsInBusiness} onChange={(e) => setSupplierForm((p) => ({ ...p, yearsInBusiness: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Average Response Time</Label>
                      <Input value={supplierForm.avgResponseTime} onChange={(e) => setSupplierForm((p) => ({ ...p, avgResponseTime: e.target.value }))} placeholder="24 hours" />
                    </div>
                    <AssetUploadField
                      label="Logo"
                      accept="image/*"
                      value={supplierForm.logoUrl}
                      onChange={(value) => setSupplierForm((p) => ({ ...p, logoUrl: value }))}
                      helper="Use a square logo for the best storefront fit."
                    />
                    <AssetUploadField
                      label="Cover Image"
                      accept="image/*"
                      value={supplierForm.coverUrl}
                      onChange={(value) => setSupplierForm((p) => ({ ...p, coverUrl: value }))}
                      helper="This image appears across the public supplier storefront."
                    />
                    <Button type="submit" disabled={savingStorefront}>{savingStorefront ? "Saving..." : "Save Storefront"}</Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-3">
              <Card className="xl:col-span-1">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base">Brands</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <form onSubmit={handleCreateBrand} className="space-y-3">
                    <Input placeholder="Brand name" value={brandForm.name} onChange={(e) => setBrandForm((p) => ({ ...p, name: e.target.value }))} />
                    <AssetUploadField label="Brand Logo" accept="image/*" value={brandForm.logoUrl} onChange={(value) => setBrandForm((p) => ({ ...p, logoUrl: value }))} />
                    <Textarea rows={3} placeholder="Short brand description" value={brandForm.description} onChange={(e) => setBrandForm((p) => ({ ...p, description: e.target.value }))} />
                    <Button type="submit" disabled={savingBrand}>{savingBrand ? "Adding..." : "Add Brand"}</Button>
                  </form>
                  <Separator />
                  <div className="space-y-3">
                    {(supplierProfile?.brands ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No brands yet. Brands will only appear on the storefront when you add them.</p>
                    ) : supplierProfile?.brands.map((brand) => (
                      <div key={brand.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">{brand.name}</p>
                            {brand.description ? <p className="text-sm text-muted-foreground mt-1">{brand.description}</p> : null}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleDelete("brands", brand.id)}
                            disabled={deletingKey === `brands:${brand.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="xl:col-span-1">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <form onSubmit={handleCreateDocument} className="space-y-3">
                    <Input placeholder="Document title" value={documentForm.title} onChange={(e) => setDocumentForm((p) => ({ ...p, title: e.target.value }))} />
                    <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={documentForm.type} onChange={(e) => setDocumentForm((p) => ({ ...p, type: e.target.value }))}>
                      {DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}
                    </select>
                    <AssetUploadField
                      label="Document File"
                      accept=".pdf,image/*"
                      value={documentForm.fileUrl}
                      onChange={(value) => setDocumentForm((p) => ({ ...p, fileUrl: value }))}
                      helper="Upload PDF or image-based product documents."
                    />
                    <Input placeholder="File size (optional)" value={documentForm.fileSize} onChange={(e) => setDocumentForm((p) => ({ ...p, fileSize: e.target.value }))} />
                    <Button type="submit" disabled={savingDocument}>{savingDocument ? "Adding..." : "Add Document"}</Button>
                  </form>
                  <Separator />
                  <div className="space-y-3">
                    {(supplierProfile?.documents ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No documents yet. Add TDS, SDS, brochures, or certificates to strengthen trust.</p>
                    ) : supplierProfile?.documents.map((document) => (
                      <div key={document.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">{document.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{document.type}{document.fileSize ? ` • ${document.fileSize}` : ""}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleDelete("documents", document.id)}
                            disabled={deletingKey === `documents:${document.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="xl:col-span-1">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" /> Experts
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <form onSubmit={handleCreateExpert} className="space-y-3">
                    <Input placeholder="Expert name" value={expertForm.name} onChange={(e) => setExpertForm((p) => ({ ...p, name: e.target.value }))} />
                    <Input placeholder="Role / title" value={expertForm.title} onChange={(e) => setExpertForm((p) => ({ ...p, title: e.target.value }))} />
                    <Input type="email" placeholder="Work email" value={expertForm.email} onChange={(e) => setExpertForm((p) => ({ ...p, email: e.target.value }))} />
                    <AssetUploadField
                      label="Expert Avatar"
                      accept="image/*"
                      value={expertForm.avatarUrl}
                      onChange={(value) => setExpertForm((p) => ({ ...p, avatarUrl: value }))}
                    />
                    <Button type="submit" disabled={savingExpert}>{savingExpert ? "Adding..." : "Add Expert"}</Button>
                  </form>
                  <Separator />
                  <div className="space-y-3">
                    {(supplierProfile?.experts ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Experts are optional. If you do not add them, they will not appear on the storefront.</p>
                    ) : supplierProfile?.experts.map((expert) => (
                      <div key={expert.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">{expert.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">{expert.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{expert.email}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleDelete("experts", expert.id)}
                            disabled={deletingKey === `experts:${expert.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4" /> Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current">Current Password</Label>
                <Input id="current" type="password" value={passwords.current} onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="next">New Password</Label>
                <Input id="next" type="password" value={passwords.next} onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm New Password</Label>
                <Input id="confirm" type="password" value={passwords.confirm} onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))} />
              </div>
              <Button type="submit" disabled={savingPw}>{savingPw ? "Updating..." : "Update Password"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
