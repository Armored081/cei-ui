# CEI Trust Center - Complete Structure & Tooling

**Date:** 2026-02-21  
**Research:** Analyzed Atlassian, SAP, Coralogix, Vanta, OneTrust patterns  
**Recommendation:** Security Architecture Visualization as sub-page within broader Trust Center  

---

## Executive Summary

After researching industry-standard trust centers, **the Security Architecture Visualization should be a deep-dive sub-page** under the "Security" section, not the entire trust center. Trust centers serve a broader audience (sales, compliance, executives, customers) with different needs than our technical deep dive.

**Key Finding:** Current tooling (D3, Mermaid, Recharts) is adequate for MVP but **interactive network topology libraries** (Cytoscape.js, vis.js) would make the architecture visualization significantly more engaging and professional.

---

## Industry Standard Trust Center Structure

Based on Atlassian, SAP, Coralogix, Vanta, and OneTrust patterns:

```
Trust Center (trust.example.com)
├── 📊 Overview
│   ├── Trust score/badge (SOC 2, ISO 27001, etc.)
│   ├── Hero message ("Built on trust")
│   ├── Quick stats (uptime, certifications, customers)
│   └── Recent updates (certifications renewed, audits passed)
│
├── 🔒 Security
│   ├── Security Overview (high-level commitments)
│   ├── Data Protection (encryption, access controls)
│   ├── Incident Response (how we handle breaches)
│   ├── Penetration Testing (cadence, findings)
│   ├── Vulnerability Management (patching, disclosure)
│   └── 🎯 Security Architecture ← OUR DEEP DIVE LIVES HERE
│
├── ✅ Compliance & Certifications
│   ├── SOC 2 Type II (report download)
│   ├── ISO 27001 (certificate)
│   ├── GDPR (compliance statement)
│   ├── HIPAA (if applicable)
│   ├── Industry-specific (PCI-DSS, FedRAMP)
│   └── Audit reports (redacted versions)
│
├── 🔐 Privacy
│   ├── Privacy Policy
│   ├── Data Processing Agreement (DPA)
│   ├── Data Subject Rights (GDPR, CCPA)
│   ├── Data Retention (how long we keep data)
│   └── Third-party vendors (sub-processors)
│
├── 🌍 Infrastructure
│   ├── Data Center Locations (map view)
│   ├── Availability Zones (redundancy)
│   ├── Network Architecture (high-level)
│   └── Disaster Recovery (RTO/RPO)
│
├── 📈 Cloud Status
│   ├── Real-time service health (status.example.com)
│   ├── Uptime history (99.9% SLA)
│   ├── Scheduled maintenance
│   └── Incident history (postmortems)
│
├── 📄 Agreements & Legal
│   ├── Terms of Service
│   ├── Service Level Agreement (SLA)
│   ├── Data Processing Agreement (DPA)
│   ├── Business Associate Agreement (BAA, if HIPAA)
│   └── AI-specific commitments (training data, model governance)
│
├── 📚 Resources
│   ├── Security whitepapers
│   ├── Compliance documentation
│   ├── Security questionnaire (pre-filled)
│   ├── Penetration test summaries
│   └── Customer case studies
│
└── 💬 Support
    ├── Contact security team
    ├── Report a vulnerability
    ├── Community forum
    └── FAQ
```

---

## Where Our Security Architecture Visualization Fits

**Location:** `Trust Center > Security > Security Architecture`  

**URL Structure:**
- Trust Center: `https://trust.cei.example.com/`
- Security Section: `https://trust.cei.example.com/security`
- **Our Page:** `https://trust.cei.example.com/security/architecture`

**Navigation Breadcrumb:**
```
Trust Center > Security > Security Architecture
```

**Positioning:**
- **Audience:** Technical stakeholders (CISOs, security engineers, architects)
- **Purpose:** Deep technical transparency into HOW security works (not just "we're secure")
- **Differentiator:** Most trust centers have high-level security statements; ours shows the internals

**Link from Parent Page:**
```markdown
## Security Overview

CEI employs defense-in-depth security across all layers...

📊 [View Detailed Security Architecture →](security/architecture)
   Explore our STRIDE-based threat model, control implementation, 
   and real-time remediation status.
```

---

## Revised Information Architecture

### Level 1: Trust Center Home (`/`)

