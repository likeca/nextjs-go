"use client";

import { useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { toast } from "sonner";
import { User, CreditCard, LogOut, LayoutDashboard, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface HeaderProps {
  user?: {
    name: string;
    email: string;
    image?: string | null;
  } | null;
  isAdmin?: boolean;
}

export function Header({ user, isAdmin }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  async function handleSignOut() {
    try {
      await signOut();
      toast.success("Logged out successfully!");
      router.push("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to logout");
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const navLinkClass = (path: string) =>
    `text-sm font-medium transition-colors hover:text-primary ${
      pathname === path ? "text-primary" : "text-muted-foreground"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Logo />

        {/* Desktop navigation */}
        {user ? (
          <>
            <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
              <Link href="/blog" className={navLinkClass("/blog")}>Blog</Link>
              <Link href="/#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">Pricing</Link>
              <Link href="/contact" className={navLinkClass("/contact")}>Contact</Link>
            </nav>
            <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full ring-1 ring-border transition-all">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image || undefined} alt={user.name} />
                    <AvatarFallback className="bg-secondary text-sm">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/billing" className="cursor-pointer">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Billing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-400 focus:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </>
        ) : (
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            <Link href="/blog" className={navLinkClass("/blog")}>Blog</Link>
            <Link href="/#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">Pricing</Link>
            <Link href="/contact" className={navLinkClass("/contact")}>Contact</Link>
            <div className="w-px h-5 bg-border mx-1" aria-hidden="true" />
            <ThemeToggle />
            <Link href="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Login
            </Link>
            <Button size="sm" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </nav>
        )}

        {/* Mobile hamburger button */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-3" aria-label="Mobile navigation">
            <Link
              href="/blog"
              className={navLinkClass("/blog") + " py-2"}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Blog
            </Link>
            <Link
              href="/#pricing"
              className="text-sm font-medium py-2 text-muted-foreground transition-colors hover:text-primary"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className={navLinkClass("/contact") + " py-2"}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact
            </Link>
            <div className="border-t border-border pt-3 pb-1 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
            <div className="border-t border-border pt-3 flex flex-col gap-2">
              {user ? (
                <>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground mb-2">{user.email}</p>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Link href="/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Link href="/billing">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Billing
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleSignOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-red-400 justify-start"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button
                    size="sm"
                    asChild
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Link href="/signup">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
