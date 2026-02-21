# CEI Trust Center - Final Design (DataDog-Inspired)

**Date:** 2026-02-21  
**Updates:** Compliance-to-Technical Controls Mapping + DataDog DRUIDS-Inspired UI/UX  
**Design Philosophy:** "Dense information, clear hierarchy, always interactive"  
**Reference:** DataDog DRUIDS design system + Security monitoring dashboards  

---

## Executive Summary

This document incorporates two critical updates to the trust center design:

1. **Compliance ↔ Technical Controls Mapping**: Direct linkage between SOC 2/ISO 27001 trust principles and specific technical implementations across the tech stack
2. **DataDog-Inspired UI/UX**: Adopting DRUIDS design patterns for density, interactivity, and professional polish

**Key Insight:** "When I hear SOC 2, I think paperwork not security." We fix this by showing **technical controls → stack layer → technical assurance**, not SOPs.

---

## Part 1: Compliance-to-Technical Controls Mapping

### 1.1 The Problem

**Current State:** SOC 2/ISO 27001 certificates feel like compliance checkbox exercises.  
**User Perception:** "They passed an audit" (paperwork) vs "They have real security" (technical).

**Our Solution:** **Traceability from compliance principle → technical control → code/config → verification.**

### 1.2 SOC 2 Trust Principles Mapped to CEI Architecture

SOC 2 has **5 Trust Service Criteria:**
1. **Security** (Common Criteria - always required)
2. **Availability** (optional)
3. **Processing Integrity** (optional)
4. **Confidentiality** (optional)
5. **Privacy** (optional)

**CEI Coverage:** Security (common) + Availability + Confidentiality

---

### 1.3 Detailed Mapping: SOC 2 Security → STRIDE → Tech Stack

#### CC6.1: Logical and Physical Access Controls

**SOC 2 Requirement:**
> "The entity implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events to meet the entity's objectives."

**Translation to Technical Controls:**

| STRIDE Category | Control Name | Tech Stack Layer | Implementation | Verification | Status |
|----------------|--------------|------------------|----------------|--------------|--------|
| **Spoofing** | Cognito JWT Authentication | Edge (API Gateway) | AWS Cognito User Pools with OIDC | `test/integration/auth.test.ts` | ✅ Secure |
| **Spoofing** | JWT Signature Validation | Runtime (AgentCore) | `CustomJWTAuthorizer` with JWKS | `src/runtime/__tests__/auth.test.ts` | ✅ Secure |
| **Spoofing** | MFA Enforcement | Identity (Cognito) | CloudFormation: `MfaConfiguration: ON` | Manual audit (Q4 2025) | 🟡 Optional |
| **Elevation of Privilege** | IAM Least Privilege | Infrastructure (AWS) | Role-based access with scoped policies | `infra/cloudformation/cei-identity.yaml` | ✅ Secure |
| **Elevation of Privilege** | Tenant Isolation (RLS) | Data (Aurora) | PostgreSQL Row-Level Security | `src/storage/migrations/070-rls.sql` | 🟡 In Progress |
| **Information Disclosure** | KMS Encryption at Rest | Data (Aurora, S3) | AWS-managed KMS keys | CloudFormation `EncryptionConfiguration` | ✅ Secure |
| **Information Disclosure** | TLS 1.2+ in Transit | Network (All layers) | API Gateway + ALB enforce TLS | `infra/cloudformation/cei-proxy.yaml` | ✅ Secure |

**Progressive Disclosure Flow:**

**Level 0: Compliance Badge**
```
┌────────────────────────────────────┐
│ ✅ SOC 2 Type II                   │
│ Last Audit: 2025-12-15             │
│ Next Audit: 2026-12-15             │
│                                    │
│ [View Technical Controls →]        │
└────────────────────────────────────┘
```

**Level 1: Trust Principle Breakdown**
```
SOC 2 Security (Common Criteria)
────────────────────────────────────

CC6.1: Logical and Physical Access Controls
  7 technical controls implemented
  5 Secure ✅  |  1 In Progress 🟡  |  1 Optional ⚪

[Expand to see controls ▼]
```

**Level 2: Control List with Stack Layers**
```
CC6.1 Controls (expanded):

┌─ Cognito JWT Authentication ──────────────────────┐
│ ✅ Secure  |  Edge Layer (API Gateway)           │
│ Prevents: Spoofing, Unauthorized Access          │
│ [View Implementation →] [View Tests →]            │
└───────────────────────────────────────────────────┘

┌─ Tenant Isolation (Row-Level Security) ───────────┐
│ 🟡 In Progress (60%)  |  Data Layer (Aurora)    │
│ Prevents: Elevation of Privilege, Data Leakage   │
│ Remediation: 2026-03-01 (2 weeks)                │
│ [View Remediation Plan →]                         │
└───────────────────────────────────────────────────┘
```

**Level 3: Technical Deep Dive** (click control)
```
┌─────────────────────────────────────────────────────┐
│ Cognito JWT Authentication                          │
│ ✅ Secure  |  🔒 Critical  |  📦 cei-agent         │
├─────────────────────────────────────────────────────┤
│                                                     │
│ SOC 2 Mapping:                                      │
│  └─ CC6.1: Logical Access Controls                 │
│  └─ CC6.2: Prior to Issuing Credentials            │
│                                                     │
│ ISO 27001 Mapping:                                  │
│  └─ A.9.2.1: User registration                     │
│  └─ A.9.4.2: Secure log-on procedures              │
│                                                     │
│ STRIDE Category: Spoofing                           │
│                                                     │
│ Tech Stack Layer: Edge (API Gateway)                │
│  ├─ Protocol: OIDC (OpenID Connect)                │
│  ├─ Token: JWT with RS256 signature                │
│  └─ Validation: JWKS endpoint refresh every 1h     │
│                                                     │
│ [Expand: Implementation Details ▼]                  │
│                                                     │
│ Code:                                               │
│  └─ src/runtime/auth/CustomJWTAuthorizer.ts        │
│  └─ src/auth/AuthProvider.tsx                      │
│                                                     │
│ Config:                                             │
│  └─ infra/cloudformation/cei-identity.yaml:45      │
│      UserPoolId: us-east-1_4KdGB3rG2               │
│      ClientId: 1qqgt87ehgc87bjb55s8jdpqff          │
│                                                     │
│ [Expand: Verification ▼]                            │
│                                                     │
│ Tests:                                              │
│  ✅ test/integration/auth.test.ts:23               │
│     "rejects invalid JWT signature"                │
│  ✅ test/integration/auth.test.ts:45               │
│     "accepts valid Cognito token"                  │
│  ✅ test/integration/auth.test.ts:67               │
│     "validates token expiry"                       │
│                                                     │
│ Last Verified: 2026-02-21 (automated)               │
│ Coverage: 95% (src/runtime/auth/)                   │
│                                                     │
│ [View Test Results →] [View Code →]                │
└─────────────────────────────────────────────────────┘
```

