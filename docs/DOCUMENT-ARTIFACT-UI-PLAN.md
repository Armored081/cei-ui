# Document Artifact UI Plan

## Summary

Add a new `"document"` artifact kind to CEI-UI that surfaces templated document exports (PDF, DOCX, PPTX, CSV) distinctly from regular inline artifacts (charts, tables, recommendations). Document artifacts carry format, template, profile, QA metadata, and a download URL. They appear across all agents (CEI base, DR, R&C, VM).

**Design mockup:** `~/workspace/cei-ui-document-artifact-design.html`

---

## Architecture

### Current State

- 5 artifact kinds: `chart`, `table`, `recommendation`, `assessment-list`, `assessment-detail`
- Artifacts render via `ArtifactRegistry` → `ArtifactCard` (inline) → `ArtifactOverlay` (expanded) → `ArtifactFullScreen`
- Stream events: `{ type: "block", block: StructuredBlock }` parsed by Zod discriminated union
- Downloads: JSON export via `BlockDownloadButton`, CSV for tables

### After This Work

- 6th artifact kind: `document`
- New components with distinct visual treatment (format-colored, download-first, QA-aware)
- Agent-side: `document_export` tool result emits a `block` event with `kind: "document"`
- Download: direct S3 presigned URL (not client-side generation)

---

## Phases

### Phase 1: Schema & Types

**Files:** `src/agent/types.ts`, `src/hooks/useChatEngine.ts`

Add document block to the Zod discriminated union:

```typescript
// New block schema in structuredBlockSchema union
z.object({
  kind: z.literal('document'),
  format: z.enum(['pdf', 'docx', 'pptx', 'csv']),
  title: z.string(),
  documentId: z.string(),
  downloadUrl: z.string().url(),
  profileName: z.string().optional(),
  templateName: z.string().optional(),
  pageCount: z.number().optional(),
  fileSizeBytes: z.number(),
  agentId: z.string().optional(),
  useCaseId: z.string().optional(),
  qaMetadata: z
    .object({
      mode: z.enum(['off', 'content', 'full']),
      iterations: z.number(),
      contentPass: z.boolean(),
      visualPass: z.boolean().optional(),
      warnings: z.array(z.string()),
      adjustments: z.array(z.string()),
    })
    .optional(),
})
```

The `Artifact` interface already works — `kind` is a string, `block` is a `StructuredBlock`. No changes needed to the artifact extraction pipeline.

**Tests:** 5+ — schema validation for document blocks, required fields, optional fields, invalid formats rejected.

---

### Phase 2: Document Card Component

**Files:** `src/primitives/DocumentCard.tsx`, `src/primitives/document-card.css`

The inline card shown in the artifact sidebar and chat stream. Visually distinct from `ArtifactCard`:

**Structure:**

```
┌─────────────────────────────────────────────┐
│ [Format Icon]  AGENT LABEL                  │
│  📄 PDF        Document Title Here     [↓]  │
│                24 pages · 2.1 MB       QA ✓ │
│                Board Report                  │
└─────────────────────────────────────────────┘
```

**Design tokens (new in `tokens.css`):**

```css
--doc-surface: rgba(26, 34, 51, 0.65);
--doc-border: rgba(229, 165, 48, 0.18);
--doc-border-hover: rgba(229, 165, 48, 0.4);
--doc-format-pdf: #e85c6f;
--doc-format-docx: #5b8def;
--doc-format-pptx: #e89040;
--doc-format-csv: #5ce0b8;
--doc-qa-pass: #5ce0b8;
--doc-qa-warn: #e5a530;
```

**Props:**

```typescript
interface DocumentCardProps {
  artifact: Artifact
  isSelected?: boolean
  onClick: (artifactId: string) => void
}
```

**Behavior:**

- Format icon with gradient background in format's color
- Agent source label (DR Agent, R&C Agent, etc.) above title
- Metadata row: page/slide count, file size, profile name
- Direct download button (right-aligned) — triggers `window.open(downloadUrl)` or fetch+blob
- QA badge: "✓ QA passed" (green) or "⚠ N warnings" (amber)
- Amber-tinted border instead of standard block-border
- Hover: border brightens, subtle translateY(-2px), radial glow

**Tests:** 8+ — renders all 4 formats, shows metadata, download click handler, QA badge variants, selected state, agent label.

---

### Phase 3: Document Pill Component

**Files:** `src/primitives/DocumentPill.tsx`, `src/primitives/document-pill.css`

Inline reference in chat text when the agent mentions a generated document.

**Structure:**

```
Your report is ready: [PDF Board Report]
```

**Props:**

```typescript
interface DocumentPillProps {
  documentId: string
  format: 'pdf' | 'docx' | 'pptx' | 'csv'
  title: string
  onClick: (documentId: string) => void
}
```

**Behavior:**

- Pill shape (border-radius: 999px)
- Format badge chip with format color background
- Title with ellipsis overflow
- Click opens expanded document panel

**Chat integration:** The agent's response text can include document references. Two approaches:

