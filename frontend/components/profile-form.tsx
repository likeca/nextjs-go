"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { z } from "zod";
import { isValidPhoneNumber, type Value } from "react-phone-number-input";
import { Mail } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().refine((val) => {
    if (!val || val.length === 0) return true;
    try {
      return isValidPhoneNumber(val);
    } catch {
      return false;
    }
  }, {
    message: 'Please enter a valid phone number',
  }),
});

const emailChangeSchema = z.object({
  newEmail: z.string().email("Please enter a valid email address"),
});

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  image?: string | null;
  emailVerified: boolean;
}

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: user.name || "",
    phone: (user.phone || undefined) as Value | undefined,
  });

  // Email change state
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isEmailChangeLoading, setIsEmailChangeLoading] = useState(false);
  const [emailChangeError, setEmailChangeError] = useState("");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const dataToValidate = {
      name: formData.name,
      phone: formData.phone || "",
    };

    const validation = profileSchema.safeParse(dataToValidate);

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }

      toast.success("Profile updated successfully");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = async () => {
    setEmailChangeError("");

    const validation = emailChangeSchema.safeParse({ newEmail });
    if (!validation.success) {
      setEmailChangeError(validation.error.issues[0].message);
      return;
    }

    if (newEmail.trim().toLowerCase() === user.email.toLowerCase()) {
      setEmailChangeError("New email must be different from current email");
      return;
    }

    setIsEmailChangeLoading(true);

    try {
      const response = await fetch("/api/user/email-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmail.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEmailChangeError(data.error || "Failed to request email change");
        return;
      }

      toast.success(data.message);
      setIsEditingEmail(false);
      setNewEmail("");
    } catch (error) {
      setEmailChangeError("Failed to request email change. Please try again.");
      console.error(error);
    } finally {
      setIsEmailChangeLoading(false);
    }
  };

  const handleCancelEmailChange = () => {
    setIsEditingEmail(false);
    setNewEmail("");
    setEmailChangeError("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-6 pb-6 border-b">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user.image || undefined} alt={user.name} />
          <AvatarFallback className="text-lg">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-medium">Profile Picture</h3>
          <p className="text-sm text-muted-foreground">
            Upload a new profile picture (coming soon)
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter your name"
            required
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && (
            <p className="text-sm text-red-500 mt-1">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="flex items-center gap-2">
            <Input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="bg-muted cursor-not-allowed flex-1"
              aria-describedby="email-status"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditingEmail(!isEditingEmail)}
              aria-label="Change email address"
            >
              <Mail className="h-4 w-4 mr-1" aria-hidden="true" />
              Change
            </Button>
          </div>
          <div id="email-status">
            {user.emailVerified ? (
              <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Email verified
              </p>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Email not verified
              </p>
            )}
          </div>

          {isEditingEmail && (
            <div className="mt-3 p-4 rounded-lg border bg-muted/50 space-y-3">
              <p className="text-sm text-muted-foreground">
                A verification email will be sent to your new address. Your
                email won&apos;t change until you verify it.
              </p>
              <div className="space-y-2">
                <Label htmlFor="new-email">New Email Address</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setEmailChangeError("");
                  }}
                  placeholder="Enter new email address"
                  disabled={isEmailChangeLoading}
                  className={emailChangeError ? "border-red-500" : ""}
                  aria-invalid={emailChangeError ? "true" : "false"}
                  aria-describedby={emailChangeError ? "email-change-error" : undefined}
                />
                {emailChangeError && (
                  <p id="email-change-error" className="text-sm text-red-500">
                    {emailChangeError}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleEmailChange}
                  disabled={isEmailChangeLoading || !newEmail}
                >
                  {isEmailChangeLoading
                    ? "Sending verification..."
                    : "Send Verification Email"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEmailChange}
                  disabled={isEmailChangeLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number (Optional)</Label>
          <PhoneInput
            id="phone"
            value={formData.phone}
            onChange={(value) => setFormData({ ...formData, phone: value || undefined })}
            placeholder="+1 (555) 000-0000"
            error={!!errors.phone}
          />
          {errors.phone && (
            <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>User ID</Label>
          <Input
            type="text"
            value={user.id}
            disabled
            className="bg-muted cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">
            Your unique user identifier
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