**Purpose:** High-level trust signal for all audiences  
**Content:**
- Hero: "Built on trust. Secured by design."
- Trust badges (SOC 2, ISO 27001, certifications)
- Quick stats (99.9% uptime, 100+ enterprise customers, daily security scans)
- Recent updates (new certifications, audit completions)
- Top-level nav to Security, Compliance, Privacy, Status

**Visual:** Clean, minimal, badge-heavy (like Atlassian)

### Level 2: Security Section (`/security`)

**Purpose:** Overview of security practices for non-technical audiences  
**Content:**
- Security commitments (encryption, access control, monitoring)
- Incident response process
- Penetration testing cadence
- Vulnerability disclosure policy
- **Link to Security Architecture deep dive** (our page)

**Visual:** Combination of text + icons + simple diagrams

### Level 3: Security Architecture (`/security/architecture`) ⭐ OUR PAGE

**Purpose:** Deep technical dive for security-savvy audiences  
**Content:** The full STRIDE visualization we designed
- STRIDE hexagon (interactive)
- 3-level progressive disclosure
- Attack chain diagrams
- Remediation roadmap
- Non-gap explanations
- Verification test results

**Visual:** Highly interactive, technical, data-rich

---

## Enhanced Tooling Recommendations

### Current Plan (Good for MVP)
- **D3.js** — Hexagon visualization
- **Mermaid** — Attack chain diagrams
- **Recharts** — Progress bars, timelines

### Recommended Upgrades (Make It Pop) 🚀

#### 1. **Cytoscape.js** (Interactive Network Topology)
**Why:** Industry standard for complex, interactive network graphs  
**Use Case:** Component interaction diagrams, dependency graphs, data flow visualization  

**Example:**
```typescript
// Interactive architecture diagram with clickable nodes
import cytoscape from 'cytoscape'

const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: [
    // Nodes
    { data: { id: 'ui', label: 'CEI UI', layer: 'frontend' } },
    { data: { id: 'gateway', label: 'API Gateway', layer: 'edge' } },
    { data: { id: 'agent', label: 'AgentCore', layer: 'backend' } },
    { data: { id: 'aurora', label: 'Aurora', layer: 'data' } },
    
    // Edges (with threat annotations)
    { data: { source: 'ui', target: 'gateway', threat: 'CSRF' } },
    { data: { source: 'gateway', target: 'agent', threat: 'JWT Theft' } },
    { data: { source: 'agent', target: 'aurora', threat: 'SQL Injection' } }
  ],
  
  style: [
    {
      selector: 'node',
      style: {
        'background-color': (node) => getStatusColor(node.data('status')),
        'label': 'data(label)',
        'border-width': 3,
        'border-color': '#000'
      }
    },
    {
      selector: 'edge',
      style: {
        'line-color': (edge) => getThreatColor(edge.data('threat')),
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier'
      }
    }
  ]
})

// Click handler
cy.on('tap', 'node', function(event) {
  const node = event.target
  showControlDetails(node.data('id'))
})
```

**Benefits:**
- Drag-and-drop nodes
- Zoom/pan
- Click nodes → show controls
- Color-code by security status
- Animate attack paths

#### 2. **React Flow** (Modern Alternative to Cytoscape)
**Why:** Better React integration, cleaner API, built for interactive diagrams  
**Use Case:** Data flow diagrams, attack chain visualization, component relationships  

**Example:**
```typescript
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow'

const nodes = [
  { id: '1', data: { label: 'User Upload PDF' }, position: { x: 0, y: 0 }, type: 'input' },
  { id: '2', data: { label: 'fast-xml-parser' }, position: { x: 0, y: 100 }, className: 'vulnerable' },
  { id: '3', data: { label: 'XXE Triggered' }, position: { x: 0, y: 200 }, className: 'exploit' },
  { id: '4', data: { label: 'SSRF to AWS Metadata' }, position: { x: 0, y: 300 }, className: 'exploit' },
  { id: '5', data: { label: 'IAM Creds Leaked' }, position: { x: 0, y: 400 }, type: 'output', className: 'critical' }
]

const edges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  { id: 'e3-4', source: '3', target: '4', animated: true },
  { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#ef4444' } }
]

function AttackChainFlow() {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  )
}
```

