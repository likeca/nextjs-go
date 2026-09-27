'use server';

import { z } from 'zod';

import { serverTry } from '@/lib/api/server';

const contactSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phoneNumber: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export type ContactFormData = z.infer<typeof contactSchema>;

export async function submitContact(
  formData: ContactFormData,
): Promise<{ success: true } | { error: string }> {
  const parsed = contactSchema.safeParse(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid form data' };
  }

  // Persistence + email notification happen on the Django backend
  // (core.ContactSubmissionViewSet captures IP and emails the admin).
  const res = await serverTry('/api/contact/', {
    method: 'POST',
    body: parsed.data,
  });

  if ('error' in res) {
    return { error: 'Failed to send your message. Please try again later.' };
  }
  return { success: true };
}