---

### 1.4 Full Compliance Mapping Table

#### SOC 2 Security (Common Criteria) → CEI Controls

| SOC 2 Control | Description | CEI Controls (Count) | STRIDE Categories | Status |
|---------------|-------------|----------------------|-------------------|--------|
| **CC6.1** | Logical/physical access | 7 controls | Spoofing, Elevation of Privilege, Information Disclosure | 71% Secure |
| **CC6.2** | Prior to issuing credentials | 3 controls | Spoofing | 100% Secure |
| **CC6.3** | Removal/modification of access | 2 controls | Elevation of Privilege | 50% In Progress |
| **CC6.6** | Logical access security measures | 5 controls | Tampering, Information Disclosure | 80% Secure |
| **CC6.7** | Access restricted to authorized users | 4 controls | Spoofing, Elevation of Privilege | 75% Secure |
| **CC6.8** | Transmission of covered info protected | 6 controls | Information Disclosure, Tampering | 100% Secure |
| **CC7.2** | Detection & monitoring | 8 controls | All STRIDE categories | 62% Secure |
| **CC7.3** | Evaluation of security events | 3 controls | Repudiation, Denial of Service | 33% At Risk |
| **CC7.4** | Response to security incidents | 5 controls | All STRIDE categories | 60% Secure |

**Overall SOC 2 Security Compliance:** 72% Technically Assured ✅

---

#### ISO 27001:2022 → CEI Controls

| ISO Control | Description | CEI Controls | Tech Stack Layers | Status |
|-------------|-------------|--------------|-------------------|--------|
| **A.5.1** | Policies for information security | 2 controls (policy docs) | Organization | ✅ Manual |
| **A.8.2** | Privileged access rights | 3 controls | Infrastructure, Data | 66% Secure |
| **A.8.3** | Information access restriction | 5 controls | Edge, Runtime, Data | 80% Secure |
| **A.8.5** | Secure authentication | 6 controls | Edge, Runtime | 83% Secure |
| **A.8.10** | Information deletion | 2 controls | Data | 🔴 At Risk |
| **A.8.24** | Use of cryptography | 8 controls | All layers | 100% Secure |
| **A.9.4** | System and application access control | 7 controls | Edge, Runtime, Data | 71% Secure |

**Overall ISO 27001 Technical Compliance:** 78% Assured ✅

---

### 1.5 Tech Stack Layer Visualization

**CEI Architecture with Compliance Overlay:**

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: CLIENT (React SPA)                                │
│  Controls: 3 | SOC 2: CC6.8 | ISO: A.8.24 (TLS)            │
│  ├─ HTTPS Enforcement          ✅ Secure                    │
│  ├─ Content Security Policy    🔴 Missing                   │
│  └─ Secure localStorage        ✅ Secure                    │
└─────────────────────────────────────────────────────────────┘
                            ↓ TLS 1.2+
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: EDGE (API Gateway, CloudFront)                    │
│  Controls: 5 | SOC 2: CC6.1, CC6.7 | ISO: A.8.3, A.8.5     │
│  ├─ JWT Validation             ✅ Secure                    │
│  ├─ CORS Policy                🔵 Non-Gap (bearer tokens)   │
│  ├─ Rate Limiting              🔴 Missing                   │
│  ├─ DDoS Protection (AWS)      ✅ Secure                    │
│  └─ WAF Rules                  🔴 Missing                   │
└─────────────────────────────────────────────────────────────┘
                            ↓ IAM + JWT
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: RUNTIME (AgentCore, Lambda)                       │
│  Controls: 12 | SOC 2: CC6.1, CC6.6, CC7.2 | ISO: A.8.2    │
│  ├─ CustomJWT Authorizer       ✅ Secure                    │
│  ├─ Session Management         🟡 Hardcoded TTL             │
│  ├─ Input Validation (Zod)     ✅ Secure                    │
│  ├─ PII Redaction              🟡 Partial                   │
│  ├─ Tool Privilege Separation  🔴 Missing (prompt injection)│
│  ├─ Secrets Manager Access     ✅ Secure                    │
│  └─ CloudWatch Logging         ✅ Secure                    │
└─────────────────────────────────────────────────────────────┘
                            ↓ RDS Data API (IAM)
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: DATA (Aurora PostgreSQL, S3)                      │
│  Controls: 8 | SOC 2: CC6.1, CC6.8 | ISO: A.8.2, A.8.24    │
│  ├─ KMS Encryption at Rest     ✅ Secure                    │
│  ├─ RLS (Row-Level Security)   🟡 In Progress (60%)        │
│  ├─ Parameterized Queries      ✅ Secure                    │
│  ├─ Backup Encryption          ✅ Secure                    │
│  ├─ Audit Logging              🟡 Partial                   │
│  └─ Data Retention Policy      🔴 Missing                   │
└─────────────────────────────────────────────────────────────┘
                            ↓ KMS
┌─────────────────────────────────────────────────────────────┐
│  Layer 5: SECRETS (Secrets Manager, KMS)                    │
│  Controls: 4 | SOC 2: CC6.1, CC6.6 | ISO: A.8.24           │
│  ├─ KMS Encryption             ✅ Secure                    │
│  ├─ Automatic Rotation         🟡 90-day (manual trigger)   │
│  ├─ Secret Expiry Enforcement  🔴 Missing                   │
│  └─ IAM Least Privilege        ✅ Secure                    │
└─────────────────────────────────────────────────────────────┘
```

**Hover on any layer → see SOC 2 / ISO 27001 controls**  
**Click control → drill into Level 3 deep dive**

---

## Part 2: DataDog-Inspired UI/UX Design

### 2.1 Design System: CEI DRUIDS (DataDog-Inspired)

**Key Patterns from DataDog:**
1. **Dense Information Display** - Pack data without overwhelming
2. **Clear Visual Hierarchy** - Size, color, spacing guide the eye
3. **Always Interactive** - Every element clickable, hoverable, draggable
4. **Cmd+K Quick Nav** - Jump to any control instantly
5. **Contextual Links** - "More info just a click away"
6. **Live Data** - Real-time updates, not static
7. **Editable Playgrounds** - Try it yourself
8. **Monospace for Technical** - Code, IDs, UUIDs in monospace
9. **Status at a Glance** - Color-coded indicators everywhere

### 2.2 Color Palette (DataDog-Inspired)

```css
/* Primary Brand */
--cei-purple-600: #7B42BC;    /* Primary action */
--cei-purple-500: #9654DC;    /* Hover state */
--cei-purple-400: #B37FEB;    /* Disabled */

