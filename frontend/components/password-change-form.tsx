"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Checkbox } from "@/components/ui/checkbox";
import { z } from "zod";

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export function PasswordChangeForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    revokeOtherSessions: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate with Zod
    const validation = passwordChangeSchema.safeParse({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
      confirmPassword: formData.confirmPassword,
    });

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
      const { data, error } = await authClient.changePassword({
        newPassword: formData.newPassword,
        currentPassword: formData.currentPassword,
        revokeOtherSessions: formData.revokeOtherSessions,
      });

      if (error) {
        toast.error(error.message || "Failed to change password");
        return;
      }

      toast.success(
        formData.revokeOtherSessions
          ? "Password changed successfully! All other sessions have been logged out."
          : "Password changed successfully!"
      );

      // Reset form
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        revokeOtherSessions: false,
      });
      setErrors({});
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword" className={errors.currentPassword ? "text-red-600" : ""}>
            Current Password
          </Label>
          <Input
            id="currentPassword"
            type={showPasswords ? "text" : "password"}
            value={formData.currentPassword}
            onChange={(e) =>
              setFormData({ ...formData, currentPassword: e.target.value })
            }
            placeholder="Enter your current password"
            required
            autoComplete="current-password"
            className={errors.currentPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
            aria-invalid={errors.currentPassword ? "true" : "false"}
            aria-describedby={errors.currentPassword ? "currentPassword-error" : undefined}
          />
          {errors.currentPassword && (
            <p id="currentPassword-error" className="text-sm font-medium text-red-600">
              {errors.currentPassword}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword" className={errors.newPassword ? "text-red-600" : ""}>
            New Password
          </Label>
          <Input
            id="newPassword"
            type={showPasswords ? "text" : "password"}
            value={formData.newPassword}
            onChange={(e) =>
              setFormData({ ...formData, newPassword: e.target.value })
            }
            placeholder="Enter your new password"
            required
            minLength={8}
            autoComplete="new-password"
            className={errors.newPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
            aria-invalid={errors.newPassword ? "true" : "false"}
            aria-describedby={errors.newPassword ? "newPassword-error" : undefined}
          />
          {errors.newPassword && (
            <p id="newPassword-error" className="text-sm font-medium text-red-600">
              {errors.newPassword}
            </p>
          )}
          {!errors.newPassword && (
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters long
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className={errors.confirmPassword ? "text-red-600" : ""}>
            Confirm New Password
          </Label>
          <Input
            id="confirmPassword"
            type={showPasswords ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            placeholder="Confirm your new password"
            required
            minLength={8}
            autoComplete="new-password"
            className={errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
            aria-invalid={errors.confirmPassword ? "true" : "false"}
            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
          />
          {errors.confirmPassword && (
            <p id="confirmPassword-error" className="text-sm font-medium text-red-600">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="showPasswords"
            checked={showPasswords}
            onCheckedChange={(checked) => setShowPasswords(checked as boolean)}
          />
          <Label
            htmlFor="showPasswords"
            className="text-sm font-normal cursor-pointer"
          >
            Show passwords
          </Label>
        </div>

        {/* <div className="bg-muted/50 border border-border rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="revokeOtherSessions"
              checked={formData.revokeOtherSessions}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, revokeOtherSessions: checked as boolean })
              }
            />
            <div className="flex-1">
              <Label
                htmlFor="revokeOtherSessions"
                className="text-sm font-medium cursor-pointer"
              >
                Log out all other devices
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                This will sign you out from all other browsers and devices. You
                will remain signed in on this device.
              </p>
            </div>
          </div>
        </div> */}
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Changing Password..." : "Change Password"}
        </Button>
      </div>
    </form>
  );
}
