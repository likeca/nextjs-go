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
import { useState } from 'react';

interface RoleFiltersProps {
  onFilterChange: (filters: RoleFilterValues) => void;
  currentFilters: RoleFilterValues;
}

export interface RoleFilterValues {
  name: string;
}

export function RoleFilters({ onFilterChange, currentFilters }: RoleFiltersProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<RoleFilterValues>(currentFilters);

  const handleApplyFilters = () => {
    onFilterChange(filters);
    setOpen(false);
  };

  const handleResetFilters = () => {
    const resetFilters = {
      name: '',
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const activeFilterCount = Object.values(filters).filter((value) => value !== '' && value !== 'all').length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <IconFilter className="mr-2 h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filter Roles</DialogTitle>
          <DialogDescription>Apply filters to narrow down the roles list</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Role Name</Label>
            <Input
              id="name"
              placeholder="Search by name..."
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleResetFilters}>
            <IconX className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
          <Button onClick={handleApplyFilters}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