/* Status Colors */
--cei-green-500: #37D5A3;     /* Secure ✅ */
--cei-yellow-500: #FFD43B;    /* In Progress 🟡 */
--cei-red-500: #EF6561;       /* At Risk 🔴 */
--cei-blue-500: #5E78FF;      /* Non-Gap 🔵 */

/* Neutral (Dark Mode) */
--cei-gray-900: #111827;      /* Background */
--cei-gray-800: #1F2937;      /* Card background */
--cei-gray-700: #374151;      /* Border */
--cei-gray-400: #9CA3AF;      /* Muted text */
--cei-gray-100: #F3F4F6;      /* Primary text */

/* Charts */
--cei-chart-1: #5E78FF;       /* Primary metric */
--cei-chart-2: #37D5A3;       /* Secondary metric */
--cei-chart-3: #FFD43B;       /* Tertiary metric */
--cei-chart-4: #EF6561;       /* Danger metric */
```

### 2.3 Typography (Monospace for Technical Data)

```css
/* UI Font (Variable Width) */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Technical Font (Monospace) */
font-family: 'IBM Plex Mono', 'Monaco', 'Consolas', monospace;

/* Usage */
.control-id          { font-family: var(--font-mono); }  /* cei-auth-001 */
.code-snippet        { font-family: var(--font-mono); }  /* TypeScript */
.uuid                { font-family: var(--font-mono); }  /* tenantId */
.metric-value        { font-family: var(--font-mono); }  /* 95.2% */

.heading             { font-family: var(--font-sans); }
.body-text           { font-family: var(--font-sans); }
```

### 2.4 Component Library (DataDog-Inspired)

#### Widget: Control Status Card

**Spec:**
```tsx
interface ControlStatusCard {
  id: string              // cei-auth-001
  name: string            // "Cognito JWT Authentication"
  status: SecurityStatus  // 'secure' | 'at-risk' | 'in-progress' | 'non-gap'
  priority: 'critical' | 'high' | 'medium' | 'low'
  layers: TechStackLayer[]  // ['edge', 'runtime']
  soc2: string[]            // ['CC6.1', 'CC6.2']
  iso27001: string[]        // ['A.8.5', 'A.9.4']
  metrics: {
    coverage: number        // 95%
    lastVerified: Date
    testsPassing: number    // 12/12
  }
  onExpand: () => void
  onViewCode: () => void
}
```

**Visual:**
```
┌────────────────────────────────────────────────────────────┐
│ cei-auth-001                    ✅ Secure      🔒 Critical │
├────────────────────────────────────────────────────────────┤
│ Cognito JWT Authentication                                 │
│                                                            │
│ Edge Layer  |  Runtime Layer                              │
│                                                            │
│ ▣ SOC 2: CC6.1, CC6.2  ▣ ISO: A.8.5, A.9.4               │
│                                                            │
│ ┌───────────────┐  ┌───────────────┐  ┌──────────────┐  │
│ │ Coverage      │  │ Tests         │  │ Last Verified│  │
│ │ 95%           │  │ 12/12 ✅      │  │ 2 days ago   │  │
│ └───────────────┘  └───────────────┘  └──────────────┘  │
│                                                            │
│ [Expand Details ▼] [View Code →] [Run Tests →]           │
└────────────────────────────────────────────────────────────┘

Hover Effects:
- Entire card: Lift (box-shadow increase)
- Status badge: Tooltip with definition
- Layer badges: Tooltip with layer description
- SOC 2/ISO badges: Hover to see full control description
- Metrics: Hover for trend sparkline
```

#### Widget: STRIDE Hexagon (Interactive)

**Upgrade from static hexagon:**
```tsx
<STRIDEHexagon
  data={strideData}
  onCategoryClick={(category) => navigate(`/stride/${category}`)}
  onCategoryHover={(category) => showTooltip(category)}
  showMetrics={true}
  animateOnLoad={true}
/>

// Features:
// - Click segment → navigate to category page
// - Hover → tooltip with stats (12/15 secure, 2 at-risk, 1 in-progress)
// - Pulse animation on status change
// - Mini-graph inside each segment showing trend
```

**Visual Enhancements:**
```
       Spoofing
       ┌─────┐
       │ 8/9 │  ← Mini progress bar
   ┌──┴─────┴──┐
   │           │
   │  Center:  │
   │   72%     │  ← Overall score, large and bold
   │  Secure   │
   │           │
   └──┬─────┬──┘
      │ 5/6 │
      └─────┘
     Tampering

Hover on Spoofing:
┌─────────────────────────────────┐
│ Spoofing (Authentication)       │
├─────────────────────────────────┤
│ ✅ 8 Secure                     │
│ 🔴 1 At Risk (JWT revocation)  │
│                                 │
│ SOC 2: CC6.1, CC6.2, CC6.7      │
│ ISO: A.8.3, A.8.5, A.9.4        │
│                                 │
│ [View All Controls →]           │
└─────────────────────────────────┘
```

#### Widget: Tech Stack Layer Diagram (Interactive)

**Inspired by DataDog's Infrastructure Monitoring:**
```
┌─────────────────────────────────────────────────────┐
│ CEI Security Architecture                           │
│                                                     │
│  Client        ━━━━━━━┓                           │
│  (3 controls)         ▼ TLS 1.2+                   │
│                                                     │
│  Edge          ━━━━━━━┓                           │
│  (5 controls)         ▼ IAM + JWT                  │
│                                                     │
│  Runtime       ━━━━━━━┓                           │
│  (12 controls)        ▼ RDS Data API               │
│                                                     │
│  Data          ━━━━━━━┓                           │
│  (8 controls)         ▼ KMS                        │
│                                                     │
│  Secrets       ━━━━━━━●                           │
│  (4 controls)                                      │
└─────────────────────────────────────────────────────┘

