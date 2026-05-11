import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ShoppingCart, CheckSquare, Square, ArrowLeftRight } from "lucide-react";
import { useRegister, RegisterBodyAccountMode } from "@workspace/api-client-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/lib/i18n";
import { useApiError } from "@/hooks/use-api-error";
import logoImage from "@assets/Copy_of_Untitled_Design_1777818624833.png";

const INDUSTRY_KEYS = [
  "academics", "adhesives", "agriculture", "automotive", "building",
  "chemical", "consumer", "distribution", "electrical", "food",
  "healthcare", "homecare", "leather", "military", "oil", "other",
] as const;

type IndustryKey = typeof INDUSTRY_KEYS[number];
type AccountMode = RegisterBodyAccountMode;

function modeIncludesBuying(mode: AccountMode) {
  return mode === "buyer" || mode === "both";
}

function modeIncludesSelling(mode: AccountMode) {
  return mode === "supplier" || mode === "both";
}

export default function Register() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const registerMutation = useRegister();
  const { toast } = useToast();
  const { handleError } = useApiError();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [accountMode, setAccountMode] = useState<AccountMode>("buyer");
  const [selectedIndustries, setSelectedIndustries] = useState<Set<IndustryKey>>(new Set());
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    companyName: "",
    country: "",
    phone: "",
    commercialRegNumber: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const toggleIndustry = (key: IndustryKey) => {
    setSelectedIndustries(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modeIncludesBuying(accountMode)) {
      setStep(2);
    } else {
      doRegister();
    }
  };

  const doRegister = (industries?: Set<IndustryKey>) => {
    const industryValue = industries && industries.size > 0
      ? JSON.stringify(Array.from(industries))
      : (selectedIndustries.size > 0 ? JSON.stringify(Array.from(selectedIndustries)) : undefined);

    registerMutation.mutate(
      { data: { ...formData, accountMode, role: accountMode === "both" ? "buyer" : accountMode, industry: industryValue } },
      {
        onSuccess: (data) => {
          login(data.token, data.user);
          window.location.href = "/dashboard";
        },
        onError: (err) => handleError(err, "Please check your information and try again."),
      }
    );
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndustries.size === 0) {
      toast({ title: t.selectAtLeast, variant: "destructive" });
      return;
    }
    doRegister(selectedIndustries);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-xl space-y-8">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="inline-flex items-center justify-center mb-4">
            <img src={logoImage} alt="Chemidot" className="h-16 w-16 object-contain" />
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight">{t.createAccount}</h1>
          <p className="text-muted-foreground mt-2">{t.joinPlatform}</p>
        </div>

        {/* Step indicator for buyers */}
        {modeIncludesBuying(accountMode) && (
          <div className="flex items-center justify-center gap-3">
            <div className={`flex items-center gap-2 text-sm font-medium ${step === 1 ? "text-primary" : "text-muted-foreground"}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"}`}>1</span>
              Your Details
            </div>
            <div className="h-px w-8 bg-border" />
            <div className={`flex items-center gap-2 text-sm font-medium ${step === 2 ? "text-primary" : "text-muted-foreground"}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</span>
              Your Industry
            </div>
          </div>
        )}

        {step === 1 ? (
          <Card className="border-border shadow-xl">
            <CardHeader>
              <CardTitle>{t.signUpTitle}</CardTitle>
              <CardDescription>{t.signUpDesc}</CardDescription>
            </CardHeader>
            <form onSubmit={handleStep1Submit}>
              <CardContent className="space-y-6">
                
                <div className="space-y-3">
                  <Label>{t.iWantToUseAs}</Label>
                  <RadioGroup defaultValue="buyer" onValueChange={(v: AccountMode) => setAccountMode(v)} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <RadioGroupItem value="buyer" id="role-buyer" className="peer sr-only" />
                      <Label
                        htmlFor="role-buyer"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                      >
                        <ShoppingCart className="mb-2 h-6 w-6" />
                        <span className="font-semibold">{t.buyer}</span>
                        <span className="text-xs text-muted-foreground font-normal mt-1">{t.sourceChemicals}</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="supplier" id="role-supplier" className="peer sr-only" />
                      <Label
                        htmlFor="role-supplier"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                      >
                        <Building2 className="mb-2 h-6 w-6" />
                        <span className="font-semibold">{t.supplier}</span>
                        <span className="text-xs text-muted-foreground font-normal mt-1">{t.sellProducts}</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="both" id="role-both" className="peer sr-only" />
                      <Label
                        htmlFor="role-both"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                      >
                        <ArrowLeftRight className="mb-2 h-6 w-6" />
                        <span className="font-semibold">Both</span>
                        <span className="text-xs text-muted-foreground font-normal mt-1">Buy and sell chemicals</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t.firstName}</Label>
                    <Input id="firstName" required value={formData.firstName} onChange={handleChange} disabled={registerMutation.isPending} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t.lastName}</Label>
                    <Input id="lastName" required value={formData.lastName} onChange={handleChange} disabled={registerMutation.isPending} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">{t.companyName}</Label>
                  <Input id="companyName" required value={formData.companyName} onChange={handleChange} disabled={registerMutation.isPending} />
                </div>

                {modeIncludesSelling(accountMode) && (
                  <div className="space-y-2">
                    <Label htmlFor="commercialRegNumber">{t.commercialReg}</Label>
                    <Input id="commercialRegNumber" required value={formData.commercialRegNumber} onChange={handleChange} disabled={registerMutation.isPending} />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">{t.workEmail}</Label>
                  <Input id="email" type="email" placeholder="you@company.com" required value={formData.email} onChange={handleChange} disabled={registerMutation.isPending} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">{t.country}</Label>
                    <Input id="country" placeholder={t.countryPlaceholder} required value={formData.country} onChange={handleChange} disabled={registerMutation.isPending} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t.phone}</Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} disabled={registerMutation.isPending} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t.password}</Label>
                  <Input id="password" type="password" required value={formData.password} onChange={handleChange} disabled={registerMutation.isPending} />
                </div>

              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full" size="lg" disabled={registerMutation.isPending}>
                  {registerMutation.isPending
                    ? t.creatingAccount
                    : modeIncludesBuying(accountMode) ? t.continueStep : t.createAccountBtn}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  {t.alreadyHaveAccount}{" "}
                  <Link href="/auth/login" className="font-medium text-primary hover:underline">
                    {t.signIn}
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        ) : (
          /* Step 2: Industry selection */
          <Card className="border-border shadow-xl">
            <CardHeader>
              <CardTitle>{t.selectIndustries}</CardTitle>
              <CardDescription>{t.selectAllThatApply}</CardDescription>
            </CardHeader>
            <form onSubmit={handleStep2Submit}>
              <CardContent>
                <div className="grid grid-cols-2 gap-2.5">
                  {INDUSTRY_KEYS.map(key => {
                    const selected = selectedIndustries.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleIndustry(key)}
                        className={`flex items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 text-sm text-start transition-all cursor-pointer ${
                          selected
                            ? "border-primary bg-primary/5 text-primary font-medium"
                            : "border-border hover:border-primary/40 hover:bg-muted/40"
                        }`}
                      >
                        {selected
                          ? <CheckSquare className="w-4 h-4 shrink-0 text-primary" />
                          : <Square className="w-4 h-4 shrink-0 text-muted-foreground" />}
                        <span className="leading-tight">{t.industries[key]}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedIndustries.size > 0 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    {selectedIndustries.size} selected
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  {t.backStep}
                </Button>
                <Button type="submit" className="flex-1" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? t.creatingAccount : t.createAccountBtn}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
