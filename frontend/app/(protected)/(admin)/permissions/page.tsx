'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/use-permission';
import { IconPencil, IconTrash, IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { listPermissions } from '@/actions/permissions/list-permissions';
import { deletePermission } from '@/actions/permissions/delete-permission';
import { PermissionFilters, PermissionFilterValues } from './filters';
import { formatDate } from '@/lib/utils';

interface Permission {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function PermissionsPage() {
  const router = useRouter();
  const { isLoading: checkingPermission, hasPermission } = usePermission('permission', 'read');
  const canCreate = usePermission('permission', 'create').hasPermission;
  const canUpdate = usePermission('permission', 'update').hasPermission;
  const canDelete = usePermission('permission', 'delete').hasPermission;
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [filteredPermissions, setFilteredPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPermissionId, setDeletingPermissionId] = useState<string | null>(null);
  const [filters, setFilters] = useState<PermissionFilterValues>({
    name: '',
    resource: 'all',
    action: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    const result = await listPermissions();
    if (result.success) {
      setPermissions(result.permissions);
      console.log('Permissions loaded:', result.permissions);
      applyFilters(result.permissions, filters);
    } else if (result.error) {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const applyFilters = (permissionsList: Permission[], filterValues: PermissionFilterValues) => {
    let filtered = permissionsList;

    // Filter by permission name
    if (filterValues.name) {
      filtered = filtered.filter(permission =>
        permission.name.toLowerCase().includes(filterValues.name.toLowerCase())
      );
    }

    // Filter by resource
    if (filterValues.resource !== 'all') {
      filtered = filtered.filter(permission => permission.resource === filterValues.resource);
    }

    // Filter by action
    if (filterValues.action !== 'all') {
      filtered = filtered.filter(permission => permission.action === filterValues.action);
    }

    // Sort by resource and action
    filtered.sort((a, b) => {
      const resourceCompare = a.resource.localeCompare(b.resource);
      if (resourceCompare !== 0) return resourceCompare;
      return a.action.localeCompare(b.action);
    });

    setFilteredPermissions(filtered);
  };

  // Extract unique resources and actions from permissions
  const availableResources = Array.from(new Set(permissions.map(p => p.resource))).sort();
  const availableActions = Array.from(new Set(permissions.map(p => p.action))).sort();

  const handleFilterChange = (newFilters: PermissionFilterValues) => {
    setFilters(newFilters);
    applyFilters(permissions, newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredPermissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPermissions = filteredPermissions.slice(startIndex, endIndex);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleDeleteClick = (id: string) => {
    setDeletingPermissionId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPermissionId) return;

    try {
      const result = await deletePermission(deletingPermissionId);
      if (result.success) {
        toast.success(result.success);
        loadPermissions();
      } else if (result.error) {
        toast.error(result.error);
      }
    } finally {
      setDeleteDialogOpen(false);
      setDeletingPermissionId(null);
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'create':
        return 'default';
      case 'read':
        return 'secondary';
      case 'update':
        return 'outline';
      case 'delete':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <>
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Permissions</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-semibold">Permissions</h1>
                    <p className="text-sm text-muted-foreground">
                      Manage system permissions and access controls
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <PermissionFilters 
                      onFilterChange={handleFilterChange} 
                      currentFilters={filters}
                      availableResources={availableResources}
                      availableActions={availableActions}
                    />
                    {canCreate && (
                      <Button size="sm" onClick={() => router.push('/permissions/create')}>
                        <IconPlus className="mr-2 h-4 w-4" />
                        Add Permission
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Updated At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : filteredPermissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {permissions.length === 0
                              ? 'No permissions found.'
                              : 'No permissions match the current filters.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedPermissions.map((permission) => (
                          <TableRow key={permission.id}>
                            <TableCell className="font-medium">
                              {permission.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {permission.resource}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getActionBadgeVariant(permission.action)} className="capitalize">
                                {permission.action}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {permission.description || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(permission.createdAt)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(permission.updatedAt)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {canUpdate && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => router.push(`/permissions/${permission.id}`)}
                                  >
                                    <IconPencil className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteClick(permission.id)}
                                  >
                                    <IconTrash className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {filteredPermissions.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredPermissions.length)} of {filteredPermissions.length} permissions
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Items per page:</span>
                        <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the permission and remove it from all roles and users.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingPermissionId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