Click any layer → highlight controls in that layer
Hover → show control count breakdown (✅ 4, 🟡 1, 🔴 0)
```

#### Widget: Attack Chain Flow (React Flow + DataDog Polish)

**Example: XXE → SSRF → IAM Compromise**
```tsx
<AttackChainFlow
  nodes={[
    { id: '1', data: { label: 'User Upload PDF', risk: 'entry' }, position: { x: 0, y: 0 } },
    { id: '2', data: { label: 'fast-xml-parser', risk: 'vulnerable' }, position: { x: 0, y: 100 } },
    { id: '3', data: { label: 'XXE Triggered', risk: 'exploit' }, position: { x: 0, y: 200 } },
    { id: '4', data: { label: 'SSRF to AWS Metadata', risk: 'exploit' }, position: { x: 0, y: 300 } },
    { id: '5', data: { label: 'IAM Creds Leaked', risk: 'critical' }, position: { x: 0, y: 400 } }
  ]}
  edges={[
    { id: 'e1-2', source: '1', target: '2', animated: true, label: 'Attachment API' },
    { id: 'e2-3', source: '2', target: '3', animated: true, label: 'External Entity' },
    { id: 'e3-4', source: '3', target: '4', animated: true, label: 'HTTP Request' },
    { id: 'e4-5', source: '4', target: '5', animated: true, label: 'Credentials' }
  ]}
  onNodeClick={(node) => showMitigationDetails(node)}
  showMitigations={true}
  animateFlow={true}
/>

// Features:
// - Auto-animate flow from top to bottom (like dominoes)
// - Hover node → show mitigation control (e.g., "Layer 2: Disable XXE")
// - Click node → expand to show technical details
// - "Play" button to replay animation
// - Mini-map in corner for large flows
```

**Visual Polish (DataDog-style):**
- **Node colors:** Entry (blue), Vulnerable (orange), Exploit (red), Critical (dark red)
- **Edge animation:** Glowing pulse traveling along path
- **Hover state:** Node lifts, shows drop shadow, displays mini control card
- **Click state:** Node expands to show control details inline

#### Widget: Compliance Coverage Matrix (Heatmap)

**Inspired by DataDog's Service Map:**
```
┌─────────────────────────────────────────────────────────────┐
│ SOC 2 Trust Principles vs CEI Controls                      │
├─────────────────────────────────────────────────────────────┤
│               │ Security │ Avail │ Proc Int │ Confid │ Priv │
├───────────────┼──────────┼───────┼──────────┼────────┼──────┤
│ Spoofing      │ ████ 72% │ N/A   │ N/A      │ N/A    │ N/A  │
│ Tampering     │ ███░ 60% │ N/A   │ ████ 80% │ N/A    │ N/A  │
│ Repudiation   │ ██░░ 40% │ N/A   │ ███░ 70% │ N/A    │ N/A  │
│ Info Disc     │ ████100% │ N/A   │ N/A      │ ████100│ N/A  │
│ DoS           │ █░░░ 20% │ ███░ 75│ N/A     │ N/A    │ N/A  │
│ Elevation     │ ██░░ 50% │ N/A   │ N/A      │ N/A    │ N/A  │
└─────────────────────────────────────────────────────────────┘

Hover cell → tooltip with control count ("4 of 6 controls secure")
Click cell → filter view to show only those controls
Color scale: Green (80-100%), Yellow (50-79%), Red (0-49%)
```

### 2.5 Cmd+K Quick Nav (DataDog's Killer Feature)

**Implementation:**
```tsx
import { Command } from 'cmdk'

<Command.Dialog open={open} onOpenChange={setOpen}>
  <Command.Input 
    placeholder="Jump to control, compliance section, or search..." 
  />
  
  <Command.List>
    <Command.Group heading="Recent">
      <Command.Item onSelect={() => navigate('/controls/cei-auth-001')}>
        <span className="font-mono">cei-auth-001</span>
        <span className="text-muted">JWT Authentication</span>
      </Command.Item>
    </Command.Group>
    
    <Command.Group heading="Controls">
      {controls.map(control => (
        <Command.Item 
          key={control.id}
          onSelect={() => navigate(`/controls/${control.id}`)}
          keywords={[control.name, control.category, ...control.soc2, ...control.iso27001]}
        >
          <StatusBadge status={control.status} />
          <span className="font-mono">{control.id}</span>
          <span>{control.name}</span>
        </Command.Item>
      ))}
    </Command.Group>
    
    <Command.Group heading="Compliance">
      <Command.Item onSelect={() => navigate('/compliance/soc2')}>
        SOC 2 Type II
      </Command.Item>
      <Command.Item onSelect={() => navigate('/compliance/iso27001')}>
        ISO 27001:2022
      </Command.Item>
    </Command.Group>
    
    <Command.Group heading="STRIDE Categories">
      {strideCategories.map(cat => (
        <Command.Item onSelect={() => navigate(`/stride/${cat.slug}`)}>
          {cat.icon} {cat.name} ({cat.controlCount} controls)
        </Command.Item>
      ))}
    </Command.Group>
  </Command.List>
</Command.Dialog>

// Trigger: Cmd+K (Mac) or Ctrl+K (Windows/Linux)
// Fuzzy search across: control IDs, names, SOC 2 codes, ISO codes, STRIDE categories
```

### 2.6 Live Data Updates (Real-time)

**WebSocket or Polling for Status Changes:**
```tsx
// Subscribe to control status changes
useEffect(() => {
  const ws = new WebSocket('wss://trust.cei.example.com/live')
  
  ws.on('control:updated', (data) => {
    // Update control status in real-time
    setControls(prev => prev.map(c => 
      c.id === data.controlId ? { ...c, status: data.status, lastVerified: data.timestamp } : c
    ))
    
    // Show toast notification
    toast({
      title: `${data.controlName} status updated`,
      description: `Now: ${data.status}`,
      variant: data.status === 'secure' ? 'success' : 'warning'
    })
  })
  
  return () => ws.close()
}, [])
```

**Visual Indicator:**
```
┌────────────────────────────────┐
│ Live Updates                   │
│ ● Connected (Last: 2s ago)     │
└────────────────────────────────┘

When update received:
- Pulse animation on affected control card
- Toast notification
- Update timestamp
- Re-sort list if priority changed
```

### 2.7 Editable Playgrounds (Try It Yourself)

**Inspired by DataDog's interactive examples:**
```tsx
<CodePlayground
  title="Test JWT Validation"
  code={`
// Try different JWT tokens
const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

const result = await validateJWT(token, {
  issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_4KdGB3rG2",
  audience: "1qqgt87ehgc87bjb55s8jdpqff"
})

console.log(result.valid)  // true or false
console.log(result.claims) // decoded payload
  `}
  editable={true}
  onRun={(code) => {
    // Actually execute in sandbox
    const result = executeSandbox(code)
    setOutput(result)
  }}
  outputFormat="json"
/>

// User can:
// - Edit the token
// - Change validation parameters
// - See real-time results
// - Copy working code

