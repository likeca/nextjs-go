'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/use-permission';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createAdmin } from '@/actions/users/create-user';
import { listRoles } from '@/actions/roles/list-roles';
import { IconArrowLeft } from '@tabler/icons-react';
import {z} from 'zod';
import { Switch } from '@/components/ui/switch';
import { PhoneInput } from '@/components/ui/phone-input';
import { isValidPhoneNumber, type Value } from 'react-phone-number-input';

interface Role {
  id: string;
  name: string;
  description: string | null;
}

export default function NewAdminPage() {

	const schema = z.object({
		name: z.string().min(1, "Name is required"),
		email: z.string().email("Invalid email address"),
		phone: z.string()
			.refine((val) => {
				if (!val || val.length === 0) return true; // Phone is optional
				try {
					return isValidPhoneNumber(val);
				} catch {
					return false;
				}
			}, {
				message: 'Please enter a valid phone number',
			})
			.optional()
			.or(z.literal('')),
		password: z.string().min(6, "Password must be at least 6 characters"),
		confirmPassword: z.string().min(6, "Confirm Password must be at least 6 characters"),
	}).refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

  const router = useRouter();
  const { isLoading: checkingPermission, hasPermission } = usePermission('user', 'create');
  const [submitting, setSubmitting] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState<Value | undefined>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('user');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    const result = await listRoles();
    if (result.error) {
      toast.error(result.error);
    } else {
      setRoles(result.roles);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate using schema
    const validation = schema.safeParse({
      name,
      email,
      phone,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const errors = validation.error.flatten();
      if (errors.fieldErrors.name) toast.error(errors.fieldErrors.name[0]);
      if (errors.fieldErrors.email) toast.error(errors.fieldErrors.email[0]);
      if (errors.fieldErrors.phone) toast.error(errors.fieldErrors.phone[0]);
      if (errors.fieldErrors.password) toast.error(errors.fieldErrors.password[0]);
      if (errors.fieldErrors.confirmPassword) toast.error(errors.fieldErrors.confirmPassword[0]);
      return;
    }

    setSubmitting(true);

    try {
      const result = await createAdmin({
        name,
        email,
        phone: phone || undefined,
        password,
        role,
        isAdmin,
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
                      <BreadcrumbPage>New User</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              {/* Header and Content */}
              <div className="px-4 lg:px-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold">Create New User</h1>
                    <p className="text-sm text-muted-foreground">Add a new user account</p>
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

                      <div className="grid gap-2">
                        <Label htmlFor="password">
                          Password <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter password (min. 8 characters)"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={8}
                        />
                        <p className="text-xs text-muted-foreground">
                          Password must be at least 8 characters long
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="confirmPassword">
                          Confirm Password <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Re-enter password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={8}
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
                      {submitting ? 'Creating...' : 'Create User'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
  );
}