- **Option A (recommended):** The agent includes the document block as a structured block event; the UI renders the `DocumentCard` in the artifact rail. No special inline parsing needed.
- **Option B (future):** Parse `{{document:ID}}` markers in agent text and render as `DocumentPill` inline. Requires a text post-processor.

Start with Option A. Pills are available as a component for future use.

**Tests:** 5+ — renders all formats, title truncation, click handler, format badge colors.

---

### Phase 4: Document Panel (Expanded View)

**Files:** `src/primitives/DocumentPanel.tsx`, `src/primitives/document-panel.css`

Replaces `ArtifactOverlay`/`ArtifactExpanded` when viewing a document artifact.

**Sections:**

1. **Header:** Large format icon + title + agent/use-case label + metadata grid (pages, size, profile, document ID)
2. **QA Section** (if qaMetadata present): 2×2 grid of check results (Content, Visual, Slides/Pages, Branding/Fixes), overall pass/warn status with pulsing dot
3. **Template Info:** Branding swatch + template name + inheritance chain label (platform → tenant → use-case)
4. **Actions Bar:** Download (primary amber CTA), Regenerate, Copy Link

**Props:**

```typescript
interface DocumentPanelProps {
  artifact: Artifact
  onClose: () => void
  onRegenerate?: (documentId: string) => void
  fullScreen?: boolean
}
```

**Download behavior:**

- Primary button: `window.open(downloadUrl, '_blank')` for direct download
- Copy Link: copy `downloadUrl` to clipboard with toast notification

**Regenerate behavior:**

- Calls back to the agent via a new message: "Regenerate document {documentId} in {format} format"
- Or triggers `document_export` tool call with same parameters (TBD based on agent API)

**Tests:** 10+ — header metadata, QA section visibility, QA pass/warn states, template info, download action, regenerate action, fullscreen mode, close handler.

---

### Phase 5: Document Generation Progress

**Files:** `src/primitives/DocumentGenerating.tsx`, `src/primitives/document-generating.css`

Progress indicator shown while `document_export` tool is executing.

**Structure:**

```
[Spinner] Generating PDF report…
          rendering artifacts → tagged IR...
```

**Integration:** When the stream includes a `tool_call` event with `name: "document_export"`, render `DocumentGenerating` instead of the standard tool activity indicator. The spinner color matches the requested format.

**Props:**

```typescript
interface DocumentGeneratingProps {
  format: 'pdf' | 'docx' | 'pptx' | 'csv'
  step?: string // Current pipeline step from tool progress
}
```

**Tests:** 4+ — renders all formats, spinner color matches format, step text displayed, fallback when no step.

---

### Phase 6: Format Picker Component

**Files:** `src/primitives/FormatPicker.tsx`, `src/primitives/format-picker.css`

Optional UI for when the agent offers multiple export formats. Renders as a row of format option cards.

**Structure:**

```
[📄 PDF          ] [📝 DOCX         ] [📑 PPTX         ] [📊 CSV          ]
 Board-ready       Editable document   Presentation deck   Data export
```

**Props:**

```typescript
interface FormatPickerProps {
  formats: Array<{
    format: 'pdf' | 'docx' | 'pptx' | 'csv'
    description: string
  }>
  selected?: string
  onSelect: (format: string) => void
}
```

**Integration:** The agent can emit a custom block with `kind: "format-picker"` when offering choices, or this can be rendered from inline buttons in the chat. Defer exact integration to implementation.

**Tests:** 5+ — renders all format options, selected state, click handler, format colors.

---

### Phase 7: Registry Integration & Wiring

**Files:** `src/artifacts/renderers/DocumentArtifact.tsx`, `src/artifacts/registerBuiltinTypes.ts`, `src/primitives/ArtifactCard.tsx`, `src/primitives/ArtifactPill.tsx`

**Register the document artifact type:**

```typescript
export const documentArtifactDefinition: ArtifactTypeDefinition = {
  kind: 'document',
  renderInline: (artifact) => <DocumentCard artifact={artifact} onClick={() => {}} />,
  renderExpanded: (artifact, _, onClose) => <DocumentPanel artifact={artifact} onClose={onClose!} />,
  renderFullScreen: (artifact, _, onClose, onToggle) => (
    <DocumentPanel artifact={artifact} onClose={onClose!} fullScreen />
  ),
}
```

Add to `registerBuiltinTypes.ts` alongside existing definitions.

**Update ArtifactPill:** Add document format icon to `kindIcon()`:

```typescript
if (kind === 'document') return '\u{1F4C4}' // 📄
```

**Update ArtifactCard:** The existing fallback rendering already handles unknown kinds, but `DocumentCard` will take over via the registry `definition.renderInline()` path.

**Tests:** 5+ — registry has document kind, renderInline returns DocumentCard, renderExpanded returns DocumentPanel, ArtifactPill shows document icon.

---

### Phase 8: Agent-Side Block Emission (CEI-Agent)

**Files (in `cei-agent` repo):**

