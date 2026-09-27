'use server';

import { serverTry } from '@/lib/api/server';

export type PublicSettings = {
  companyName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  businessHours: string;
  googleMapsUrl: string;
  whatsappNumber: string;
  footerText: string;
  meta: string;
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  tiktok: string;
};

export async function getPublicSettings(): Promise<
  { success: true; data: PublicSettings } | { error: string }
> {
  const res = await serverTry<{ success: boolean; data: PublicSettings }>(
    '/api/settings/public/',
  );
  if ('error' in res) {
    return { error: 'Failed to fetch settings' };
  }
  return { success: true, data: res.data.data };
}
