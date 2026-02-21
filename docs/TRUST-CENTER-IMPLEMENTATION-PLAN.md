# CEI Trust Center - Final Implementation Plan

**Date:** 2026-02-21  
**Status:** Ready for Engineering  
**Based On:** Original design + Codex meta-review feedback incorporated  
**Timeline:** 6 weeks (Phase 2.5 - interactive from day 1)  
**Budget:** $30-40K engineering time  

---

## Executive Summary

This is the final implementation plan for CEI's trust center, incorporating all feedback from the meta-review process. **Key changes from original design:**

1. ✅ **Skip MVP** - Start at Phase 2.5 (interactive from day 1)
2. ✅ **Use vis.js** instead of Cytoscape.js (lighter, sufficient)
3. ✅ **Flatten Level 3** - Single scrollable page, not 5 tabs
4. ✅ **Add data pipeline** - Auto-generate from CI/CD
5. ✅ **Add intermediate page** - "Security for Technical Leaders"
6. ✅ **Include versioning** - Track security posture over time
7. ✅ **Framer Motion from day 1** - Essential for polish

**Positioning:** Security Architecture as sub-page under Security section  
**URL:** `trust.cei.example.com/security/architecture`  
**Differentiator:** Most technically transparent trust center in the industry

---

## 1. Trust Center Structure (8 Sections + 1 Addition)

```
Trust Center (trust.cei.example.com)
│
├── 📊 Overview
│   ├── Trust badges (SOC 2, ISO 27001)
│   ├── Uptime stats (99.9% SLA)
│   ├── Recent updates
│   └── Quick nav to all sections
│
├── 🔒 Security
│   ├── Security Overview (high-level commitments)
│   ├── Security for Technical Leaders ← NEW (IT Directors, PMs)
│   ├── Security Architecture ← OUR DEEP DIVE
│   ├── Data Protection
│   ├── Incident Response
│   └── Penetration Testing
│
├── ✅ Compliance & Certifications
│   ├── SOC 2 Type II
│   ├── ISO 27001
│   ├── GDPR compliance
│   └── Audit reports
│
├── 🔐 Privacy
│   ├── Privacy Policy
│   ├── Data Processing Agreement
│   ├── Data Subject Rights
│   └── Sub-processors
│
├── 🌍 Infrastructure
│   ├── Data Center Locations
│   ├── Availability Zones
│   ├── Network Architecture
│   └── Disaster Recovery
│
├── 📈 Cloud Status
│   ├── Real-time service health
│   ├── Uptime history
│   ├── Scheduled maintenance
│   └── Incident postmortems
│
├── 📄 Agreements & Legal
│   ├── Terms of Service
│   ├── Service Level Agreement
│   ├── DPA
│   └── AI commitments
│
├── 📚 Resources
│   ├── Security whitepapers
│   ├── Compliance documentation
│   ├── Pre-filled questionnaire
│   └── Pen test summaries
│
└── 🎯 Customer Success Stories ← NEW
    ├── Security implementations
    ├── Case studies
    └── Testimonials
```

---

## 2. Security Architecture Page (Our Deep Dive)

### 2.1 Information Architecture (3 Levels)

**Level 1: STRIDE Category Overview**
- Interactive hexagon visualization (D3.js or nivo)
- 6 categories with color-coded status
- Click category → navigate to Level 2

**Level 2: Control List**
- Filterable/searchable list of controls
- Status badges (✅ Secure, 🟡 In Progress, 🔴 At Risk, 🔵 Non-Gap)
- Priority tags
- Repo badges (cei-ui, cei-agent, both)
- Quick actions (expand inline, view full detail)

**Level 3: Control Deep Dive** ⭐ REVISED
- **Single scrollable page** (not 5 tabs)
- Sections with expand/collapse:
  - Overview (always visible)
  - [Expand: Implementation ▼]
  - [Expand: Verification ▼]
  - Gap Details or Non-Gap Explanation (always visible)
  - [Expand: Version History ▼] ← NEW

