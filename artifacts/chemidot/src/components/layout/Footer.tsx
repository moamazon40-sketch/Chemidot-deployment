import { Link } from "wouter";
import logoImage from "@assets/Copy_of_Untitled_Design_(1)_1777886080670.png";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const NAV = [
  {
    title: "Marketplace",
    links: [
      { label: "Browse Chemicals",   href: "/marketplace" },
      { label: "Collective Orders",  href: "/collective-orders" },
      { label: "Verified Suppliers", href: "/suppliers" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "For Buyers",         href: "/for-buyers" },
      { label: "For Suppliers",      href: "/for-suppliers" },
      { label: "Collective Buying",  href: "/collective-orders" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us",           href: "/about" },
      { label: "Contact Us",         href: "/contact" },
      { label: "Get Started",        href: "/auth/register" },
    ],
  },
];

export function Footer() {

  return (
    <footer className="relative w-full overflow-hidden bg-white border-t border-border">

      {/* ── Gradient top accent ── */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

      {/* ── Subtle background tints ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-primary/4 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 md:px-10 pt-12 pb-7">

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-6 pb-10 border-b border-border">

          {/* Brand column */}
          <div className="sm:col-span-2 space-y-5">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <img
                src={logoImage}
                alt="Chemidot"
                className="h-8 w-8 object-contain transition-transform duration-300 group-hover:scale-110"
              />
              <span className="text-xl font-bold tracking-tight text-primary">Chemidot</span>
            </Link>

            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Building the future of chemical sourcing in the Middle East.
            </p>

            {/* LinkedIn */}
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://www.linkedin.com/company/chemidoteg/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chemidot on LinkedIn"
                className="group relative flex items-center justify-center w-9 h-9 rounded-lg bg-secondary border border-border text-muted-foreground transition-all duration-300 hover:text-white hover:border-[#0A66C2]/60 hover:bg-[#0A66C2] hover:shadow-[0_0_16px_rgba(10,102,194,0.3)]"
              >
                <LinkedInIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Nav columns */}
          {NAV.map(col => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-5">
                {col.title}
              </p>
              <ul className="space-y-3">
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="relative text-sm text-muted-foreground transition-colors duration-200 hover:text-primary group inline-block"
                    >
                      {link.label}
                      <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-accent/70 transition-all duration-300 group-hover:w-full" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-xs text-muted-foreground">

          <p className="order-2 sm:order-1">
            &copy; {new Date().getFullYear()} Chemidot. All rights reserved.
          </p>

          <div className="order-3 flex items-center gap-5">
            <Link href="/about" className="hover:text-primary transition-colors duration-200">Terms</Link>
            <Link href="/about" className="hover:text-primary transition-colors duration-200">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