Output Panel:
┌──────────────────────────────────────┐
│ ✅ Valid JWT                         │
│                                      │
│ Claims:                              │
│ {                                    │
│   "sub": "alice@example.com",       │
│   "exp": 1708531200,                │
│   "iat": 1708527600                 │
│ }                                    │
│                                      │
│ [Copy Code] [Share Playground]       │
└──────────────────────────────────────┘
```

### 2.8 Contextual Links (Always One Click Away)

**Implementation:**
```tsx
// Every technical term is linkable
<TechnicalTerm term="JWT" definition="JSON Web Token">
  JWT
</TechnicalTerm>

// Hover → tooltip with definition + link to full explanation
<Tooltip>
  <TooltipTrigger>JWT</TooltipTrigger>
  <TooltipContent>
    <p>JSON Web Token - A compact, URL-safe means of representing claims.</p>
    <a href="/docs/jwt">Learn more →</a>
  </TooltipContent>
</Tooltip>

// Every control references related controls
<RelatedControls>
  <h4>Related Controls:</h4>
  <ul>
    <li><Link to="/controls/cei-auth-002">JWT Revocation Check</Link></li>
    <li><Link to="/controls/cei-auth-003">Session Timeout</Link></li>
  </ul>
</RelatedControls>

// Every SOC 2 code links to full control description
<SOC2Badge code="CC6.1" onClick={() => showSOC2Modal('CC6.1')} />
```

### 2.9 Mobile Optimizations (DataDog Mobile App-Inspired)

**Key Adaptations:**
- **STRIDE Hexagon:** Static image on mobile, tap to navigate
- **Control Cards:** Stacked, swipeable (like Tinder)
- **Attack Chains:** Simplified linear flow (no React Flow on mobile)
- **Tech Stack Diagram:** Accordion-style collapse
- **Cmd+K:** Replaced with bottom sheet search
- **Playgrounds:** Read-only on mobile, "Open on Desktop" button

**Mobile-First Features:**
- Quick filters (top bar: ✅ Secure, 🔴 At Risk, 🟡 In Progress)
- Swipe gestures (left → expand, right → dismiss)
- Bottom sheet for details (full-screen on tap)
- Share control (native share sheet)
- Offline mode (cache last loaded state)

---

## Part 3: Implementation Details (Two Levels Deeper)

### 3.1 Component Architecture (Production-Grade)

**File Structure:**
```
src/trust-center/
├── components/
│   ├── compliance/
│   │   ├── ComplianceBadge.tsx
│   │   ├── SOC2Matrix.tsx
│   │   ├── ISO27001Mapper.tsx
│   │   └── CoverageHeatmap.tsx
│   ├── controls/
│   │   ├── ControlCard.tsx
│   │   ├── ControlDetail.tsx
│   │   ├── ControlMetrics.tsx
│   │   └── ControlTimeline.tsx
│   ├── visualizations/
│   │   ├── STRIDEHexagon.tsx
│   │   ├── TechStackDiagram.tsx
│   │   ├── AttackChainFlow.tsx
│   │   └── ComplianceCoverageMatrix.tsx
│   ├── navigation/
│   │   ├── CommandPalette.tsx      # Cmd+K
│   │   ├── Breadcrumbs.tsx
│   │   └── QuickFilters.tsx
│   ├── interactive/
│   │   ├── CodePlayground.tsx
│   │   ├── LiveDataIndicator.tsx
│   │   └── HoverTooltip.tsx
│   └── primitives/
│       ├── StatusBadge.tsx
│       ├── LayerBadge.tsx
│       ├── PriorityTag.tsx
│       └── MetricCard.tsx
│
├── pages/
│   ├── TrustCenterOverview.tsx
│   ├── SecurityArchitecture.tsx
│   ├── CompliancePage.tsx
│   ├── ControlDetailPage.tsx
│   └── STRIDECategoryPage.tsx
│
├── hooks/
│   ├── useControls.ts
│   ├── useCompliance.ts
│   ├── useLiveUpdates.ts
│   ├── useCommandPalette.ts
│   └── useTechStack.ts
│
├── data/
│   ├── controls.json                    # Auto-generated
│   ├── compliance-mapping.json          # SOC 2/ISO → controls
│   ├── tech-stack-layers.json           # Layer definitions
│   └── attack-chains.json               # Predefined attack scenarios
│
└── utils/
    ├── status-calculator.ts
    ├── compliance-aggregator.ts
    ├── search-indexer.ts               # For Cmd+K
    └── live-data-client.ts             # WebSocket
```

### 3.2 Data Model (Extended)

```typescript
interface SecurityControl {
  // ... existing fields ...
  
  // NEW: Compliance Mapping
  compliance: {
    soc2: Array<{
      code: string              // "CC6.1"
      description: string       // "Logical access controls..."
      requirementMet: boolean
      evidence: string[]        // URLs to evidence docs
    }>
    
    iso27001: Array<{
      code: string              // "A.8.5"
      description: string
      implementationLevel: 'full' | 'partial' | 'none'
      gaps: string[]
    }>
    
    nist: Array<{              // Optional: NIST CSF
      function: string          // "PR.AC-1"
      category: string          // "Protect > Access Control"
    }>
  }
  
  // NEW: Tech Stack Layer
  techStack: {
    layers: Array<'client' | 'edge' | 'runtime' | 'data' | 'secrets'>
    components: Array<{
      name: string              // "API Gateway"
      type: string              // "AWS Service"
      config: string            // Path to CloudFormation
    }>
  }
  
  // NEW: Metrics (for live updates)
  metrics: {
    coverage: {
      code: number              // % lines covered by tests
      tests: number             // % test pass rate
    }
    performance: {
      p50Latency: number        // ms
      p99Latency: number
      errorRate: number         // %
    }
    security: {
      vulnerabilityCount: number
      lastScanDate: Date
      falsePositives: number
    }
  }
  