- `src/tools/document-export.ts` — update tool result to include block emission metadata
- `src/shared/api/schemas.ts` — add document block to stream event schema (if needed)

**What changes:**
The `document_export` tool already returns `{ documentId, url, format, pageCount, fileSizeBytes }`. We need the agent framework to emit this as a structured block event so the UI picks it up.

**Two options:**

- **Option A:** The agent's response naturally includes the document info in text + the tool result gets converted to a block event by the stream adapter
- **Option B:** The tool itself emits a structured block event via the stream

This depends on how the AgentCore stream adapter works. If tool results automatically become blocks when they match a known schema, Option A works. Otherwise, the tool needs to explicitly emit a block.

**Note:** This phase touches `cei-agent`, not `cei-ui`. It's the bridge that connects the backend to the frontend.

**Tests:** 3+ — tool result includes all fields needed for document block, block schema matches UI expectations.

---

## Design Tokens Summary

Add to `src/theme/tokens.css`:

```css
/* Document artifact */
--doc-surface: rgba(26, 34, 51, 0.65);
--doc-surface-hover: rgba(26, 34, 51, 0.85);
--doc-border: rgba(229, 165, 48, 0.18);
--doc-border-hover: rgba(229, 165, 48, 0.4);
--doc-glow: rgba(229, 165, 48, 0.06);
--doc-format-pdf: #e85c6f;
--doc-format-docx: #5b8def;
--doc-format-pptx: #e89040;
--doc-format-csv: #5ce0b8;
--doc-qa-pass: #5ce0b8;
--doc-qa-warn: #e5a530;
--doc-qa-fail: #e85c6f;
--font-document: 'Fraunces', 'Georgia', serif;
```

---

## File Summary

### New Files (CEI-UI)

| File                                           | Purpose               |
| ---------------------------------------------- | --------------------- |
| `src/primitives/DocumentCard.tsx`              | Inline document card  |
| `src/primitives/document-card.css`             | Card styles           |
| `src/primitives/DocumentPill.tsx`              | Inline pill reference |
| `src/primitives/document-pill.css`             | Pill styles           |
| `src/primitives/DocumentPanel.tsx`             | Expanded detail panel |
| `src/primitives/document-panel.css`            | Panel styles          |
| `src/primitives/DocumentGenerating.tsx`        | Progress indicator    |
| `src/primitives/document-generating.css`       | Progress styles       |
| `src/primitives/FormatPicker.tsx`              | Multi-format selector |
| `src/primitives/format-picker.css`             | Picker styles         |
| `src/artifacts/renderers/DocumentArtifact.tsx` | Registry definition   |

### Modified Files (CEI-UI)

| File                                    | Change                          |
| --------------------------------------- | ------------------------------- |
| `src/agent/types.ts`                    | Add document block to Zod union |
| `src/artifacts/registerBuiltinTypes.ts` | Register document kind          |
| `src/primitives/ArtifactPill.tsx`       | Add document icon               |
| `src/theme/tokens.css`                  | Add document design tokens      |

### Modified Files (CEI-Agent)

| File                           | Change                    |
| ------------------------------ | ------------------------- |
| `src/tools/document-export.ts` | Emit document block event |

---

## Execution Plan

| Phase     | Name                 | Est. Time | Tests    |
| --------- | -------------------- | --------- | -------- |
| 1         | Schema & Types       | 10 min    | 5+       |
| 2         | Document Card        | 20 min    | 8+       |
| 3         | Document Pill        | 10 min    | 5+       |
| 4         | Document Panel       | 25 min    | 10+      |
| 5         | Generation Progress  | 10 min    | 4+       |
| 6         | Format Picker        | 10 min    | 5+       |
| 7         | Registry & Wiring    | 15 min    | 5+       |
| 8         | Agent Block Emission | 15 min    | 3+       |
| **Total** |                      | **~2h**   | **~45+** |

**Codex run groupings:**

- **Run 1:** Phases 1-3 (schema + card + pill)
- **Run 2:** Phases 4-6 (panel + progress + picker)
- **Run 3:** Phase 7 (registry wiring)
- **Run 4:** Phase 8 (agent-side, in `cei-agent` repo)

---

## Non-Goals (V1)

- **Inline pill parsing** — no `{{document:ID}}` markers in agent text; documents show as cards in the artifact rail
- **Slide preview thumbnails** — no rendering PPTX slides as preview images in the panel
- **Re-export with different profile** — regenerate uses same profile; profile switching is V2
- **Document history/versioning** — no tracking multiple generations of the same assessment export
- **Drag-and-drop reordering** — documents appear in chronological order in the artifact rail
- **Offline/cached downloads** — downloads go direct to S3; no service worker caching

## Future (V2+)

- Inline document pills in chat text via marker parsing
- Slide preview carousel in PPTX panel (render first 3 slides as thumbnails)
- Profile switcher in the panel (re-export same content with different profile)
- Document history timeline (see all exports for an assessment)
- Batch export (generate all 4 formats at once)
- QA detail drill-down (click a QA warning to see the specific slide/page issue)
