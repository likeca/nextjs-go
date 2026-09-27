# Contributing to Next.js SaaS Boilerplate

First off, thank you for considering contributing! 🎉 Every contribution helps make this project better for everyone.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guide](#style-guide)
- [Commit Messages](#commit-messages)

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold respectful, inclusive behavior. Please report unacceptable behavior to [habibjutt868@gmail.com](mailto:habibjutt868@gmail.com).

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating a bug report, please check if the issue already exists. When filing a bug report, include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots (if applicable)
- Your environment (OS, Node.js version, browser)

### 💡 Suggesting Features

Feature requests are welcome! Please provide:

- A clear description of the feature
- Why it would be useful
- Any implementation ideas you have

### 🔧 Code Contributions

1. Look for issues tagged `good first issue` or `help wanted`
2. Comment on the issue to let others know you're working on it
3. Fork the repository and create a feature branch
4. Write your code and tests
5. Submit a pull request

## Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Stripe account (for payment features)

### Getting Started

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/nextjs_boilerplate.git
cd nextjs_boilerplate

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Set up your database
npx prisma generate
npx prisma db push

# Start the development server
npm run dev
```

### Project Structure

```
app/           → Pages and routes (Next.js App Router)
components/    → Reusable React components
lib/           → Core utilities, auth, payments, email
actions/       → Server actions for data mutations
hooks/         → Custom React hooks
types/         → TypeScript type definitions
prisma/        → Database schema and migrations
scripts/       → CLI utilities and setup scripts
public/        → Static assets
```

## Pull Request Process

1. **Fork** the repository and create your branch from `main`
2. **Name your branch** descriptively: `feature/add-webhook-retry` or `fix/login-redirect`
3. **Make your changes** with clear, focused commits
4. **Test** your changes thoroughly
5. **Update documentation** if you've changed APIs or added features
6. **Submit** a pull request with a clear description

### PR Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have tested my changes locally
- [ ] I have updated relevant documentation
- [ ] My changes don't break existing functionality
- [ ] I have added types for new TypeScript code

## Style Guide

### TypeScript

- Use `const` for function declarations: `const handleClick = () => {}`
- Use early returns for cleaner code
- Add proper TypeScript types — avoid `any`
- Use Zod for runtime validation

### React / Next.js

- Prefer Server Components (RSC) over Client Components
- Use `'use client'` only when necessary
- Minimize `useEffect` and `useState` usage
- Use Server Actions for data mutations

### Styling

- Use Tailwind CSS utility classes exclusively
- Follow mobile-first responsive design
- Use shadcn/ui components for consistency
- Support dark mode in all components

### File Naming

- Components: `PascalCase.tsx` (e.g., `LoginForm.tsx`)
- Utilities: `kebab-case.ts` (e.g., `email-service.ts`)
- Types: `kebab-case.ts` in the `types/` directory
- Server Actions: `kebab-case.ts` in the `actions/` directory

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add webhook retry logic
fix: resolve login redirect issue
docs: update API documentation
style: format code with prettier
refactor: simplify auth middleware
test: add unit tests for email service
chore: update dependencies
```

## 🙏 Thank You

Your contributions make open source amazing. Thank you for being part of it!
