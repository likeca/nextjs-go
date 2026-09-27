'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/use-permission';
import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-react';
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
import { listAdmins } from '@/actions/users/list-user';
import { deleteUser } from '@/actions/users/delete-user';
import { AdminFilters, AdminFilterValues } from './filters';
import { TableSkeletonRows } from '@/components/skeletons/table-skeleton';
import { formatDate } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: {
    id: string;
    name: string;
  } | null;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function AdminsPage() {
  const router = useRouter();
  const { isLoading: checkingPermission, hasPermission } = usePermission('user', 'read');
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdminFilterValues>({
    name: '',
    email: '',
    emailVerified: 'all',
    isAdmin: 'all',
    role: 'all',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, filters]);

  const loadAdmins = async () => {
    setLoading(true);
    const result = await listAdmins({
      page: currentPage,
      limit: itemsPerPage,
      filters: {
        name: filters.name,
        email: filters.email,
        emailVerified: filters.emailVerified,
        isAdmin: filters.isAdmin,
        role: filters.role,
      },
    });
    if (result.success) {
      setAdmins(result.admins);
      setTotalPages(result.pagination.totalPages);
      setTotalCount(result.pagination.total);
    } else if (result.error) {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handleFilterChange = (newFilters: AdminFilterValues) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Calculate display indices
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount);

  const handleDeleteClick = (id: string) => {
    setDeletingAdminId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAdminId) return;

    try {
      const result = await deleteUser(deletingAdminId);

      if (result.success) {
        toast.success(result.success);
        loadAdmins();
      } else if (result.error) {
        toast.error(result.error);
      }
    } finally {
      setDeleteDialogOpen(false);
      setDeletingAdminId(null);
    }
  };

  return (
    <>
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
                      <BreadcrumbPage>Users</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              {/* Header and Content */}
              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-semibold">Users</h1>
                    <p className="text-sm text-muted-foreground">
                      Manage user accounts
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <AdminFilters
                      onFilterChange={handleFilterChange}
                      currentFilters={filters}
                    />
                    <Button size="sm" onClick={() => router.push('/users/new')}>
                      <IconPlus className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                  </div>
                </div>

                {/* Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Admin Access</TableHead>
                        <TableHead>Email Verified</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableSkeletonRows columns={7} rows={8} />
                      ) : admins.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {totalCount === 0
                              ? 'No users found. Click "Add User" to create one.'
                              : 'No users match the current filters.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        admins.map((admin) => (
                          <TableRow key={admin.id}>
                            <TableCell className="font-medium">{admin.name}</TableCell>
                            <TableCell>{admin.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {admin.role?.name || 'No Role'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={admin.isAdmin ? 'default' : 'secondary'}>
                                {admin.isAdmin ? 'Admin' : 'User'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={admin.emailVerified ? 'default' : 'secondary'}>
                                {admin.emailVerified ? 'Verified' : 'Unverified'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDate(admin.createdAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => router.push(`/users/${admin.id}`)}
                                >
                                  <IconPencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteClick(admin.id)}
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
                {totalCount > 0 && (
                  <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {endIndex} of {totalCount} users
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
              This action cannot be undone. This will permanently delete the user account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingAdminId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
