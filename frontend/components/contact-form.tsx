'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { submitContact } from '@/actions/contact/submit-contact';
import { Send, CheckCircle2 } from 'lucide-react';

const contactSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phoneNumber: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type FormErrors = Partial<Record<keyof z.infer<typeof contactSchema>, string>>;

type FormState = {
  fullName: string;
  email: string;
  phoneNumber: string;
  message: string;
};

const initialState: FormState = {
  fullName: '',
  email: '',
  phoneNumber: '',
  message: '',
};

export function ContactForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const validation = contactSchema.safeParse({
      ...form,
      phoneNumber: form.phoneNumber || undefined,
    });

    if (!validation.success) {
      const fieldErrors: FormErrors = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormErrors;
        if (field) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const result = await submitContact({
        ...validation.data,
        phoneNumber: form.phoneNumber || undefined,
      });

      if ('error' in result) {
        toast.error(result.error);
        return;
      }

      setSubmitted(true);
      toast.success('Message sent successfully!');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
          <h3 className="text-2xl font-semibold">Message Sent!</h3>
          <p className="text-muted-foreground max-w-sm">
            Thank you for reaching out. We&apos;ve received your message and will get back to you as soon as possible.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSubmitted(false);
              setForm(initialState);
            }}
          >
            Send Another Message
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send us a Message</CardTitle>
        <CardDescription>
          Fill out the form below and we&apos;ll get back to you within 24 hours.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName" className={errors.fullName ? 'text-destructive' : ''}>
                Full Name <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="John Doe"
                value={form.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                disabled={isLoading}
                aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              />
              {errors.fullName && (
                <p id="fullName-error" className="text-sm text-destructive">
                  {errors.fullName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className={errors.email ? 'text-destructive' : ''}>
                Email Address <span aria-hidden="true">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={isLoading}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number (optional)</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={form.phoneNumber}
              onChange={(e) => handleChange('phoneNumber', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className={errors.message ? 'text-destructive' : ''}>
              Message <span aria-hidden="true">*</span>
            </Label>
            <Textarea
              id="message"
              name="message"
              placeholder="Tell us how we can help you..."
              rows={5}
              value={form.message}
              onChange={(e) => handleChange('message', e.target.value)}
              disabled={isLoading}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? 'message-error' : undefined}
            />
            {errors.message && (
              <p id="message-error" className="text-sm text-destructive">
                {errors.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? (
              'Sending...'
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
