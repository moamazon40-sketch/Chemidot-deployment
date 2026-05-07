import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, CalendarClock, Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const TIME_SLOTS = [
  "Morning (8:00 AM – 12:00 PM AST)",
  "Afternoon (12:00 PM – 4:00 PM AST)",
  "Late Afternoon (4:00 PM – 6:00 PM AST)",
  "Any time works for me",
];

const EMPTY = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  timeSlot: "",
  notes: "",
};

export function RequestDemoDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleClose = (v: boolean) => {
    if (!v) {
      setForm(EMPTY);
      setSuccess(false);
    }
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.timeSlot) {
      toast({ title: "Please select a preferred time slot.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const message = [
        `Preferred time slot: ${form.timeSlot || "Not specified"}`,
        form.notes ? `\nAdditional notes:\n${form.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          company: form.company,
          subject: "Demo Request",
          message,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Something went wrong");
      }

      setSuccess(true);
    } catch (err) {
      toast({
        title: "Could not submit request",
        description:
          err instanceof Error ? err.message : "Please try again or email us at hello@chemidot.com.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Book a Free Demo</DialogTitle>
          </div>
          <DialogDescription>
            Fill in your details and we'll schedule a personalised 30-minute walkthrough with one of our sourcing specialists.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-10 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <h3 className="text-lg font-bold">Demo request received!</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Our team will reach out within 1 business day to confirm your time slot. Check your inbox at <strong>{form.email || "your email"}</strong>.
            </p>
            <Button className="mt-2" onClick={() => handleClose(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="demo-first">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="demo-first"
                  required
                  placeholder="Ahmed"
                  value={form.firstName}
                  onChange={set("firstName")}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="demo-last">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="demo-last"
                  required
                  placeholder="Al-Rashid"
                  value={form.lastName}
                  onChange={set("lastName")}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="demo-email">
                Work Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="demo-email"
                type="email"
                required
                placeholder="ahmed@company.com"
                value={form.email}
                onChange={set("email")}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="demo-company">
                  Company <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="demo-company"
                  required
                  placeholder="Your Company Ltd."
                  value={form.company}
                  onChange={set("company")}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="demo-phone">Phone / WhatsApp</Label>
                <Input
                  id="demo-phone"
                  type="tel"
                  placeholder="+966 5X XXX XXXX"
                  value={form.phone}
                  onChange={set("phone")}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Preferred Time Slot <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.timeSlot}
                onValueChange={(v) => setForm((f) => ({ ...f, timeSlot: v }))}
                disabled={loading}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a time that works for you" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="demo-notes">Anything you'd like to cover? (optional)</Label>
              <Textarea
                id="demo-notes"
                placeholder="e.g. We need to source MDI and polyol blends for our Jeddah plant…"
                rows={3}
                value={form.notes}
                onChange={set("notes")}
                disabled={loading}
                className="resize-none"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleClose(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin inline-block">⟳</span> Sending…
                  </span>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Book Demo
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
