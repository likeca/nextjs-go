import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "What\u2019s included in this boilerplate?",
    answer: "Authentication (email/password, OTP, social login), Stripe payments, role-based access control, admin dashboard, blog CMS, email templates, and much more. Everything you need to launch a SaaS product.",
  },
  {
    question: "Can I use this for commercial projects?",
    answer: "Yes! This boilerplate is designed for commercial SaaS products. You own the code and can use it however you like.",
  },
  {
    question: "How do I customize the branding?",
    answer: "Update the .env file with your app name and URL. All branding references use the central config, so changing it in one place updates the entire app.",
  },
  {
    question: "Does it support multiple pricing plans?",
    answer: "Yes. The Stripe integration supports multiple plans with different features. You can configure your plans in the Stripe dashboard and they\u2019ll automatically appear in the pricing section.",
  },
  {
    question: "Is there admin support?",
    answer: "Yes, there\u2019s a full admin panel with user management, role/permission editor, blog management, and application settings \u2014 all accessible to admin users.",
  },
  {
    question: "What database is supported?",
    answer: "PostgreSQL via Prisma ORM. The Prisma adapter makes it easy to switch to other databases if needed.",
  },
]

export function FaqSection() {
  return (
    <section className="py-20 bg-muted/40" id="faq">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-14 animate-fade-in-up">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-muted-foreground">
            Can&apos;t find the answer you&apos;re looking for? Reach out to our support team.
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full space-y-3">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4 transition-colors">
              <AccordionTrigger className="text-left hover:no-underline">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
