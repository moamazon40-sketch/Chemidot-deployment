import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth, getStoredToken } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useApiError } from "@/hooks/use-api-error";
import { useState } from "react";
import { User, Lock } from "lucide-react";

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
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account information and security.</p>
        </div>

        {/* Account Info */}
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
                  <Input id="firstName" value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" value={profile.companyName} onChange={e => setProfile(p => ({ ...p, companyName: e.target.value }))} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))} />
                </div>
              </div>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Profile"}</Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
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
                <Input id="current" type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="next">New Password</Label>
                <Input id="next" type="password" value={passwords.next} onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm New Password</Label>
                <Input id="confirm" type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              <Button type="submit" disabled={savingPw}>{savingPw ? "Updating…" : "Update Password"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
