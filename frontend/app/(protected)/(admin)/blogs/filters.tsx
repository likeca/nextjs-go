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

interface BlogFiltersProps {
  onFilterChange: (filters: BlogFilterValues) => void;
  currentFilters: BlogFilterValues;
}

export interface BlogFilterValues {
  title: string;
  authorId: string;
  published: string;
  tags: string;
}

export function BlogFilters({ onFilterChange, currentFilters }: BlogFiltersProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<BlogFilterValues>(currentFilters);

  const handleApplyFilters = () => {
    onFilterChange(filters);
    setOpen(false);
  };

  const handleResetFilters = () => {
    const resetFilters: BlogFilterValues = {
      title: '',
      authorId: 'all',
      published: 'all',
      tags: '',
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const hasActiveFilters = 
    filters.title !== '' || 
    filters.authorId !== 'all' ||
    filters.published !== 'all' ||
    filters.tags !== '';

  const activeFiltersCount = 
    (filters.title ? 1 : 0) + 
    (filters.authorId !== 'all' ? 1 : 0) +
    (filters.published !== 'all' ? 1 : 0) +
    (filters.tags ? 1 : 0);

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
          <DialogTitle>Filter Blogs</DialogTitle>
          <DialogDescription>
            Apply filters to find specific blogs in your list.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Search by title..."
              value={filters.title}
              onChange={(e) =>
                setFilters({ ...filters, title: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="Search by tag..."
              value={filters.tags}
              onChange={(e) =>
                setFilters({ ...filters, tags: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="published">Published Status</Label>
            <Select
              value={filters.published}
              onValueChange={(value) =>
                setFilters({ ...filters, published: value })
              }
            >
              <SelectTrigger id="published">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Published</SelectItem>
                <SelectItem value="false">Draft</SelectItem>
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