**Navigation:**
- Breadcrumbs: `Trust Center > Security > Security Architecture > Spoofing > JWT Revocation`
- Back button, permalink, share button

### 2.2 Status System

```typescript
type SecurityStatus = 
  | 'secure'           // ✅ Implemented + verified
  | 'in-progress'      // 🟡 Remediation underway (% complete)
  | 'at-risk'          // 🔴 Known vulnerability, not fixed
  | 'non-gap'          // 🔵 Looks vulnerable but isn't
  | 'not-applicable'   // ⚪ Control not relevant
```

### 2.3 Data Model (Revised)

```typescript
interface SecurityControl {
  // Identity
  id: string                     // 'cei-auth-001'
  category: STRIDECategory       // 'Spoofing'
  subcategory: string            // 'JWT Validation'
  name: string                   // 'Cognito JWT Authentication'
  
  // Scope
  repos: Array<'cei-ui' | 'cei-agent'>
  components: string[]           // ['AuthProvider', 'CustomJWTAuthorizer']
  
  // Status
  status: SecurityStatus
  priority: 'critical' | 'high' | 'medium' | 'low'
  
  // Details
  description: string
  threatsMitigated: string[]
  implementation: {
    code: string[]               // File paths
    config: string[]
    infrastructure: string[]
  }
  
  // Verification
  verification: {
    tests: string[]
    lastVerified: Date
    verificationMethod: string
    coverage?: number            // % coverage
  }
  
  // Gap (if at-risk or in-progress)
  gap?: {
    description: string
    exploitScenario: string
    blastRadius: string
    remediation: {
      planId: string
      estimatedHours: number
      assignee: string
      targetDate: Date
      progress: number           // 0-100%
      dependencies: string[]
    }
  }
  
  // Non-Gap Explanation (if non-gap)
  nonGapExplanation?: {
    whyItLooksVulnerable: string
    whyItActuallyIsnt: string
    evidence: string[]
    educationalContext: string
  }
  
  // Version History ← NEW
  history?: Array<{
    date: Date
    status: SecurityStatus
    vulnerabilityCount: number
    verificationResults: unknown
    notes: string
  }>
  
  // Metadata
  addedDate: Date
  lastUpdated: Date
  reviewedBy: string[]
  references: string[]
  
  // Data Source (for auto-generation) ← NEW
  dataSource?: {
    type: 'npm-audit' | 'test-coverage' | 'cloudformation' | 'manual'
    extractionRule?: {
      file?: string
      pattern?: RegExp
      transform?: string         // JS function as string
    }
  }
}
```

---

## 3. Tech Stack (Final)

### 3.1 Core Framework
- **React 18** + **TypeScript** + **Tailwind CSS**
- **Vite** (build tool)
- **React Router** (navigation)

### 3.2 Visualization Libraries

| Library | Purpose | Size | Priority |
|---------|---------|------|----------|
| **React Flow** | Attack chain diagrams, data flows | 200KB | ✅ Day 1 |
| **vis.js** | Network topology (component diagram) | 300KB | ✅ Week 4 |
| **D3.js or nivo** | STRIDE hexagon visualization | 60KB (nivo) / 200KB (D3) | ✅ Day 1 |
| **Recharts** | Progress bars, simple charts | 150KB | ✅ Day 1 |
| **Plotly.js** | Time-series (version history) | 3MB | 🟡 Week 5 (optional) |
| **Framer Motion** | Transitions, animations | 60KB | ✅ Day 1 |

**Recommendation:** Use **nivo over D3** for hexagon (easier React integration, lighter weight).

**Total Bundle Size:** ~710KB (without Plotly) or ~3.7MB (with Plotly)

### 3.3 UI Components
- **Radix UI** - Accessible primitives (tooltips, popovers, accordions)
- **CodeMirror** or **Shiki** - Syntax highlighting for code examples