  // NEW: Interactive Elements
  interactive: {
    hasPlayground: boolean
    playgroundUrl?: string
    hasLiveDemo: boolean
    demoUrl?: string
  }
}
```

### 3.3 Advanced Visualizations (Level 1 Deeper)

#### Time-Series Security Score

**Using Plotly.js (DataDog-style):**
```tsx
<Plot
  data={[
    {
      x: dates,                          // Last 90 days
      y: securityScores,                 // 0-100%
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Overall Security Score',
      line: { 
        color: '#37D5A3',
        width: 3,
        shape: 'spline'                  // Smooth curve
      },
      marker: { 
        size: 8,
        color: securityScores.map(s =>   // Dynamic color
          s >= 80 ? '#37D5A3' :          // Green
          s >= 60 ? '#FFD43B' :          // Yellow
          '#EF6561'                      // Red
        )
      },
      hovertemplate: 
        '<b>%{y:.1f}% Secure</b><br>' +
        'Date: %{x}<br>' +
        'Controls: %{customdata[0]} secure, %{customdata[1]} at-risk<br>' +
        '<extra></extra>',
      customdata: controlBreakdown        // [secureCount, atRiskCount]
    },
    {
      x: dates,
      y: vulnerabilityCounts,
      type: 'bar',
      name: 'Vulnerabilities',
      yaxis: 'y2',
      marker: { color: '#EF6561', opacity: 0.6 }
    }
  ]}
  
  layout={{
    title: 'Security Posture Trend (90 Days)',
    xaxis: { title: 'Date', showgrid: false },
    yaxis: { 
      title: 'Security Score (%)', 
      range: [0, 100],
      showgrid: true,
      gridcolor: '#374151'
    },
    yaxis2: {
      title: 'Vulnerability Count',
      overlaying: 'y',
      side: 'right',
      showgrid: false
    },
    hovermode: 'x unified',
    plot_bgcolor: '#1F2937',
    paper_bgcolor: '#111827',
    font: { color: '#F3F4F6', family: 'Inter' }
  }}
  
  config={{
    displayModeBar: true,
    modeBarButtonsToAdd: [
      {
        name: 'Export to CSV',
        icon: Plotly.Icons.disk,
        click: () => exportToCSV(securityScores)
      }
    ]
  }}
/>

// Features:
// - Hover any point → see breakdown (12 secure, 3 at-risk)
// - Click marker → jump to that day's report
// - Zoom/pan to explore timeframe
// - Export to CSV for offline analysis
// - Annotations for major events (e.g., "SOC 2 audit passed")
```

#### Network Topology (vis.js - Two Levels Deeper)

**Full Implementation:**
```tsx
import { Network } from 'vis-network'

const nodes = new DataSet([
  { 
    id: 'ui', 
    label: 'CEI UI\n(3 controls)', 
    group: 'client',
    shape: 'box',
    color: {
      background: '#5E78FF',
      border: '#374151',
      hover: { background: '#7B92FF' }
    },
    font: { color: '#F3F4F6', face: 'Inter' },
    margin: 10
  },
  { 
    id: 'gateway', 
    label: 'API Gateway\n(5 controls)', 
    group: 'edge',
    controlCount: 5,
    secureCount: 4,
    atRiskCount: 1
  },
  // ... more nodes
])

const edges = new DataSet([
  { 
    from: 'ui', 
    to: 'gateway',
    label: 'TLS 1.2+',
    arrows: 'to',
    color: { 
      color: '#37D5A3',     // Green = secure
      highlight: '#7B42BC'
    },
    dashes: false,
    width: 3,
    smooth: { type: 'curvedCW', roundness: 0.2 },
    font: { align: 'middle', strokeWidth: 0 }
  },
  { 
    from: 'gateway', 
    to: 'agent',
    label: 'IAM + JWT',
    // ... (if at-risk control, make edge red)
    color: { color: '#EF6561' },   // Red = at risk
  },
  // ... more edges
])

const network = new Network(container, { nodes, edges }, {
  layout: {
    hierarchical: {
      direction: 'UD',           // Up to down (top = client, bottom = secrets)
      sortMethod: 'directed',
      nodeSpacing: 150,
      levelSeparation: 120
    }
  },
  
  interaction: {
    hover: true,
    dragNodes: true,
    dragView: true,
    zoomView: true,
    tooltipDelay: 300
  },
  
  physics: {
    enabled: false              // Static layout for clarity
  },
  
  nodes: {
    font: {
      size: 14,
      face: 'Inter',
      color: '#F3F4F6'
    },
    borderWidth: 2,
    shadow: {
      enabled: true,
      color: 'rgba(0,0,0,0.3)',
      size: 10,
      x: 3,
      y: 3
    }
  },
  
  edges: {
    font: {
      size: 12,
      face: 'IBM Plex Mono',
      strokeWidth: 3,
      strokeColor: '#111827'
    },
    smooth: {
      enabled: true,
      type: 'curvedCW'
    }
  }
})

// Event Handlers
network.on('click', (params) => {
  if (params.nodes.length > 0) {
    const nodeId = params.nodes[0]
    showControlsForLayer(nodeId)
  }
})

network.on('hoverNode', (params) => {
  const node = nodes.get(params.node)
  showTooltip({
    title: node.label,
    content: `${node.secureCount} secure, ${node.atRiskCount} at-risk`,
    position: params.pointer.DOM
  })
})

// Highlight path on hover
network.on('hoverEdge', (params) => {
  const edge = edges.get(params.edge)
  // Animate edge (pulse)
  animateEdge(edge.id)
})
```

**Visual Result:**
```
┌─────────────────────────────────────────────────────────┐
│  CEI Security Architecture (Interactive Network)        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              ┌──────────────┐                          │
│              │  CEI UI      │ (blue box)               │
│              │  3 controls  │                          │
│              └──────┬───────┘                          │
│                     │ TLS 1.2+ (green arrow)            │
│                     ▼                                   │
│              ┌──────────────┐                          │
│              │ API Gateway  │ (blue box)               │
│              │  5 controls  │                          │
│              │  (1 at-risk) │ ← red indicator          │
│              └──────┬───────┘                          │
│                     │ IAM + JWT (red arrow)             │
│                     ▼                                   │
│              ┌──────────────┐                          │
│              │  AgentCore   │ (purple box)             │
│              │ 12 controls  │                          │
│              └──────┬───────┘                          │
│                     │ RDS Data API (green arrow)        │
│                     ▼                                   │
│              ┌──────────────┐                          │
│              │   Aurora     │ (purple box)             │
│              │  8 controls  │                          │
│              └──────┬───────┘                          │
│                     │ KMS (green arrow)                 │
│                     ▼                                   │
│              ┌──────────────┐                          │
│              │   Secrets    │ (purple box)             │
│              │  Manager     │                          │
│              │  4 controls  │                          │
│              └──────────────┘                          │
│                                                         │
│  Legend: Green = Secure | Red = At Risk | Purple = OK  │
└─────────────────────────────────────────────────────────┘
```

### 3.4 Advanced Interactions (Level 2 Deeper)

#### Drill-Down on Hexagon

**Multi-Step Navigation:**
```
Step 1: Click STRIDE Hexagon Segment (Spoofing)
  ↓
Step 2: Animated transition to Spoofing category page
  - Fade out other segments
  - Expand Spoofing segment to full screen
  - Show control list for Spoofing category
  ↓
