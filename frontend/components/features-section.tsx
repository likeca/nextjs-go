import { ShieldCheck, Zap, CreditCard, Users, Code2, BarChart3 } from "lucide-react"

const features = [
  {
    icon: ShieldCheck,
    title: "Authentication Built-in",
    description: "Email/password, OTP verification, and social login. Enterprise-grade security from day one.",
  },
  {
    icon: CreditCard,
    title: "Payments Ready",
    description: "Stripe integration with subscription management, webhook handling, and billing portal.",
  },
  {
    icon: Zap,
    title: "Blazing Fast",
    description: "Built on Next.js 16 with React 19 and Turbopack. Server components and optimized rendering.",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description: "Full RBAC system with roles, permissions, and admin panel for team management.",
  },
  {
    icon: Code2,
    title: "TypeScript First",
    description: "Fully typed codebase with Prisma ORM, Zod validation, and type-safe API routes.",
  },
  {
    icon: BarChart3,
    title: "Admin Dashboard",
    description: "Pre-built admin dashboard with user management, analytics, and content management.",
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 border-t" id="features">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 animate-fade-in-up">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to launch
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Stop reinventing the wheel. Our boilerplate includes all the essential features for a production-ready SaaS.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="rounded-lg border bg-card p-6 hover:shadow-sm transition-shadow animate-fade-in-up"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground mb-4">
                <feature.icon className="h-5 w-5 text-background" />
              </div>
              <h3 className="font-semibold mb-1.5">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