### 3.4 Not Using (Rejected)
- ❌ Cytoscape.js (too heavy - 900KB, vis.js sufficient)
- ❌ Rive (expensive - $25/month, high dev time)
- ❌ Three.js (3D overkill, adds confusion)
- ❌ Mermaid (static, replaced by React Flow)

---

## 4. Data Pipeline Strategy (Critical Addition)

### 4.1 Auto-Generation from CI/CD

```yaml
# .github/workflows/trust-center-sync.yml
name: Update Trust Center Data

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  generate-controls:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # 1. Run security audits
      - name: Audit cei-agent
        run: |
          cd cei-agent
          npm audit --production --json > /tmp/audit-agent.json
      
      - name: Audit cei-ui
        run: |
          cd cei-ui
          npm audit --production --json > /tmp/audit-ui.json
      
      # 2. Run test coverage
      - name: Coverage cei-agent
        run: |
          cd cei-agent
          npm test -- --coverage --json > /tmp/coverage-agent.json
      
      - name: Coverage cei-ui
        run: |
          cd cei-ui
          npm test -- --coverage --json > /tmp/coverage-ui.json
      
      # 3. Extract CloudFormation security config
      - name: Parse CloudFormation
        run: |
          node scripts/extract-cfn-security.js \
            cei-agent/infra/cloudformation/ \
            > /tmp/cfn-security.json
      
      # 4. Generate controls.json
      - name: Generate trust center data
        run: |
          node scripts/generate-trust-center-data.js \
            --audit-agent /tmp/audit-agent.json \
            --audit-ui /tmp/audit-ui.json \
            --coverage-agent /tmp/coverage-agent.json \
            --coverage-ui /tmp/coverage-ui.json \
            --cfn-security /tmp/cfn-security.json \
            --output cei-ui/src/trust-center/data/controls.json \
            --history cei-ui/src/trust-center/data/controls-history.json
      
      # 5. Commit updated data
      - name: Commit changes
        run: |
          cd cei-ui
          git add src/trust-center/data/controls*.json
          git commit -m "chore: update trust center data [skip ci]" || true
          git push
```

### 4.2 Generation Script Structure

```typescript
// scripts/generate-trust-center-data.js
interface GenerationSource {
  auditAgent: NpmAuditOutput
  auditUI: NpmAuditOutput
  coverageAgent: CoverageOutput
  coverageUI: CoverageOutput
  cfnSecurity: CloudFormationSecurityConfig
  existingControls: SecurityControl[]
}

async function generateControls(sources: GenerationSource): Promise<SecurityControl[]> {
  const controls: SecurityControl[] = []
  
  // 1. Dependency security control
  const depControl = generateDependencyControl(sources.auditAgent, sources.auditUI)
  controls.push(depControl)
  
  // 2. Test coverage control
  const testControl = generateTestCoverageControl(sources.coverageAgent, sources.coverageUI)
  controls.push(testControl)
  
  // 3. Infrastructure controls (KMS, IAM, RLS, etc.)
  const infraControls = generateInfraControls(sources.cfnSecurity)
  controls.push(...infraControls)
  
  // 4. Merge with manual controls (non-automatable)
  const manualControls = sources.existingControls.filter(c => c.dataSource?.type === 'manual')
  controls.push(...manualControls)
  
  // 5. Update version history
  updateVersionHistory(controls, sources.existingControls)
  
  return controls
}

function generateDependencyControl(
  agentAudit: NpmAuditOutput,
  uiAudit: NpmAuditOutput
): SecurityControl {
  const agentVulns = Object.values(agentAudit.vulnerabilities || {})
  const uiVulns = Object.values(uiAudit.vulnerabilities || {})
  
  const criticalCount = [...agentVulns, ...uiVulns].filter(v => v.severity === 'critical').length
  const highCount = [...agentVulns, ...uiVulns].filter(v => v.severity === 'high').length
  
  return {
    id: 'cei-dep-001',
    category: 'Tampering',
    subcategory: 'Dependency Security',
    name: 'Dependency Vulnerability Management',
    repos: ['cei-ui', 'cei-agent'],
    status: criticalCount > 0 || highCount > 5 ? 'at-risk' : 'secure',
    priority: criticalCount > 0 ? 'critical' : 'high',
    description: 'Automated scanning and patching of dependency vulnerabilities',
    gap: criticalCount > 0 || highCount > 5 ? {
      description: `${criticalCount} critical and ${highCount} high severity vulnerabilities`,
      exploitScenario: 'See npm audit report for details',
      blastRadius: 'Varies by vulnerability',
      remediation: {
        planId: 'remediation-1.1',
        estimatedHours: 8,
        assignee: 'Dev Team',
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        progress: 0,
        dependencies: []
      }
    } : undefined,
    verification: {
      tests: [],
      lastVerified: new Date(),
      verificationMethod: 'npm audit --production'
    },
    dataSource: {
      type: 'npm-audit',
      extractionRule: {
        file: 'audit-*.json'
      }
    },
    addedDate: new Date(),
    lastUpdated: new Date(),
    reviewedBy: ['CI/CD'],
    references: ['https://docs.npmjs.com/cli/v8/commands/npm-audit']
  }
}
```

