import { MainLayout } from "@/components/layout/MainLayout";
import { useListSuppliers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, MapPin, Package, Clock, Search, Building2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

const COUNTRIES = ["Saudi Arabia", "UAE", "Kuwait", "Qatar", "Bahrain", "Oman", "Jordan", "Egypt"];

export default function Suppliers() {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const { data, isLoading } = useListSuppliers({
    search: search || undefined,
    country: country || undefined,
    verified: verifiedOnly ? true : undefined,
    limit: 30,
  });

  const suppliers = data?.suppliers ?? [];

  return (
    <MainLayout>
      {/* ── Header ── */}
      <section className="relative overflow-hidden bg-hero pt-28 pb-14">
        <div className="absolute inset-0 grid-pattern [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto max-w-7xl px-6 md:px-10 relative animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur mb-5">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            <span>Verified Network</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-3">Verified Suppliers</h1>
          <p className="text-muted-foreground text-lg max-w-xl">
            Connect with trusted chemical manufacturers and distributors across the Middle East.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 md:px-10 py-10">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company name..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm min-w-[160px]"
          >
            <option value="">All Countries</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button
            variant={verifiedOnly ? "default" : "outline"}
            onClick={() => setVerifiedOnly(v => !v)}
            className="gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Verified Only
          </Button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading..." : `${data?.total ?? 0} suppliers found`}
          </p>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <h3 className="text-xl font-semibold text-foreground">No suppliers found</h3>
            <p className="mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map(s => (
              <Card key={s.id} className="group hover:shadow-md transition-all hover:scale-[1.02]">
                <CardContent className="pt-5 pb-4">
                  {/* Logo / Initial */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-blue-600/20 border flex items-center justify-center text-2xl font-bold text-primary shrink-0">
                      {s.companyName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                          {s.companyName}
                        </h3>
                        {s.verified && (
                          <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{s.country}</span>
                        {s.yearsInBusiness && (
                          <span className="ml-2 text-xs">• Est. {new Date().getFullYear() - s.yearsInBusiness}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Certifications */}
                  {s.certifications && s.certifications.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {s.certifications.slice(0, 3).map((cert: string) => (
                        <Badge key={cert} variant="secondary" className="text-xs">{cert}</Badge>
                      ))}
                      {s.certifications.length > 3 && (
                        <Badge variant="secondary" className="text-xs">+{s.certifications.length - 3} more</Badge>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Response: {s.avgResponseTime ?? "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" />
                      <span>{s.responseRate ?? 0}% response rate</span>
                    </div>
                  </div>

                  <Link href={`/suppliers/${s.id}`}>
                    <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all" size="sm">
                      View Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
