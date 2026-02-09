# CEI UI Test Data Contract

The CEI UI assessment pages consume data from the assessment endpoints and rely on the schema in `src/assessment/types.ts`.

When loading generated seed data from `cei-agent` test-data packs, ensure API responses include:

## Assessment Summary Fields

- `id`
- `regulationId`
- `regulationName`
- `jurisdiction`
- `status` (`draft | in-progress | complete | approved | archived`)
- `createdAt`
- `approvedAt`
- `totalMappings`
- `mappedCount`
- `partialCount`
- `gapCount`
- `avgConfidence`

## Mapping Detail Fields

- `id`
- `assessmentId`
- `sourceRef`
- `canonicalRef`
- `sourceText`
- `section`
- `mappingStatus` (`mapped | partial | gap`)
- `confidence` (UI expects 0-100 scale in edit payloads; display supports numeric values from API)
- `nistControlId`
- `nistControlText`
- `nistFramework`
- `rcmControlId`
- `rcmControlText`
- `gapSeverity`
- `gapDescription`
- `recommendedLanguage`
- `rationale`
- `scopeDomain`
- `scopeSubject`
- `scopeAssetType`
- `scopeEnvironment`
- `scopeSummary`
- `isUserOverride`

This keeps seeded data renderable in:

- `src/components/AssessmentListPage.tsx`
- `src/components/AssessmentDetailPage.tsx`