### 4.3 Failure Handling

```typescript
// If critical vulnerabilities detected, what happens?

// Option A: Block deployment (strict)
if (criticalCount > 0) {
  console.error('Critical vulnerabilities detected. Blocking deployment.')
  process.exit(1)
}

// Option B: Update status but allow deployment (our choice)
if (criticalCount > 0) {
  console.warn('Critical vulnerabilities detected. Updating trust center status.')
  // Trust center shows red status, but app still deploys
  // Alerts sent to security team
}

// Option C: Grace period (production recommendation)
const lastCriticalDate = getLastCriticalVulnDate()
const gracePeriodDays = 7

if (criticalCount > 0 && Date.now() - lastCriticalDate > gracePeriodDays * 24 * 60 * 60 * 1000) {
  console.error('Critical vulnerabilities unresolved for >7 days. Blocking deployment.')
  process.exit(1)
} else if (criticalCount > 0) {
  console.warn(`Critical vulnerabilities detected. Grace period: ${gracePeriodDays} days.`)
}
```

**Recommendation:** Use **Option C** (grace period) for production.

---

## 5. Implementation Timeline (6 Weeks)

### Week 1-2: Foundation
**Goal:** Core structure + data model

**Tasks:**
- [ ] Set up trust center routing (`/trust-center/*`)
- [ ] Create 8 top-level section pages (placeholder content)
- [ ] Implement data model (TypeScript interfaces)
- [ ] Set up state management (React Context or Zustand)
- [ ] Create initial controls.json (manual, 10-15 controls)
- [ ] Build breadcrumb navigation
- [ ] Mobile-responsive layout (desktop-first)

**Deliverable:** Navigable trust center shell with placeholder content

### Week 3: Interactive Visualizations (Part 1)
**Goal:** STRIDE hexagon + attack chains

**Tasks:**
- [ ] Implement STRIDE hexagon (nivo or D3)
  - Click category → navigate to control list
  - Color-code by worst-case status
  - Hover → tooltip with stats
- [ ] Build React Flow attack chain diagrams
  - Custom node types (entry point, exploit, impact)
  - Animated path highlighting
  - Click node → show control details
- [ ] Create Level 1 category overview cards
- [ ] Framer Motion transitions (status changes, expansions)

**Deliverable:** Interactive STRIDE hexagon + sample attack chain

### Week 4: Control Details + Network Topology
**Goal:** Level 2/3 + vis.js network

**Tasks:**
- [ ] Build Level 2 control list
  - Filter by status, priority, repo
  - Search by name
  - Inline expand (quick view)