Step 3: Filter controls by layer (user clicks "Edge" badge)
  - Highlight Edge layer in tech stack diagram
  - Dim non-Edge controls
  - Show count: "3 of 8 Spoofing controls in Edge layer"
  ↓
Step 4: Click control card
  - Slide in control detail from right
  - Show full implementation, verification, compliance mapping
  - Breadcrumb: Trust Center > Spoofing > Edge Layer > JWT Validation
```

#### Live Collaboration (Advanced Feature)

**Multi-User Viewing (Optional but Cool):**
```tsx
// Show avatars of other users viewing same control
<CollaborationIndicator>
  {otherViewers.map(user => (
    <Avatar 
      key={user.id}
      src={user.avatar}
      name={user.name}
      tooltip={`${user.name} is viewing this`}
    />
  ))}
</CollaborationIndicator>

// Live cursor tracking (like Figma)
{otherViewers.map(user => (
  <RemoteCursor
    key={user.id}
    x={user.cursor.x}
    y={user.cursor.y}
    color={user.color}
    label={user.name}
  />
))}

// Real-time comments
<CommentThread controlId="cei-auth-001">
  {comments.map(comment => (
    <Comment
      author={comment.author}
      timestamp={comment.timestamp}
      text={comment.text}
      reactions={comment.reactions}
    />
  ))}
  
  <CommentInput onSubmit={addComment} />
</CommentThread>
```

**Use Case:** Security team reviews controls together during pre-audit prep.

---

## Part 4: Complete Example Walkthrough

### 4.1 User Journey: CISO Evaluating CEI

**Persona:** Sarah, CISO at a Fortune 500 company, evaluating CEI for enterprise deployment.

**Scenario:** Sarah needs to verify CEI's security posture meets her company's requirements (SOC 2, ISO 27001, specific controls for financial services).

**Journey:**

**Step 1: Land on Trust Center Home**
```
URL: trust.cei.example.com

┌─────────────────────────────────────────────────────────┐
│  CEI Trust Center                                       │
│  Built on trust. Secured by design.                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ SOC 2 Type II  |  ✅ ISO 27001  |  🔄 Pen Test Q2 │
│                                                         │
│  Overall Security Score: 72% ────────────────────      │
│                                                         │
│  Recent Update: JWT revocation deployed (2 days ago)    │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Security │  │Compliance│  │ Status   │            │
│  │   →      │  │    →     │  │   →      │            │
│  └──────────┘  └──────────┘  └──────────┘            │
└─────────────────────────────────────────────────────────┘

Sarah thinks: "72%? That's honest. Let me dig into Security."
```

**Step 2: Navigate to Security Section**
```
URL: trust.cei.example.com/security

┌─────────────────────────────────────────────────────────┐
│  Security                                               │
│  Trust Center > Security                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Overview                                               │
│  Our security approach: Defense in depth, least priv,  │
│  zero trust, encryption everywhere.                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Security for Technical Leaders                  │  │
│  │  High-level architecture + key principles        │  │
│  │  [View →]                                        │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  🎯 Security Architecture (Deep Dive)           │  │
│  │  STRIDE threat model + technical controls        │  │
│  │  [View →]                                        │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  Incident Response  |  Pen Testing  |  Vulnerability   │
│  Management                                             │
└─────────────────────────────────────────────────────────┘

Sarah clicks: "Security Architecture (Deep Dive)"
```

**Step 3: Security Architecture Page (STRIDE Hexagon)**
```
URL: trust.cei.example.com/security/architecture