**Benefits:**
- Cleaner React integration
- Built-in controls (zoom, pan, minimap)
- Custom node types
- Animation support
- Easier to theme

#### 3. **Rive** (Interactive Animations)
**Why:** Better than video for interactive, responsive animations  
**Use Case:** Animated attack scenarios, hover effects, state transitions  

**Example Use Case:**
- Hover over "JWT Revocation" control → animation shows token being blocked
- Click "XXE Attack" → animation plays through exploit chain
- Status changes → smooth transitions (red → yellow → green)

#### 4. **Excalidraw** (Embedded for Collaboration)
**Why:** Allow users to sketch/annotate diagrams  
**Use Case:** Customer security reviews, threat modeling workshops  

**Example:**
```typescript
import { Excalidraw } from '@excalidraw/excalidraw'

function CollaborativeDiagram() {
  return (
    <div className="h-screen">
      <Excalidraw
        initialData={{
          elements: architectureDiagramElements,
          appState: { viewBackgroundColor: '#fff' }
        }}
        onChange={(elements, state) => {
          // Save customer annotations
          saveAnnotations(elements)
        }}
      />
    </div>
  )
}
```

**Benefits:**
- Customer can annotate diagrams during security reviews
- Export to PNG/SVG
- Real-time collaboration (optional)
- Feels more transparent ("we're not hiding anything")

#### 5. **Plotly.js** (Advanced Charting)
**Why:** More powerful than Recharts for complex, interactive charts  
**Use Case:** Time-series security metrics, 3D visualizations (if needed)  

**Example:**
```typescript
import Plot from 'react-plotly.js'

function SecurityTrendChart() {
  return (
    <Plot
      data={[
        {
          x: dates,
          y: securityScores,
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Security Score',
          line: { color: '#10b981' }
        },
        {
          x: dates,
          y: vulnerabilityCounts,
          type: 'bar',
          name: 'Vulnerabilities',
          marker: { color: '#ef4444' }
        }
      ]}
      layout={{
        title: 'Security Posture Over Time',
        xaxis: { title: 'Date' },
        yaxis: { title: 'Score' }
      }}
    />
  )
}
```

#### 6. **Three.js** (3D Visualization - Optional)
**Why:** Eye-catching, modern, differentiator  
**Use Case:** 3D network topology, "security layers" visualization  

**Caution:** Can be overkill. Use only if it adds clarity, not just "cool factor"

**Example Use Case:**
```
3D layered security visualization:
- Layer 1 (top): UI/Client
- Layer 2: API Gateway / CORS
- Layer 3: AgentCore / JWT Validation
- Layer 4: Aurora / RLS
- Layer 5 (bottom): KMS / Encryption

Rotate view to see attack paths through layers
```

---

## Recommended Tech Stack (Final)

### Core Framework
- **React + TypeScript + Tailwind CSS** (as originally planned)

### Visualization Libraries
1. **React Flow** — Attack chains, data flows, component diagrams
   - `npm install reactflow`
   - Better than Mermaid for interactive diagrams
   - Native React integration

2. **Cytoscape.js** — Network topology, complex dependencies
   - `npm install cytoscape`
   - For architecture overview diagram
   - Industry standard

3. **Recharts** — Progress bars, timelines, simple charts
   - `npm install recharts`
   - Lightweight, good for basics
   - Already familiar

4. **Plotly.js** — Advanced charts, time-series trends
   - `npm install react-plotly.js`
   - For security score trends over time
   - Interactive hover states

### Animation & Interaction
5. **Rive** — Interactive animations (optional)
   - For polished attack scenario animations
   - Better than video (responsive, interactive)

6. **Framer Motion** — Smooth transitions
   - `npm install framer-motion`
   - For status changes, expand/collapse
   - Native React animations

### Code Display
7. **CodeMirror** or **Shiki** — Syntax highlighting
   - For showing implementation code
   - Live editable examples (optional)

### Layout & UI
8. **Radix UI** — Accessible primitives (as originally planned)
   - Tooltips, popovers, modals, accordions

---

## Visual Mockup Comparison

### Without Enhanced Tooling (MVP)
```
[Static hexagon diagram in SVG]
  ↓
[Mermaid diagram (static PNG)]
  ↓
[Simple bar chart]
```
**Impression:** Informative but flat, like a PDF report

