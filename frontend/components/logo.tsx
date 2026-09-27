"use client";

import { appConfig } from "@/lib/config";
import { Layers } from "lucide-react";
import Link from "next/link";

interface LogoProps {
  className?: string;
  showText?: boolean;
  href?: string;
}

export function Logo({ className = "", showText = true, href = "/" }: LogoProps) {
  const logoContent = (
    <>
      <div className="flex size-8 items-center justify-center rounded-md bg-foreground">
        <Layers className="size-4 text-background" strokeWidth={2} />
      </div>
      {showText && (
        <span className="text-base font-semibold tracking-tight">{appConfig.name}</span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`flex items-center gap-2 ${className}`}>
        {logoContent}
      </Link>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {logoContent}
    </div>
  );
}
