'use client';

import { IconFilter, IconX } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

interface AdminFiltersProps {
  onFilterChange: (filters: AdminFilterValues) => void;
  currentFilters: AdminFilterValues;
}

export interface AdminFilterValues {
  name: string;
  email: string;
  emailVerified: string;
  isAdmin: string;
  role: string;
}

export function AdminFilters({ onFilterChange, currentFilters }: AdminFiltersProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<AdminFilterValues>(currentFilters);

  const handleApplyFilters = () => {
    onFilterChange(filters);
    setOpen(false);
  };

  const handleResetFilters = () => {
    const resetFilters: AdminFilterValues = {
      name: '',
      email: '',
      emailVerified: 'all',
      isAdmin: 'all',
      role: 'all',
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const hasActiveFilters = 
    filters.name !== '' || 
    filters.email !== '' || 
    filters.emailVerified !== 'all' ||
    filters.isAdmin !== 'all' ||
    filters.role !== 'all';

  const activeFiltersCount = 
    (filters.name ? 1 : 0) + 
    (filters.email ? 1 : 0) + 
    (filters.emailVerified !== 'all' ? 1 : 0) +
    (filters.isAdmin !== 'all' ? 1 : 0) +
    (filters.role !== 'all' ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <IconFilter className="mr-2 h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filter Users</DialogTitle>
          <DialogDescription>
            Apply filters to find specific users in your list.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Search by name..."
              value={filters.name}
              onChange={(e) =>
                setFilters({ ...filters, name: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="Search by email..."
              value={filters.email}
              onChange={(e) =>
                setFilters({ ...filters, email: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="emailVerified">Email Verified</Label>
            <Select
              value={filters.emailVerified}
              onValueChange={(value) =>
                setFilters({ ...filters, emailVerified: value })
              }
            >
              <SelectTrigger id="emailVerified">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="isAdmin">Admin Status</Label>
            <Select
              value={filters.isAdmin}
              onValueChange={(value) =>
                setFilters({ ...filters, isAdmin: value })
              }
            >
              <SelectTrigger id="isAdmin">
                <SelectValue placeholder="Select admin status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Admin</SelectItem>
                <SelectItem value="false">Not Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={filters.role}
              onValueChange={(value) =>
                setFilters({ ...filters, role: value })
              }
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleResetFilters}
            disabled={!hasActiveFilters}
          >
            <IconX className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleApplyFilters}>
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