- [ ] Build Level 3 control detail page
  - Single scrollable layout (not tabs)
  - Expand/collapse sections
  - Code syntax highlighting
- [ ] Implement vis.js network topology
  - Component nodes (UI, Gateway, Agent, Aurora, etc.)
  - Threat-annotated edges
  - Click node → filter controls
- [ ] Non-gap explanation template

**Deliverable:** Full 3-level navigation + network diagram

### Week 5: Data Pipeline + Polish
**Goal:** CI/CD integration + time-series

**Tasks:**
- [ ] Write data generation script (`generate-trust-center-data.js`)
- [ ] Implement GitHub Actions workflow
- [ ] Add version history to data model
- [ ] Build time-series chart (Recharts or Plotly)
  - Security score over time
  - Vulnerability count trend
  - Hover for details
- [ ] Add verification test integration
  - Show test results in control details
  - Link to test files in GitHub
- [ ] Polish UI (icons, spacing, colors)

**Deliverable:** Auto-updating trust center + historical trends

### Week 6: Testing + Launch
**Goal:** Production-ready

**Tasks:**
- [ ] User testing with 5 technical stakeholders
  - CISOs, security engineers, IT directors
  - Collect feedback on UX, clarity, completeness
- [ ] Accessibility audit (keyboard nav, screen readers)
- [ ] Performance optimization
  - Code splitting
  - Lazy loading (defer vis.js, Plotly until needed)
  - Image optimization
- [ ] SEO optimization (meta tags, structured data)
- [ ] Documentation
  - README for trust center
  - Contributing guide (how to add controls manually)
- [ ] Launch 🚀

**Deliverable:** Public trust center at `trust.cei.example.com`

---

## 6. Mobile Strategy

### 6.1 Responsive Breakpoints

```css
/* Tailwind breakpoints */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet portrait */
lg: 1024px  /* Tablet landscape / small laptop */
xl: 1280px  /* Desktop */
2xl: 1536px /* Large desktop */
```

### 6.2 Mobile Adaptations

| Component | Desktop | Mobile |
|-----------|---------|--------|
| **STRIDE Hexagon** | Interactive SVG (drag, zoom) | Static image + tap to navigate |
| **React Flow Attack Chain** | Full interactive diagram | Simplified linear flow |
| **vis.js Network** | Full network topology | Static image with "View on Desktop" prompt |
| **Control List** | 3-column layout | Single column, condensed cards |
| **Control Detail (Level 3)** | Side-by-side tabs | Stacked sections, expand/collapse |
| **Code Examples** | Full syntax highlighting | Truncated with "View Full Code" button |

### 6.3 Progressive Enhancement

```typescript
// Detect device capabilities
const isTouch = 'ontouchstart' in window
const isMobile = window.innerWidth < 768
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Conditionally load heavy libraries
if (!isMobile) {
  import('vis-network').then(vis => {
    // Render network topology
  })
} else {
  // Show static image
}

// Disable animations if user prefers
if (prefersReducedMotion) {
  disableFramerMotionAnimations()
}
```

### 6.4 Mobile Performance

- Lazy load visualizations (defer until scroll)
- Reduce animation complexity on mobile
- Use Intersection Observer for conditional rendering
- Compress static images (WebP with fallback)

**Target:** < 3s load time on 3G connection

---

## 7. "Security for Technical Leaders" Page (New Addition)

### 7.1 Audience
- **Primary:** IT Directors, Product Managers, Technical Architects
- **Need:** More detail than executives, less depth than security engineers
- **Goal:** Understand security approach without needing STRIDE expertise

### 7.2 Content

**Section 1: Architecture Overview**
- High-level component diagram (no attack vectors)
- Trust boundaries (untrusted, trusted, external)
- Data flow summary

**Section 2: Security Principles**
- Defense in depth
- Least privilege
- Zero trust
- Encryption everywhere

