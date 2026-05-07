import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogin } from "@workspace/api-client-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { useApiError } from "@/hooks/use-api-error";
import logoImage from "@assets/Copy_of_Untitled_Design_1777818624833.png";

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const loginMutation = useLogin();
  const { handleError } = useApiError();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          login(data.token, data.user);
          window.location.href = "/dashboard";
        },
        onError: (err) => handleError(err, "Please check your credentials and try again."),
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="inline-flex items-center justify-center mb-6">
            <img src={logoImage} alt="Chemidot" className="h-16 w-16 object-contain" />
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight">{t.signInTitle}</h1>
          <p className="text-muted-foreground mt-2">{t.signInDesc}</p>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader>
            <CardTitle>{t.signInBtn}</CardTitle>
            <CardDescription>Enter your email and password to access the platform.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t.email}</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@company.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loginMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t.password}</Label>
                  <Link href="/contact" className="text-sm text-primary font-medium hover:underline">Forgot password?</Link>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? t.signingIn : t.signInBtn}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                {t.noAccount}{" "}
                <Link href="/auth/register" className="font-medium text-primary hover:underline">
                  {t.signUp}
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
