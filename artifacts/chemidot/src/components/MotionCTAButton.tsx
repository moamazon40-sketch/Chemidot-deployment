import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MotionCTAButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit";
  disabled?: boolean;
}

const sizes = {
  sm: "px-5 py-2.5 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-3.5 text-base",
};

const buttonVariants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.04,
    boxShadow: "0px 0px 32px rgba(59, 130, 246, 0.55)",
    transition: { duration: 0.2, ease: "easeOut" as const },
  },
  tap: { scale: 0.96, transition: { duration: 0.1 } },
};

const fillVariants = {
  initial: { x: "-100%" },
  hover: { x: 0, transition: { duration: 0.38, ease: "easeInOut" as const } },
};

function MotionCTAInner({
  children,
  className,
  size = "lg",
  onClick,
  type = "button",
  disabled,
}: Omit<MotionCTAButtonProps, "href">) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      variants={buttonVariants}
      initial="initial"
      whileHover={disabled ? undefined : "hover"}
      whileTap={disabled ? undefined : "tap"}
      className={cn(
        "relative rounded-xl font-semibold text-white overflow-hidden bg-[#0B1220] inline-flex items-center justify-center gap-2 cursor-pointer select-none",
        sizes[size],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <motion.div
        variants={fillVariants}
        className="absolute inset-0 bg-blue-600"
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

export function MotionCTAButton({
  children,
  href,
  onClick,
  className,
  size = "lg",
  type = "button",
  disabled,
}: MotionCTAButtonProps) {
  const [, navigate] = useLocation();
  if (href) {
    const hasHash = href.includes("#");
    const handleHashClick = hasHash ? () => {
      const [path, hash] = href.split("#");
      navigate(path || "/");
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } : undefined;

    if (hasHash) {
      return (
        <MotionCTAInner size={size} className={className} onClick={handleHashClick} disabled={disabled}>
          {children}
        </MotionCTAInner>
      );
    }
    return (
      <Link href={href}>
        <MotionCTAInner size={size} className={className} disabled={disabled}>
          {children}
        </MotionCTAInner>
      </Link>
    );
  }
  return (
    <MotionCTAInner size={size} className={className} onClick={onClick} type={type} disabled={disabled}>
      {children}
    </MotionCTAInner>
  );
}