**Section 3: Key Controls (10-12 highlights)**
- Presented as cards, not detailed list
- Focus on outcomes ("JWT authentication prevents unauthorized access") not implementation
- Link to deep dive for each

**Section 4: Compliance Summary**
- SOC 2 Type II (status, last audit date)
- ISO 27001 (certificate)
- GDPR compliance
- Industry-specific (if applicable)

**Section 5: Incident Response**
- How we detect incidents
- Response timeline (RTO/RPO)
- Communication plan

**Section 6: Call to Action**
- "For security engineers: View detailed architecture →"
- "Download security whitepaper"
- "Contact security team"

### 7.3 Visual Design
- Clean, minimal (like Atlassian)
- Icons + short text
- Progress bars for compliance status
- Timeline visualization for incident response

**Estimated Effort:** 1-2 days (mostly content writing, reuse components)

---

## 8. Success Metrics

### 8.1 Engagement Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Unique Visitors** | 500+/month | Google Analytics |
| **Time on Site** | 5+ minutes avg | GA (indicates deep engagement) |
| **Click-Through Rate (Level 1 → 2)** | 70%+ | Track hexagon clicks |
| **Click-Through Rate (Level 2 → 3)** | 40%+ | Track control card clicks |
| **Mobile vs Desktop** | 20% mobile | Device analytics |
| **Bounce Rate** | < 30% | GA |

### 8.2 Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Security Questionnaire Time** | 50% reduction | Track time to complete |
| **Trust Center Usage in Sales** | 80%+ deals | CRM tracking |
| **Customer Confidence Score** | +20% increase | Post-sales survey |
| **Audit Prep Time** | 50% reduction | Internal tracking |
| **PR/Marketing Reach** | 10K+ impressions | Social media, press |

### 8.3 Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Page Load Time (Desktop)** | < 2s | Lighthouse |
| **Page Load Time (Mobile)** | < 3s | Lighthouse |
| **Accessibility Score** | 95+ | Lighthouse |
| **SEO Score** | 90+ | Lighthouse |
| **Uptime** | 99.9% | Status page |
| **Data Freshness** | < 24 hours | CI/CD logs |

### 8.4 Feedback Collection

**Inline Feedback:**
```typescript
// At bottom of each page
<FeedbackWidget
  question="Was this page helpful?"
  options={['Yes', 'No']}
  followUp="What can we improve?"
/>
```

**Quarterly Surveys:**
- Send to 20 customers who viewed trust center
- Ask: Clarity, completeness, trust impact
- NPS score specifically for trust center

---

## 9. Cost Breakdown

### 9.1 Engineering Time

| Phase | Duration | FTEs | Cost (@ $150/hr) |
|-------|----------|------|------------------|
| Foundation | 2 weeks | 1 engineer | $12,000 |
| Visualizations | 2 weeks | 1 engineer | $12,000 |
| Data Pipeline | 1 week | 1 engineer | $6,000 |
| Testing + Launch | 1 week | 1 engineer + QA | $9,000 |
| **Total** | **6 weeks** | **1-1.5 FTEs** | **$39,000** |

### 9.2 Ongoing Costs

| Item | Cost | Frequency |
|------|------|-----------|
| Hosting (Vercel/Netlify) | $20/month | Monthly |
| Domain (trust.cei.example.com) | $12/year | Annually |
| Monitoring (Sentry) | $26/month | Monthly |
| **Total** | **~$500/year** | Ongoing |

### 9.3 ROI Calculation

**Savings:**
- Security questionnaire time: 10 hours → 5 hours (5 hours × $150/hr = $750 per deal)
- Audit prep time: 40 hours → 20 hours (20 hours × $150/hr = $3,000 per audit)
- Sales cycle reduction: 2 weeks → 1.5 weeks (0.5 weeks × deal value = varies)

**Assumptions:**
- 50 deals/year = $37,500 savings on questionnaires
- 2 audits/year = $6,000 savings on prep
- 1% increase in close rate = $50K+ revenue (estimate)

