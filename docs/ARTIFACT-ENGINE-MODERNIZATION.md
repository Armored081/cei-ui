# Artifact Engine Modernization Plan

> **Created:** 2026-02-19
> **Author:** Clawd 🦞
> **Status:** PLAN — Awaiting approval

## Problem Statement

The current artifact viewing experience has critical UX issues:

1. **Cramped overlay drawer** — When clicking an artifact from the right rail, the "expanded" view opens as an overlay that starts at `left: 15%`, giving it ~85% of the center+right columns. But the artifact renderer inside (tables, charts, recommendations) is squeezed into a small viewport with no room to breathe.

2. **Three zoom levels that don't make sense** — `inline` → `expanded` (overlay) → `fullscreen`. The "expanded" level is neither useful nor well-sized. Users have to click twice to get a usable view.

3. **Two drawer primitives, inconsistent usage** — `SlideOver` (left-sliding panel, 320px fixed) and `SlideUpDrawer` (bottom sheet for mobile artifacts). Neither is optimized for data-rich artifact content.

4. **No awareness of artifact type** — A table with 8 columns needs full width. A recommendation card needs 400px max. The overlay treats all artifacts identically.

5. **Mobile artifact viewing is broken** — `SlideUpDrawer` with `maxHeight: 72vh` for a table that needs horizontal scroll = unusable.

## Inspiration: Datadog's Pattern

Datadog's dashboard UX has a key insight: **context-aware detail panels**.

- **Click a widget** → side panel slides in from the right, taking ~60% of viewport width
- **The panel is content-aware** — tables get horizontal scroll, charts resize to fill, text flows naturally
- **Full-screen is one click** — expand button in the toolbar takes over the entire viewport
- **Keyboard-driven** — Escape to close, arrow keys to navigate between widgets
- **The panel overlays content but doesn't destroy layout** — the grid underneath stays put

Key differences from our current approach:
- Datadog's panel is **generous with width** (60%+ of viewport, not crammed)
- Panel height is **100% of the available area** (not a small floating card)
- **Toolbar is minimal** — close, fullscreen, download. No chrome bloat.
- **Content fills the space** — no arbitrary max-widths on the renderer

## Current Architecture

### Artifact Types (6 renderers)

| Kind | Renderer | Content Nature | Ideal Width |
|------|----------|---------------|-------------|
| `chart` | `ChartArtifact` | Bar/line/pie charts (Recharts) | 500px–full |
| `table` | `TableArtifact` | Sortable data tables | Full width (scrollable) |
| `recommendation` | `RecommendationArtifact` | Severity + text card | 400–600px |
| `assessment-list` | `AssessmentListArtifact` | List of scored assessments | 500–700px |
| `assessment-detail` | `AssessmentDetailArtifact` | Single assessment deep-dive | 600px–full |
| `document` | `DocumentArtifact` | Policy/standard document view | 600–800px |

### Current Zoom Levels

```
inline (right rail card) → expanded (overlay, 85% width) → fullscreen (entire viewport)
```

### Current Components

| Component | Purpose | Issues |
|-----------|---------|--------|
| `ArtifactCard` | Right rail thumbnail | OK — just a clickable card |
| `ArtifactOverlay` | "Expanded" panel | Too cramped, no content-awareness |
| `ArtifactFullScreen` | Takeover view | Works but requires 2 clicks |
| `ArtifactExpanded` | Inner content wrapper | Redundant abstraction |
| `SlideOver` | Generic left-slide panel | Used for mobile threads, not artifacts |
| `SlideUpDrawer` | Mobile bottom sheet | Used for mobile artifacts, too small |

## Proposed Design: Two-Level Detail Panel

### Simplify to 2 zoom levels

```
inline (right rail card) → detail panel (replaces expanded + fullscreen)
```

**Kill the 3-level zoom.** When you click an artifact, you want to *see* it. One click = full detail view.

### Detail Panel Behavior

#### Desktop (>1024px)

- **Panel slides in from the right**, overlaying the right rail + part of center
- **Width: `max(50%, 640px)`** — generous default, content can breathe
- **Height: 100% of grid row** — top to bottom, no floating card
- **Content-aware sizing:**
  - Tables/charts: panel expands to `max(65%, 800px)` 
  - Recommendations: panel stays at `max(50%, 640px)`
  - Documents: panel uses `max(55%, 700px)`
- **Fullscreen toggle** — single button in toolbar, takes over entire viewport (same as current `ArtifactFullScreen` but reachable in 1 click from the card)

#### Tablet (768px–1024px)