┌─────────────────────────────────────────────────────────┐
│  Security Architecture                                  │
│  Press Cmd+K to search controls                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│      [Interactive STRIDE Hexagon - see Part 2.4]       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Layer View                                       │  │
│  │  [Tech Stack Diagram - see Part 2.4]            │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Compliance Coverage                              │  │
│  │  SOC 2: 72% assured  |  ISO 27001: 78% assured  │  │
│  │  [View Mapping →]                                │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  [Filter: ✅ Secure (23) | 🔴 At Risk (4) | 🟡 In Prog│
│                                                         │
│  All Controls (32)                                      │
│  [Control cards - see Part 2.4]                        │
└─────────────────────────────────────────────────────────┘

Sarah hovers over "Spoofing" segment → tooltip shows "8/9 secure"
Sarah clicks "View Mapping" under Compliance Coverage
```

**Step 4: SOC 2 Compliance Mapping**
```
URL: trust.cei.example.com/compliance/soc2

┌─────────────────────────────────────────────────────────┐
│  SOC 2 Type II Compliance Mapping                      │
│  Trust Center > Compliance > SOC 2                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Last Audit: 2025-12-15  |  Next Audit: 2026-12-15     │
│  Auditor: Deloitte       |  Report: [Download PDF]     │
│                                                         │
│  Technical Assurance: 72% of controls verified          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  CC6.1: Logical and Physical Access Controls    │  │
│  │  ────────────────────────────────────────────   │  │
│  │  7 controls  |  5 Secure ✅  |  1 In Progress 🟡│  │
│  │                                                  │  │
│  │  [View All Controls →]                           │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  CC6.2: Prior to Issuing System Credentials     │  │
│  │  ────────────────────────────────────────────   │  │
│  │  3 controls  |  3 Secure ✅                     │  │
│  │                                                  │  │
│  │  [View All Controls →]                           │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ... (9 more CC sections)                               │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Coverage Heatmap                                │  │
│  │  [Heatmap showing STRIDE vs Trust Principles]   │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

Sarah clicks "View All Controls" under CC6.1
```

**Step 5: CC6.1 Control List**
```
URL: trust.cei.example.com/compliance/soc2/CC6.1

┌─────────────────────────────────────────────────────────┐
│  SOC 2 CC6.1: Logical and Physical Access Controls     │
│  Trust Center > Compliance > SOC 2 > CC6.1              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Requirement:                                           │
│  "The entity implements logical access security soft... │
│                                                         │
│  CEI Implementation: 7 technical controls               │
│                                                         │
│  [Control Card: Cognito JWT Authentication - EXPANDED] │
│  ┌─────────────────────────────────────────────────┐  │
│  │ cei-auth-001  |  ✅ Secure  |  🔒 Critical      │  │
│  ├─────────────────────────────────────────────────┤  │
│  │ Cognito JWT Authentication                       │  │
│  │                                                  │  │
│  │ Edge Layer  |  Runtime Layer                    │  │
│  │                                                  │  │
│  │ SOC 2: CC6.1, CC6.2, CC6.7                      │  │
│  │ ISO: A.8.5, A.9.4                               │  │
│  │                                                  │  │
│  │ Technical Verification:                          │  │
│  │  ├─ Code: src/runtime/auth/CustomJWTAuthz.ts   │  │
│  │  ├─ Config: infra/cloudformation/cei-id.yaml   │  │
│  │  ├─ Tests: 12/12 passing ✅                    │  │
│  │  └─ Coverage: 95%                               │  │
│  │                                                  │  │
│  │ [View Full Details →] [View Tests →] [View Code│  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ... (6 more control cards)                             │
└─────────────────────────────────────────────────────────┘

Sarah clicks "View Full Details" on JWT control
```

**Step 6: Full Control Detail (Level 3)**
```
URL: trust.cei.example.com/controls/cei-auth-001

[Full Level 3 detail from Part 1.3]

Sarah sees:
- SOC 2 mapping (CC6.1, CC6.2)
- ISO 27001 mapping (A.8.5, A.9.4)
- Tech stack layer (Edge + Runtime)
- Implementation (code paths, config)
- Verification (tests, coverage, last verified)

Sarah thinks: "This is real. Not just paperwork. They show me the 
actual code, the tests, and how it maps to compliance."

She presses Cmd+K and types "rate limiting"
```

**Step 7: Cmd+K Search for Rate Limiting**
```
[Command Palette opens]

Search: "rate limiting"

Results:
┌─────────────────────────────────────────────────────────┐
│  🔴 cei-net-002: Rate Limiting                         │
│  At Risk  |  Denial of Service category                 │
│  [Jump to control →]                                    │
│                                                         │
│  Related:                                               │
│  📄 Remediation Plan 1.4: Rate Limiting Implementation │
│  📊 STRIDE: Denial of Service controls                 │
│  🔗 SOC 2: CC7.2 (Detection & monitoring)              │
└─────────────────────────────────────────────────────────┘

Sarah clicks "Jump to control"
```

**Step 8: Rate Limiting Control (At Risk)**
```
URL: trust.cei.example.com/controls/cei-net-002

┌─────────────────────────────────────────────────────────┐
│  cei-net-002: Rate Limiting                            │
│  🔴 At Risk  |  🔒 Critical  |  📦 cei-agent          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Status: At Risk (missing implementation)               │
│  Priority: Critical                                     │
│                                                         │
│  SOC 2: CC7.2 (Detection & monitoring)                 │
│  ISO: A.8.16 (Monitoring)                              │
│  STRIDE: Denial of Service                              │
│                                                         │
│  Gap Description:                                       │
│  No rate limiting on API Gateway or AgentCore endpoints│
│  Unlimited requests per user/IP. Enables DDoS and cost │
│  exhaustion attacks.                                    │
│                                                         │
│  Remediation Plan:                                      │
│  └─ Timeline: 2-4 hours                                │
│  └─ Owner: DevOps Team                                 │
│  └─ Target Date: 2026-02-26                            │
│  └─ Progress: 0% (not started)                         │
│  └─ Dependencies: None                                 │
│                                                         │
│  [View Remediation Plan →] [Track Progress →]          │
│                                                         │
│  Blast Radius:                                          │
│  - Service unavailable (all agent invocations fail)    │
│  - Cost spike ($1000+ if quota exhausted)              │
│  - Customer impact: High                                │
└─────────────────────────────────────────────────────────┘

Sarah thinks: "They're honest about gaps. And they have a concrete 
plan with timeline. I can track this. Not just 'we'll fix it.'"

Sarah clicks "Track Progress" → subscribes to updates
She exports security report as PDF for her team
```

**Outcome:** Sarah is impressed. CEI doesn't hide gaps. They show:
1. Real technical controls (not just policies)
2. Exact code/config locations
3. Test verification
4. Compliance mapping (SOC 2 + ISO)
5. Honest status (72%, not "we're secure")
6. Remediation plans with timelines

**Sarah's next step:** Schedule demo call, request private audit report access.

---

## Part 5: Implementation Checklist (Production-Ready)

### Phase 1: Foundation (Week 1-2)

- [ ] Set up DataDog-inspired color palette + typography
- [ ] Install libraries: React Flow, vis.js, Recharts, Plotly.js, Framer Motion, cmdk
- [ ] Create compliance mapping data structure (SOC 2 + ISO → controls)
- [ ] Build tech stack layer definitions
- [ ] Implement Cmd+K command palette (basic)
- [ ] Create control card component (DataDog-style)
- [ ] Set up dark mode theme

### Phase 2: Compliance Mapping (Week 3)

- [ ] Build SOC 2 compliance page
- [ ] Build ISO 27001 compliance page
- [ ] Create compliance coverage heatmap
- [ ] Implement SOC 2 → Control linkage in control detail
- [ ] Add "Technical Assurance" percentage calculation
- [ ] Create compliance badge component
- [ ] Test all 9 SOC 2 CC sections

### Phase 3: Interactive Visualizations (Week 4)

- [ ] Build STRIDE hexagon (with hover/click)
- [ ] Implement tech stack diagram (vis.js)
- [ ] Create attack chain flow (React Flow)
- [ ] Add mini-graph sparklines to hexagon segments
- [ ] Implement hover tooltips (DataDog-style)
- [ ] Add animations (Framer Motion)
- [ ] Test on mobile (simplified visuals)

### Phase 4: Advanced Features (Week 5)

- [ ] Implement live data updates (WebSocket or polling)
- [ ] Build code playgrounds (sandbox execution)
- [ ] Add time-series security score chart (Plotly.js)
- [ ] Create contextual links (every term linkable)
- [ ] Implement breadcrumb navigation
- [ ] Add export to PDF functionality
- [ ] Build mobile adaptations

### Phase 5: Polish + Launch (Week 6)

- [ ] User testing with 5 CISOs
- [ ] Performance optimization (< 2s load time)
- [ ] Accessibility audit (keyboard nav, screen readers)
- [ ] SEO optimization
- [ ] Documentation (how to use trust center)
- [ ] Launch 🚀

---

## Conclusion

This design:
1. ✅ **Links SOC 2/ISO 27001 to technical controls** with stack layer visibility
2. ✅ **Adopts DataDog's DRUIDS design language** for density + interactivity
3. ✅ **Goes two levels deeper** with production-grade components, advanced visualizations, and complete user journeys

**Differentiator:** "The only trust center that shows you the code, not just the certificate."

**Budget:** $45K (engineering) + $500/year (hosting)  
**Timeline:** 6 weeks  
**ROI:** Sales closer, audit prep -50% time, customer trust +30%

---

**Status:** ✅ Ready for approval  
**Next:** Prototype Cmd+K + STRIDE hexagon (Week 1)
