import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin } from "@/lib/auth-utils";
import { ProfileForm } from "@/components/profile-form";
import { PasswordChangeForm } from "@/components/password-change-form";
import { TwoFactorSettings } from "@/components/two-factor-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isAdmin = await isUserAdmin(session?.user?.id);

  // The session user (from Django /api/auth/user/) already carries these fields.
  const userData = session?.user ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={session?.user} isAdmin={isAdmin} />

      <div className="container max-w-4xl mx-auto flex-1 py-10 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your profile details and personal information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileForm user={{
                  ...userData!,
                  phone: userData!.phone || "",
                }} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PasswordChangeForm />
              </CardContent>
            </Card>
            {process.env.NEXT_PUBLIC_ENABLE_TWO_FACTOR !== "false" && (
              <TwoFactorSettings />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