**Payback Period:** 6-8 months

---

## 10. Risks & Mitigations

### 10.1 Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **vis.js insufficient** | Need Cytoscape.js (+1 week) | Low | Prototype in Week 1, validate |
| **Data pipeline fails** | Manual updates required | Medium | Fallback to static JSON, monitor CI/CD |
| **Bundle size too large** | Slow load times | Medium | Code splitting, lazy loading, CDN |
| **Mobile UX poor** | Low mobile usage | Medium | User test early (Week 4) |
| **Auto-generation inaccurate** | Trust center shows wrong status | High | Manual review process, reconciliation |

### 10.2 Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Reveals too much to attackers** | Increased attack surface | Low | Security team review, redaction of specifics |
| **Customers question gaps** | Lost deals | Medium | Emphasize remediation plans, progress tracking |
| **Competitors copy** | Loss of differentiator | High | OK - raises bar for industry, we stay ahead |
| **Maintenance burden** | Stale data, broken links | Medium | Automated CI/CD, quarterly review process |

### 10.3 Mitigation Plan

**For High-Impact Risks:**
1. **Auto-generation inaccuracy**
   - Add manual review step (security team approves before publish)
   - Reconciliation report (compare auto vs manual, flag discrepancies)
   - Test suite for generation script

2. **Customers question gaps**
   - Train sales team on how to discuss gaps
   - Emphasize remediation timeline + progress
   - Offer private deep-dive for concerned customers

---

## 11. Launch Checklist

### Pre-Launch (Week 6)

- [ ] All 8 top-level sections have content (not placeholder)
- [ ] At least 20 controls documented (mix of secure/at-risk/non-gap)
- [ ] Data pipeline tested and producing accurate controls.json
- [ ] Mobile responsive (tested on iPhone, Android, tablet)
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Performance targets met (< 2s desktop, < 3s mobile)
- [ ] SEO optimization (meta tags, structured data, sitemap)
- [ ] Legal review (no proprietary info leaked)
- [ ] Security team review (no attack vectors exposed)

### Launch Day

- [ ] DNS configured (trust.cei.example.com)
- [ ] SSL certificate active
- [ ] Analytics tracking enabled (GA, Sentry)
- [ ] Status page linked
- [ ] Social media announcement drafted
- [ ] Press release (if applicable)
- [ ] Internal team notified (sales, support, engineering)

### Post-Launch (Week 7+)

- [ ] Monitor analytics daily (first week)
- [ ] Collect feedback from first 10 visitors
- [ ] Fix critical bugs within 24 hours
- [ ] Schedule quarterly review (update content, add controls)
- [ ] Set up automated monitoring (uptime, data freshness, broken links)

---

## 12. Next Steps (Immediate Actions)

### For Product Team
1. **Approve budget** ($39K engineering + $500/year hosting)
2. **Assign engineering resources** (1 engineer for 6 weeks)
3. **Set launch date** (6 weeks from kickoff)

