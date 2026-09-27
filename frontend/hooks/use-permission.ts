'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkPermissionAction } from '@/lib/check-permission';

/**
 * Hook to check permissions on client-side pages
 * Redirects to /login if not authenticated or /unauthorized if no permission
 * 
 * @param resource - The resource to check (e.g., 'admin', 'offer', 'yacht')
 * @param action - The action to check (e.g., 'create', 'update', 'delete', 'read')
 * @returns Object with loading state and permission status
 */
export function usePermission(resource: string, action: string) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    async function checkPermission() {
      try {
        const result = await checkPermissionAction(resource, action);
        
        if (!result.isAuthenticated) {
          router.push('/login');
          return;
        }
        
        if (!result.hasPermission) {
          router.push('/unauthorized');
          return;
        }
        
        setHasPermission(true);
      } catch (error) {
        console.error('Permission check failed:', error);
        router.push('/unauthorized');
      } finally {
        setIsLoading(false);
      }
    }

    checkPermission();
  }, [resource, action, router]);

  return { isLoading, hasPermission };
}