- **Panel takes 100% width** as a full overlay (left/right rails hidden)
- **Close button returns to conversation**
- Same fullscreen toggle available

#### Mobile (<768px)

- **Full-screen only** — skip the panel entirely, go straight to fullscreen view
- Back button returns to conversation
- No intermediate "drawer" or "bottom sheet" — just the content, full viewport

### Toolbar Design (Datadog-inspired)

```
[← Back] [‹ 2/11 ›] Title                    [JSON] [⤢ Fullscreen] [✕ Close]
```

- **Compact, single-row** — no wasted vertical space
- **Navigation arrows** — browse artifacts without closing
- **Position indicator** — "2/11" shows context
- **Download/JSON** — export action
- **Fullscreen** — one-click expand to take over viewport
- **Close** — return to conversation

### Content Rendering Improvements

1. **Tables**: Full horizontal scroll within the panel. No max-width on `<table>`. Column headers stick on scroll.
2. **Charts**: Auto-resize to panel width via `ResponsiveContainer`. Minimum height 300px.
3. **Recommendations**: Centered card layout with generous padding. Severity badge prominent.
4. **Assessments**: Proper score visualization, full-width finding lists.
5. **Documents**: Reading-optimized layout (max 75ch line width, comfortable line-height).

## Implementation Phases

### Phase 1: Detail Panel Core (replaces ArtifactOverlay)
- New `ArtifactDetailPanel` component
- Content-aware width calculation based on artifact kind
- Responsive breakpoints (desktop/tablet/mobile)
- Keyboard navigation (Escape, arrows, F for fullscreen)
- Smooth slide-in animation
- Remove `ArtifactExpanded` (merge into detail panel)
- Update `CommandCenter` zoom state to 2 levels
- **Tests:** Panel rendering, keyboard nav, responsive behavior, zoom transitions

### Phase 2: Renderer Improvements
- Tables: sticky headers, horizontal scroll, auto-column sizing
- Charts: responsive container, proper aspect ratios, pan/zoom on mobile
- Recommendations: redesigned card with proper severity visualization
- Documents: reading mode with comfortable typography
- **Tests:** Each renderer in detail panel context, responsive sizing

### Phase 3: Mobile Experience
- Skip panel on mobile → go directly to fullscreen
- Swipe-to-dismiss gesture
- Swipe left/right to navigate between artifacts
- Remove `SlideUpDrawer` usage for artifacts
- **Tests:** Mobile gesture handling, direct-to-fullscreen flow

### Phase 4: Polish & Animation
- Panel slide-in with spring physics (not linear ease)
- Content fade-in with stagger (title → toolbar → content)
- Artifact card highlight/pulse when selected
- Smooth resize animation when switching between artifacts of different types
- **Tests:** Animation class presence, reduced-motion respect

## Files to Modify/Create

### New
- `src/primitives/ArtifactDetailPanel.tsx` — main detail panel
- `src/primitives/artifact-detail-panel.css` — panel styles
- `src/primitives/ArtifactDetailPanel.test.tsx` — tests

### Modify
- `src/layouts/CommandCenter.tsx` — simplify zoom state to 2 levels
- `src/layouts/CommandCenter.test.tsx` — update tests
- `src/layouts/layout-command-center.css` — grid adjustments for panel
- `src/artifacts/renderers/TableArtifact.tsx` — sticky headers, auto-sizing
- `src/artifacts/renderers/ChartArtifact.tsx` — responsive container
- `src/artifacts/renderers/artifact-renderers.css` — renderer improvements

### Remove (after migration)
- `src/primitives/ArtifactOverlay.tsx` — replaced by detail panel
- `src/primitives/ArtifactOverlay.test.tsx`
- `src/primitives/artifact-overlay.css`
- `src/primitives/ArtifactExpanded.tsx` — merged into detail panel
- `src/primitives/artifact-expanded.css`
- `SlideUpDrawer` artifact usage (component stays for other uses)

## Migration Strategy

1. Build `ArtifactDetailPanel` alongside existing overlay
2. Feature-flag: `useDetailPanel` prop on CommandCenter
3. Validate with all 6 artifact types
4. Remove old overlay components
5. Clean up dead CSS

## Success Criteria

- [ ] Single click from artifact card → full, usable detail view
- [ ] Tables are horizontally scrollable with sticky headers
- [ ] Charts resize to fill available space
- [ ] Mobile goes directly to fullscreen (no cramped drawer)
- [ ] Keyboard navigation works (Escape, arrows, F)
- [ ] All 6 artifact types render properly at all breakpoints
- [ ] No regression in existing 252 tests + new tests for detail panel
- [ ] Animations respect `prefers-reduced-motion`
