import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  id?: string;
  as?: "section" | "div" | "article" | "aside";
}

export function Section({
  children,
  className,
  innerClassName,
  id,
  as: Tag = "section",
}: SectionProps) {
  return (
    <Tag id={id} className={cn("py-16 md:py-20", className)}>
      <div className={cn("mx-auto max-w-7xl px-6 md:px-10", innerClassName)}>
        {children}
      </div>
    </Tag>
  );
}
