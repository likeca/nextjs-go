# GitHub Issues Created - QA Audit

**Date**: January 26, 2025  
**Repository**: [habibjutt/nextjs_boilerplate](https://github.com/habibjutt/nextjs_boilerplate)  
**Total Issues Created**: 29

---

## 📋 Issue Summary by Severity

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 **CRITICAL** | 4 | Needs immediate attention |
| 🟠 **HIGH** | 3 | Important for security |
| 🟡 **MEDIUM** | 13 | Should be addressed soon |
| 🟢 **LOW** | 9 | Nice-to-have improvements |

---

## 🔴 CRITICAL Issues (Immediate Action Required)

### Security Vulnerabilities

| # | Issue | Description | Priority |
|---|-------|-------------|----------|
| [#85](https://github.com/habibjutt/nextjs_boilerplate/issues/85) | **Production credentials in .env** | Database, SMTP, Stripe keys exposed in git | 🚨 URGENT |
| [#86](https://github.com/habibjutt/nextjs_boilerplate/issues/86) | **Email change without verification** | Account takeover vulnerability | 🚨 URGENT |
| [#87](https://github.com/habibjutt/nextjs_boilerplate/issues/87) | **Stored XSS in blog display** | Blog content rendered without sanitization | 🚨 URGENT |
| [#88](https://github.com/habibjutt/nextjs_boilerplate/issues/88) | **Permission API has no auth** | `/api/auth/check-permission` allows enumeration | 🚨 URGENT |

### Immediate Actions Required:
1. **Remove `.env` from git**: `git rm --cached .env && git commit && git push --force`
2. **Rotate all credentials**: Database, SMTP, Stripe, auth secrets, admin password
3. **Install DOMPurify**: `npm install isomorphic-dompurify` and sanitize blog content
4. **Add auth check** to permission API endpoint

---

## 🟠 HIGH Priority Issues

| # | Issue | Description | Impact |
|---|-------|-------------|--------|
| [#89](https://github.com/habibjutt/nextjs_boilerplate/issues/89) | **IDOR in admin user edit** | Can potentially edit unauthorized users | Data access |
| [#90](https://github.com/habibjutt/nextjs_boilerplate/issues/90) | **Payment amounts not validated** | Server-side validation missing in webhooks | Financial |

---

## 🟡 MEDIUM Priority Issues

### Security & API

| # | Issue | Category |
|---|-------|----------|
| [#92](https://github.com/habibjutt/nextjs_boilerplate/issues/92) | Missing CAPTCHA on contact form | Security |
| [#97](https://github.com/habibjutt/nextjs_boilerplate/issues/97) | Organization API missing Zod validation | API Security |
| [#93](https://github.com/habibjutt/nextjs_boilerplate/issues/93) | API key endpoint no rate limiting | API Security |
| [#91](https://github.com/habibjutt/nextjs_boilerplate/issues/91) | Stripe webhook empty secret fallback | Payment Security |
| [#96](https://github.com/habibjutt/nextjs_boilerplate/issues/96) | Session fixation documentation | Security Docs |
| [#95](https://github.com/habibjutt/nextjs_boilerplate/issues/95) | CSRF protection documentation | Security Docs |

### Features & UX

| # | Issue | Category |
|---|-------|----------|
| [#94](https://github.com/habibjutt/nextjs_boilerplate/issues/94) | Missing invoice storage | Billing |
| [#107](https://github.com/habibjutt/nextjs_boilerplate/issues/107) | Images missing alt text | Accessibility |
| [#109](https://github.com/habibjutt/nextjs_boilerplate/issues/109) | Missing skip to main content link | Accessibility |
| [#108](https://github.com/habibjutt/nextjs_boilerplate/issues/108) | No custom 500 error page | Error Handling |

### Already Tracked (Not Created - Duplicates)

| # | Issue | Status |
|---|-------|--------|
| #81 | Security headers still missing | OPEN (existing) |
| #18 | No OAuth social login | OPEN (existing) |
| #76 | 404 returns HTTP 500 | OPEN (existing) |
| #78 | HTTP 500 errors on all pages | OPEN (existing) |
| #80 | Missing H1 headings | OPEN (existing) |
| #83 | Mobile hamburger menu not found | OPEN (existing) |

---

## 🟢 LOW Priority Issues (Enhancements)

### Maintenance & Operations

| # | Issue | Category |
|---|-------|----------|
| [#99](https://github.com/habibjutt/nextjs_boilerplate/issues/99) | Dependency versions not pinned | Maintenance |
| [#102](https://github.com/habibjutt/nextjs_boilerplate/issues/102) | Missing npm audit script | Security Ops |
| [#112](https://github.com/habibjutt/nextjs_boilerplate/issues/112) | No Sentry error tracking | Monitoring |

### UX & Features

| # | Issue | Category |
|---|-------|----------|
| [#98](https://github.com/habibjutt/nextjs_boilerplate/issues/98) | No proration for subscription changes | Billing |
| [#101](https://github.com/habibjutt/nextjs_boilerplate/issues/101) | Empty states missing illustrations | UI/UX |
| [#100](https://github.com/habibjutt/nextjs_boilerplate/issues/100) | Inconsistent loading skeletons | UI/UX |
| [#104](https://github.com/habibjutt/nextjs_boilerplate/issues/104) | Missing keyboard shortcuts | UX |
| [#103](https://github.com/habibjutt/nextjs_boilerplate/issues/103) | No command palette (⌘K) | UX |
| [#111](https://github.com/habibjutt/nextjs_boilerplate/issues/111) | No onboarding flow | UX |
| [#110](https://github.com/habibjutt/nextjs_boilerplate/issues/110) | No welcome email after signup | Communication |
| [#106](https://github.com/habibjutt/nextjs_boilerplate/issues/106) | Dark mode toggle not in navigation | UI |

### Testing

| # | Issue | Category |
|---|-------|----------|
| [#113](https://github.com/habibjutt/nextjs_boilerplate/issues/113) | No unit tests | Testing |
| [#105](https://github.com/habibjutt/nextjs_boilerplate/issues/105) | No E2E tests with Playwright | Testing |

---

## 🎯 Recommended Prioritization

### **Week 1: Critical Security Fixes**
1. ✅ Fix #85 - Remove credentials from git
2. ✅ Fix #87 - XSS vulnerability in blog
3. ✅ Fix #88 - Permission API authentication
4. ✅ Fix #86 - Email change verification
5. ✅ Address existing #81 - Security headers

**Estimated Effort**: 8-12 hours  
**Impact**: Prevents critical vulnerabilities

---

### **Week 2: High Priority Security & Existing Issues**
1. ✅ Fix #89 - IDOR vulnerability
2. ✅ Fix #90 - Payment validation
3. ✅ Address existing #78 - HTTP 500 errors (critical bug)
4. ✅ Address existing #76 - 404 page returns 500
5. ✅ Address existing #18 - OAuth social login

**Estimated Effort**: 12-16 hours  
**Impact**: Major security improvements + fixes existing blockers

---

### **Week 3: Medium Priority Features**
1. ✅ Fix #92 - CAPTCHA on contact form
2. ✅ Fix #94 - Invoice storage
3. ✅ Fix #97 - API validation
4. ✅ Fix #93 - Rate limiting
5. ✅ Address existing #80 - H1 headings (accessibility)
6. ✅ Address existing #83 - Mobile menu

**Estimated Effort**: 10-14 hours  
**Impact**: Improves security, compliance, and UX

---

### **Week 4: Low Priority Enhancements**
1. ✅ Fix #112 - Sentry integration
2. ✅ Fix #113 - Unit tests (critical functions)
3. ✅ Fix #105 - E2E tests
4. ✅ Fix #107, #109 - Accessibility improvements
5. ✅ Fix #108 - Custom error pages

**Estimated Effort**: 16-20 hours  
**Impact**: Production readiness and monitoring

---

### **Month 2: Polish & Nice-to-Haves**
1. ✅ UX improvements (#100, #101, #103, #104, #106)
2. ✅ Onboarding flow (#111)
3. ✅ Welcome email (#110)
4. ✅ Proration handling (#98)
5. ✅ Maintenance items (#99, #102)

**Estimated Effort**: 20-25 hours  
**Impact**: User engagement and satisfaction

---

## 📊 Progress Tracking

### By Category

| Category | Total Issues | Critical | High | Medium | Low |
|----------|-------------|----------|------|--------|-----|
| **Security** | 11 | 4 | 2 | 5 | 0 |
| **Features** | 6 | 0 | 0 | 1 | 5 |
| **UX/UI** | 5 | 0 | 0 | 1 | 4 |
| **Accessibility** | 3 | 0 | 0 | 2 | 1 |
| **Testing** | 2 | 0 | 0 | 0 | 2 |
| **Maintenance** | 2 | 0 | 0 | 0 | 2 |

### By Label

Issues are labeled with:
- `security` - Security vulnerabilities and improvements
- `critical` - Needs immediate attention
- `bug` - Broken functionality
- `feature` - New functionality
- `enhancement` - Improvements to existing features
- `ui` - User interface issues
- `accessibility` / `a11y` - Accessibility improvements
- `payment` - Billing/payment related
- `api` - API-related issues
- `testing` - Test coverage
- `documentation` - Documentation needs
- `maintenance` - Code maintenance and dependencies
- `monitoring` - Observability and error tracking

---

## 🔗 Quick Links

### Critical Issues (Fix First)
- [#85 - Credentials in .env](https://github.com/habibjutt/nextjs_boilerplate/issues/85) 🚨
- [#86 - Email change vulnerability](https://github.com/habibjutt/nextjs_boilerplate/issues/86) 🚨
- [#87 - XSS in blog](https://github.com/habibjutt/nextjs_boilerplate/issues/87) 🚨
- [#88 - Permission API auth](https://github.com/habibjutt/nextjs_boilerplate/issues/88) 🚨

### Existing Critical Issues
- [#78 - HTTP 500 errors](https://github.com/habibjutt/nextjs_boilerplate/issues/78) ⚠️
- [#81 - Security headers](https://github.com/habibjutt/nextjs_boilerplate/issues/81) ⚠️

### All New Issues
View all created issues: [Filter by audit label](https://github.com/habibjutt/nextjs_boilerplate/issues?q=is%3Aissue+is%3Aopen)

---

## 📝 Notes

### Issue Format
All issues include:
- ✅ Clear description of the problem
- ✅ Location (file paths and line numbers)
- ✅ Exploitation/impact scenario
- ✅ Recommended fix with code examples
- ✅ Acceptance criteria checklist
- ✅ Severity rating
- ✅ References to relevant docs/standards

### Labels Applied
- All issues have appropriate labels (security, bug, feature, etc.)
- Severity indicated by emoji in title and label
- Related issues are cross-referenced

### Duplicate Avoidance
Before creation, checked for existing issues:
- #18 (OAuth) - Already exists, not duplicated
- #22 (Security headers) - Closed, but #81 tracks regression
- #76 (404 page) - Already exists
- #78 (HTTP 500) - Already exists
- #80 (Missing H1) - Already exists
- #83 (Mobile menu) - Already exists

### Total Audit Findings
- **29 new issues created**
- **6 existing issues identified**
- **35 total findings** from comprehensive audit

---

## 🎯 Success Metrics

### Production Readiness Checklist
- [ ] All CRITICAL issues resolved (4 issues)
- [ ] All HIGH issues resolved (3 issues)
- [ ] Security headers implemented (#81)
- [ ] HTTP 500 errors fixed (#78)
- [ ] OAuth implemented (#18)
- [ ] 80%+ test coverage (#113, #105)
- [ ] Error tracking enabled (#112)
- [ ] All accessibility issues resolved
- [ ] Third-party security audit completed

### Target Timeline
- **Week 1**: Critical security fixes ✅
- **Week 2**: High priority + existing blockers ✅
- **Week 3**: Medium priority features ✅
- **Week 4**: Testing & monitoring ✅
- **Month 2**: Polish & enhancements ✅

**Estimated Total Effort**: 70-85 hours (2-3 weeks of focused development)

---

## 📞 Next Steps

1. **Review all CRITICAL issues** with the team
2. **Assign owners** to each issue
3. **Set deadlines** for critical fixes (Week 1)
4. **Create a project board** in GitHub for tracking
5. **Schedule daily standup** during critical fix period
6. **Plan security review** after critical fixes
7. **Schedule follow-up audit** after all fixes

---

**Report Generated**: January 26, 2025  
**Auditor**: Senior QA Engineer & Frontend Design Auditor  
**Repository**: habibjutt/nextjs_boilerplate

For questions about specific issues, comment on the issue in GitHub or reference this document.
