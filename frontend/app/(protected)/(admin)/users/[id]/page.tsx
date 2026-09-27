'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePermission } from '@/hooks/use-permission';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getAdmin } from '@/actions/users/get-user';
import { updateAdmin } from '@/actions/users/update-user';
import { listRoles } from '@/actions/roles/list-roles';
import { IconArrowLeft } from '@tabler/icons-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { PhoneInput } from '@/components/ui/phone-input';
import { isValidPhoneNumber, type Value } from 'react-phone-number-input';

interface Role {
  id: string;
  name: string;
  description: string | null;
}

export default function EditAdminPage() {
  const router = useRouter();
  const params = useParams();
  const adminId = params.id as string;
  const { isLoading: checkingPermission, hasPermission } = usePermission('user', 'update');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState<Value | undefined>();
  const [emailVerified, setEmailVerified] = useState(false);
  const [role, setRole] = useState('user');
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadRoles();
    loadAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminId]);

  const loadRoles = async () => {
    const result = await listRoles();
    if (result.error) {
      toast.error(result.error);
    } else {
      setRoles(result.roles);
    }
  };

  const loadAdmin = async () => {
    setLoading(true);
    const result = await getAdmin(adminId);

    if (result.error || !result.admin) {
      toast.error(result.error || 'Admin not found');
      router.push('/users');
      return;
    }
    setName(result.admin.name);
    setEmail(result.admin.email);
    setPhone((result.admin.phone || undefined) as Value | undefined);
    setEmailVerified(result.admin.emailVerified);
    setRole(result.admin.role?.id || 'user');
    setIsAdmin(result.admin.isAdmin || false);

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone if provided
    if (phone && phone.trim() !== '') {
      try {
        if (!isValidPhoneNumber(phone)) {
          toast.error('Please enter a valid phone number');
          return;
        }
      } catch {
        toast.error('Please enter a valid phone number');
        return;
      }
    }

    if (password && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      const result = await updateAdmin({
        id: adminId,
        name,
        email,
        phone: phone || undefined,
        emailVerified,
        role,
        isAdmin,
        password: password || undefined,
      });

      if (result.success) {
        toast.success(result.success);
        router.push('/users');
      } else if (result.error) {
        toast.error(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Breadcrumb */}
          <div className="px-4 lg:px-6">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/users">Users</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Edit User</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              {/* Header and Content */}
              <div className="px-4 lg:px-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold">Edit User</h1>
                    <p className="text-sm text-muted-foreground">Update user account details</p>
                  </div>
                  <div>
                    <Button size="sm" variant="outline" onClick={() => router.push('/users')}>
                      <IconArrowLeft className="mr-2 h-4 w-4" />
                      Back to Users
                    </Button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="w-full space-y-6">
                  {/* General Information */}
                  <div className="space-y-4 p-6 border rounded-lg">
                    <h2 className="text-lg font-semibold">Account Information</h2>

                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">
                          Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          placeholder="Enter user name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="email">
                          Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="admin@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="phone">
                          Phone Number
                        </Label>
                        <PhoneInput
                          id="phone"
                          value={phone}
                          onChange={(value) => setPhone(value || undefined)}
                          placeholder="+971 50 123 4567"
                        />
                        <p className="text-xs text-muted-foreground">
                          Optional - International format recommended
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="role">
                          Role <span className="text-red-500">*</span>
                        </Label>
                        <Select value={role} onValueChange={setRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User (Website Access)</SelectItem>
                            {roles.map((r) => (
                              <SelectItem key={r.id} value={r.name}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Assign a role that defines this user's permissions
                        </p>
                      </div>

                      <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                          <Label htmlFor="emailVerified">Email Verified</Label>
                          <p className="text-xs text-muted-foreground">
                            Confirm the email address has been verified
                          </p>
                        </div>
                        <Switch
                          id="emailVerified"
                          checked={emailVerified}
                          onCheckedChange={setEmailVerified}
                        />
                      </div>

                      <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                          <Label htmlFor="isAdmin">Admin Access</Label>
                          <p className="text-xs text-muted-foreground">
                            Grant access to protected admin routes
                          </p>
                        </div>
                        <Switch
                          id="isAdmin"
                          checked={isAdmin}
                          onCheckedChange={setIsAdmin}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password Change */}
                  <div className="space-y-4 p-6 border rounded-lg">
                    <h2 className="text-lg font-semibold">Change Password</h2>
                    <p className="text-sm text-muted-foreground">
                      Leave password fields empty to keep the current password
                    </p>

                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="password">New Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter new password (min. 8 characters)"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          minLength={8}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Re-enter new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          minLength={8}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/users')}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Updating...' : 'Update User'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
  );
}
