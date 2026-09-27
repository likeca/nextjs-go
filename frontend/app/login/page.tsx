import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/logo';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { LoginForm } from '@/components/login-form';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Sign In',
  description: 'Sign in to your account to access your dashboard, manage your subscription, and more.',
  path: '/login',
  keywords: ['sign in', 'login', 'account access'],
  noIndex: true,
});

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="bg-muted flex flex-1 flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <h1 className="sr-only">Sign in to your account</h1>
          <Logo className="self-center" />
          <LoginForm recaptchaSiteKey={process.env.GOOGLE_RECAPTCHA_SITE_KEY ?? ''} />
        </div>
      </div>
      <Footer />
    </div>
  );
}