### With Enhanced Tooling (Recommended)
```
[Interactive hexagon - drag/zoom/click]
  ↓
[React Flow attack chain - animated path highlighting]
  ↓
[Cytoscape network - explore dependencies]
  ↓
[Plotly timeline - hover for details]
```
**Impression:** Modern, transparent, engaging - "we have nothing to hide"

---

## Implementation Priority

### Phase 1: MVP (Use Current Plan)
- Basic React + Tailwind
- D3 hexagon (static but functional)
- Mermaid diagrams (sufficient for launch)
- Recharts (simple progress bars)

**Estimate:** 2 weeks  
**Result:** Functional, informative, but not "wow"

### Phase 2: Enhanced Visualization (Add React Flow)
- Replace Mermaid with React Flow for attack chains
- Add interactivity (click nodes, animate paths)
- Custom node types for different threat categories

**Estimate:** +1 week  
**Result:** Significantly more engaging

### Phase 3: Professional Polish (Add Cytoscape + Plotly)
- Cytoscape for architecture overview
- Plotly for advanced metrics
- Framer Motion for smooth transitions

**Estimate:** +1 week  
**Result:** Industry-leading, differentiator

### Phase 4: Optional Premium Features
- Rive animations (polished attack scenarios)
- Three.js 3D visualization (if adds value)
- Excalidraw collaboration (for customer workshops)

**Estimate:** +1-2 weeks  
**Result:** Cutting-edge, memorable

---

## Budget Considerations

### Open Source (Free)
- React Flow — MIT license ✅
- Cytoscape.js — MIT license ✅
- Recharts — MIT license ✅
- Plotly.js — MIT license ✅
- Framer Motion — MIT license ✅

### Commercial (Paid)
- Rive (Professional plan: $25/month for teams) — optional
- Three.js — Free, but may need designer time for 3D models

**Recommendation:** Start with all open-source tools (Phase 1-3), add Rive only if animations are critical (Phase 4)

---

## Competitive Analysis

### What Competitors Don't Have
- **Atlassian:** High-level statements, no deep technical diagrams
- **SAP:** Security overview, but no interactive architecture
- **Coralogix (SafeBase):** Compliance-focused, minimal technical depth
- **Vanta:** Automated compliance portal, but not architecture-specific

### Our Differentiator
**CEI would be the ONLY trust center with:**
1. Interactive STRIDE-based threat visualization
2. Real-time remediation status (not just "we're secure")
3. Non-gap explanations (educational transparency)
4. Attack chain walkthroughs with code examples

**Positioning:** "The most technically transparent trust center in the industry"

---

## Final Recommendations

### 1. Trust Center Structure
✅ **Adopt industry-standard structure** with 8 top-level sections  
✅ **Position Security Architecture as sub-page** under Security section  
✅ **URL:** `trust.cei.example.com/security/architecture`

### 2. Tooling for Architecture Page
✅ **React Flow** — Primary visualization library (replaces Mermaid)  
✅ **Cytoscape.js** — Network topology (if architecture diagram is complex)  
✅ **Plotly.js** — Advanced metrics (optional, add later)  
✅ **Framer Motion** — Smooth transitions  

### 3. Implementation Phases
✅ **Phase 1 (MVP):** Use current plan (2 weeks)  
✅ **Phase 2 (Enhanced):** Add React Flow (3 weeks total)  
✅ **Phase 3 (Professional):** Add Cytoscape + Plotly (4 weeks total)  
✅ **Phase 4 (Premium):** Rive animations (optional)

### 4. Don't Overcomplicate
❌ **Skip Three.js** unless there's a clear use case (3D often adds confusion)  
❌ **Skip Excalidraw** for MVP (add if customer workshops become common)  
⚠️ **Test with users** before adding more complexity

---

## Next Steps

1. **Create full Trust Center sitemap** (all 8 sections)
2. **Design Security section landing page** (with link to our page)
3. **Implement Phase 1 MVP** with current tooling
4. **User test with 5 technical stakeholders**
5. **Iterate based on feedback** (add React Flow if users want more interaction)
6. **Launch publicly** under `trust.cei.example.com`

---

**Document Owner:** Product + Security  
**Reviewers:** Design, Engineering, Compliance  
**Status:** Recommendation for approval  
**Next Review:** After Phase 1 MVP user testing
