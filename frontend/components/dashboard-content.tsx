"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Mail, User, Calendar, LogOut } from "lucide-react";

interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    emailVerified: boolean;
    createdAt: Date;
  };
  session: {
    id: string;
    expiresAt: Date;
  };
}

export function DashboardContent({ session }: { session: Session }) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={session.user} />

      {/* Main Content */}
      <div className="container mx-auto max-w-4xl flex-1 space-y-6 p-6">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name}!
          </p>
        </div>

        {/* User Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Your account details and verification status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={session.user.image || undefined} alt={session.user.name} />
                <AvatarFallback className="text-lg">
                  {getInitials(session.user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">{session.user.name}</h3>
                  {session.user.emailVerified ? (
                    <Badge variant="default">Verified</Badge>
                  ) : (
                    <Badge variant="secondary">Unverified</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  User ID: {session.user.id}
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email Address</p>
                  <p className="text-sm text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Full Name</p>
                  <p className="text-sm text-muted-foreground">
                    {session.user.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Member Since</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(session.user.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <LogOut className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Session Expires</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(session.session.expiresAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Manage your account and application settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
                <a href="/profile">
                  <User className="h-6 w-6" />
                  <span>Edit Profile</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
                <a href="/billing">
                  <Mail className="h-6 w-6" />
                  <span>Billing</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
                <a href="/dashboard">
                  <User className="h-6 w-6" />
                  <span>Dashboard</span>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
