'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/use-permission';
import { IconPlus, IconPencil, IconTrash, IconShield } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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
import { listRoles } from '@/actions/roles/list-roles';
import { deleteRole } from '@/actions/roles/delete-role';
import { formatDate } from '@/lib/utils';
import { RoleFilters, RoleFilterValues } from './filters';

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  rolePermissions: Array<{
    permission: {
      id: string;
      name: string;
      resource: string;
      action: string;
    };
  }>;
}

export default function RolesPage() {
  const router = useRouter();
  const { isLoading: checkingPermission, hasPermission } = usePermission('role', 'read');
  const [roles, setRoles] = useState<Role[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [filters, setFilters] = useState<RoleFilterValues>({
    name: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    const result = await listRoles();
    if (result.error) {
      toast.error(result.error);
    } else {
      setRoles(result.roles);
      applyFilters(result.roles, filters);
    }
    setLoading(false);
  };

  const applyFilters = (rolesList: Role[], filterValues: RoleFilterValues) => {
    let filtered = rolesList;

    // Filter by name
    if (filterValues.name) {
      filtered = filtered.filter((role) => role.name.toLowerCase().includes(filterValues.name.toLowerCase()));
    }

    setFilteredRoles(filtered);
  };

  const handleFilterChange = (newFilters: RoleFilterValues) => {
    setFilters(newFilters);
    applyFilters(roles, newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRoles = filteredRoles.slice(startIndex, endIndex);

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleDeleteClick = (id: string) => {
    setDeletingRoleId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRoleId) return;

    const result = await deleteRole(deletingRoleId);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.success);
      loadRoles();
    }

    setDeleteDialogOpen(false);
    setDeletingRoleId(null);
  };

  return (
    <>
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
                {/* Breadcrumb */}
                <Breadcrumb className="mb-6">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Roles</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>

                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold">Roles</h1>
                    <p className="text-sm text-muted-foreground">Manage user roles and permissions</p>
                  </div>
                  <div className="flex gap-2">
                    <RoleFilters onFilterChange={handleFilterChange} currentFilters={filters} />
                    <Button size="sm" onClick={() => router.push('/roles/new')}>
                      <IconPlus className="mr-2 h-4 w-4" />
                      Create Role
                    </Button>
                  </div>
                </div>

                {/* Table */}
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Permissions</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : filteredRoles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No roles found. Create your first role to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedRoles.map((role) => (
                          <TableRow key={role.id}>
                            <TableCell className="font-medium">{role.name}</TableCell>
                            <TableCell>{role.description || 'No description'}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{role.rolePermissions.length} permissions</Badge>
                            </TableCell>
                            <TableCell>
                              {role.isSystem ? (
                                <Badge variant="outline" className="gap-1">
                                  <IconShield className="h-3 w-3" />
                                  System
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Custom</Badge>
                              )}
                            </TableCell>
                            <TableCell>{formatDate(role.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => router.push(`/roles/${role.id}`)}
                                >
                                  <IconPencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteClick(role.id)}
                                  disabled={role.isSystem}
                                >
                                  <IconTrash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {filteredRoles.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredRoles.length)} of {filteredRoles.length} roles
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
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the role and remove it from all assigned
              admins.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingRoleId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
