'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePermission } from '@/hooks/use-permission';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { getRole } from '@/actions/roles/get-role';
import { updateRole } from '@/actions/roles/update-role';
import { listPermissions } from '@/actions/permissions/list-permissions';
import { IconArrowLeft } from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Permission {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  rolePermissions: Array<{
    permission: {
      id: string;
      name: string;
      resource: string;
      action: string;
    };
  }>;
}

export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();
  const roleId = params.id as string;
  const { isLoading: checkingPermission, hasPermission } = usePermission('role', 'update');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, [roleId]);

  const loadData = async () => {
    setLoading(true);

    // Load role and permissions in parallel
    const [roleResult, permissionsResult] = await Promise.all([
      getRole(roleId),
      listPermissions(),
    ]);

    if (roleResult.error) {
      toast.error(roleResult.error);
      router.push('/roles');
      return;
    }

    if (permissionsResult.error) {
      toast.error(permissionsResult.error);
    } else {
      setPermissions(permissionsResult.permissions);
    }

    const roleData = roleResult.role as Role;
    setRole(roleData);
    setFormData({
      name: roleData.name,
      description: roleData.description || '',
    });
    setSelectedPermissions(roleData.rolePermissions.map((p) => p.permission.id));

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await updateRole({
        id: roleId,
        ...formData,
        permissionIds: selectedPermissions,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
        // Reload the data to show the updated state
        await loadData();
        // Optional: redirect after showing the updated data
        setTimeout(() => router.push('/roles'), 1000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId) ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
    );
  };

  const toggleAllForResource = (resource: string) => {
    const resourcePermissions = permissions.filter((p) => p.resource === resource);
    const allSelected = resourcePermissions.every((p) => selectedPermissions.includes(p.id));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((id) => !resourcePermissions.find((p) => p.id === id)));
    } else {
      setSelectedPermissions((prev) => [
        ...prev,
        ...resourcePermissions.filter((p) => !prev.includes(p.id)).map((p) => p.id),
      ]);
    }
  };

  const groupedPermissions = permissions.reduce(
    (acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              <Skeleton className="h-8 w-64 mb-6" />
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48 mt-2" />
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
                <Breadcrumb className="mb-6">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/roles">Roles</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Edit Role</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>

                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold">Edit Role</h1>
                    <p className="text-sm text-muted-foreground">Update role details and permissions</p>
                  </div>
                  <div>
                    <Button size="sm" variant="outline" onClick={() => router.push('/roles')}>
                      <IconArrowLeft className="mr-2 h-4 w-4" />
                      Back to Roles
                    </Button>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="grid gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Role Details</CardTitle>
                        <CardDescription>Basic information about the role</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">
                            Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="name"
                            placeholder="e.g., Content Manager"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            disabled={role?.isSystem}
                          />
                          {role?.isSystem && (
                            <p className="text-xs text-muted-foreground">System roles cannot be renamed</p>
                          )}
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            placeholder="Describe what this role can do..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Permissions</CardTitle>
                        <CardDescription>Select permissions for this role</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-6">
                          {Object.entries(groupedPermissions).map(([resource, perms]) => (
                            <div key={resource} className="grid gap-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium capitalize">{resource}</h3>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleAllForResource(resource)}
                                >
                                  {perms.every((p) => selectedPermissions.includes(p.id)) ? 'Deselect All' : 'Select All'}
                                </Button>
                              </div>
                              <div className="grid gap-2 rounded-md border p-4">
                                {perms.map((permission) => (
                                  <div key={permission.id} className="flex items-start space-x-3">
                                    <Checkbox
                                      id={permission.id}
                                      checked={selectedPermissions.includes(permission.id)}
                                      onCheckedChange={() => togglePermission(permission.id)}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                      <label
                                        htmlFor={permission.id}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                      >
                                        {permission.name}
                                      </label>
                                      {permission.description && (
                                        <p className="text-sm text-muted-foreground">{permission.description}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                      <Button type="button" variant="outline" onClick={() => router.push('/roles')} disabled={submitting}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? 'Updating...' : 'Update Role'}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
  );
}
