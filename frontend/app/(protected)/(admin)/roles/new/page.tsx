'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { createRole } from '@/actions/roles/create-role';
import { listPermissions } from '@/actions/permissions/list-permissions';
import { IconArrowLeft } from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Permission {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
}

export default function NewRolePage() {
  const router = useRouter();
  const { isLoading: checkingPermission, hasPermission } = usePermission('role', 'create');
  const [submitting, setSubmitting] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    const result = await listPermissions();
    if (result.error) {
      toast.error(result.error);
    } else {
      setPermissions(result.permissions);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await createRole({
        ...formData,
        permissionIds: selectedPermissions,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.success);
        router.push('/roles');
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
                      <BreadcrumbPage>Create Role</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>

                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold">Create Role</h1>
                    <p className="text-sm text-muted-foreground">Define a new role with specific permissions</p>
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
                          />
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
                        {submitting ? 'Creating...' : 'Create Role'}
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