### For Engineering Team
1. **Prototype vis.js** (1 day, validate it's sufficient)
2. **Set up repo structure** (`trust-center/` in cei-ui)
3. **Create initial controls.json** (10 controls, manual)
4. **Design data model** (finalize TypeScript interfaces)

### For Security Team
1. **Review control list** (are we missing any?)
2. **Approve non-gap explanations** (technically accurate?)
3. **Define review process** (who approves auto-generated updates?)

### For Design Team
1. **Create visual mockups** (hexagon, control cards, Level 3 layout)
2. **Design mobile layouts** (simplified visualizations)
3. **Icon set for STRIDE categories**

### For Marketing Team
1. **Draft launch announcement** (blog post, social media)
2. **Create demo video** (walkthrough of trust center)
3. **Update sales deck** (include trust center screenshots)

---

## 13. Open Questions

1. **Domain:** Use `trust.cei.example.com` or subdirectory `cei.example.com/trust`?
   - **Recommendation:** Subdomain (cleaner, easier to separate infrastructure)

2. **Authentication:** Public or gated (require sign-in)?
   - **Recommendation:** Public for most content, gated for detailed audit reports

3. **Versioning:** Show historical data for how long? (1 year? 2 years? Forever?)
   - **Recommendation:** 1 year of daily snapshots, 2+ years of monthly

4. **Manual controls:** Who maintains? (Security team? Dedicated owner?)
   - **Recommendation:** Shared ownership (security owns, engineering contributes)

5. **Compliance:** Do we need legal review before publishing?
   - **Recommendation:** Yes, one-time review before launch

---

## Appendix A: Technology Decisions (Final)

| Decision | Chosen | Alternative Considered | Rationale |
|----------|--------|------------------------|-----------|
| **Network topology** | vis.js | Cytoscape.js | Lighter (300KB vs 900KB), sufficient for 10 nodes |
| **Attack chains** | React Flow | Mermaid | Interactive, animated, native React |
| **Hexagon** | nivo | D3.js | Easier React integration, lighter bundle |
| **Charts** | Recharts | Plotly.js | Sufficient for most use cases, lighter |
| **Transitions** | Framer Motion | CSS animations | Better React integration, declarative |
| **Code highlighting** | Shiki | CodeMirror | Lighter, server-side rendering support |
| **Phased rollout** | Phase 2.5 (skip MVP) | Phase 1 → 2 → 3 | Avoid underwhelming first impression |

---

## Appendix B: Example Controls (5 Samples)

### 1. JWT Revocation Check (At Risk)
```json
{
  "id": "cei-auth-002",
  "category": "Spoofing",
  "status": "at-risk",
  "priority": "critical",
  "repos": ["cei-agent"],
  "gap": {
    "description": "No JWT revocation check. Stolen tokens valid until expiry (3600s).",
    "remediation": {
      "estimatedHours": 6,
      "targetDate": "2026-02-28",
      "progress": 0
    }
  }
}
```

### 2. CORS Wildcard (Non-Gap)
```json
{
  "id": "cei-net-001",
  "category": "Tampering",
  "status": "non-gap",
  "priority": "high",
  "repos": ["cei-agent"],
  "nonGapExplanation": {
    "whyItLooksVulnerable": "CORS AllowedOrigins: '*' in dev config",
    "whyItActuallyIsnt": "Bearer tokens in Authorization header not auto-sent cross-origin",
    "evidence": ["Browser security model", "OWASP recommendation for SPAs"]
  }
}
```

### 3. Parameterized SQL Queries (Secure)
```json
{
  "id": "cei-data-001",
  "category": "Tampering",
  "status": "secure",
  "priority": "critical",
  "repos": ["cei-agent"],
  "verification": {
    "tests": ["src/storage/__tests__/relational.test.ts"],
    "lastVerified": "2026-02-21",
    "verificationMethod": "Unit tests + code review"
  }
}
```

### 4. Dependency Scanning (In Progress)
```json
{
  "id": "cei-dep-001",
  "category": "Tampering",
  "status": "in-progress",
  "priority": "critical",
  "repos": ["cei-ui", "cei-agent"],
  "gap": {
    "remediation": {
      "progress": 60,
      "targetDate": "2026-02-26"
    }
  },
  "dataSource": {
    "type": "npm-audit"
  }
}
```

### 5. Row-Level Security (Secure)
```json
{
  "id": "cei-auth-005",
  "category": "Elevation of Privilege",
  "status": "secure",
  "priority": "high",
  "repos": ["cei-agent"],
  "implementation": {
    "infrastructure": ["infra/cloudformation/cei-storage.yaml"]
  }
}
```

---

**Document Status:** ✅ Ready for Engineering  
**Next Review:** After Week 3 (validate visualizations)  
**Owner:** Product + Engineering  
**Approved By:** _Pending_
