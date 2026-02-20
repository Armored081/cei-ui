# CEI UI — Deployment Guide

> **Last updated:** 2026-02-20
> **Author:** Clawd 🦞

## Quick Reference

| Resource            | Value                                                 |
| ------------------- | ----------------------------------------------------- |
| **AWS Profile**     | `cei-dev`                                             |
| **Region**          | `us-east-1`                                           |
| **Amplify App ID**  | `d1cnuuhsdb7jup`                                      |
| **Branch**          | `main`                                                |
| **Amplify URL**     | `https://main.d1cnuuhsdb7jup.amplifyapp.com`          |
| **S3 URL (legacy)** | `cei-ui-hosting-*.s3-website-us-east-1.amazonaws.com` |
| **GitHub Repo**     | `Armored081/cei-ui`                                   |

> ⚠️ **Use the Amplify URL**, not the S3 URL. The S3 bucket is raw hosting and does not receive Amplify deployments.

## Prerequisites

1. **SSO authenticated:**

   ```bash
   AWS_PROFILE=cei-dev aws sso login --no-browser
   ```

2. **Auto-build is disabled** — all deploys are manual zip uploads.

## Deploy Steps

### 1. Build

```bash
cd ~/development/cei-ui
npm run build
```

### 2. Zip from inside `dist/`

> ⚠️ **CRITICAL:** Zip the **contents** of `dist/`, not the `dist/` folder itself.
> Amplify expects `index.html` at the zip root. If you zip the folder, you get `dist/index.html` and the site returns 404.

```bash
# ✅ Correct — zip from inside dist/
cd dist && zip -r /tmp/cei-ui-deploy.zip . && cd ..

# ❌ Wrong — zips the folder, creates dist/index.html in the archive
zip -r /tmp/cei-ui-deploy.zip dist/
```

### 3. Upload & Deploy

```bash
RESULT=$(AWS_PROFILE=cei-dev aws amplify create-deployment \
  --app-id d1cnuuhsdb7jup --branch-name main \
  --region us-east-1 --output json)

JOB_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['jobId'])")
ZIP_URL=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['zipUploadUrl'])")

curl -s -T /tmp/cei-ui-deploy.zip "$ZIP_URL" > /dev/null

AWS_PROFILE=cei-dev aws amplify start-deployment \
  --app-id d1cnuuhsdb7jup --branch-name main \
  --job-id "$JOB_ID" --region us-east-1
```

### 4. Verify

```bash
# Check deploy status
AWS_PROFILE=cei-dev aws amplify get-job \
  --app-id d1cnuuhsdb7jup --branch-name main \
  --job-id "$JOB_ID" --region us-east-1 \
  --query 'job.summary.status' --output text
# Should return: SUCCEED

# Verify site loads
curl -sI "https://main.d1cnuuhsdb7jup.amplifyapp.com" | head -3
# Should return: HTTP/2 200
```

## Common Mistakes

| Mistake                                            | Symptom                                      | Fix                                              |
| -------------------------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| Zipping `dist/` folder instead of contents         | 404 on Amplify URL                           | `cd dist && zip -r ... .`                        |
| Deploying stale build (build before latest commit) | Page loads but JS errors / blank screen      | Always `npm run build` right before zipping      |
| Using S3 URL instead of Amplify URL                | Not seeing latest deploys                    | Use `https://main.d1cnuuhsdb7jup.amplifyapp.com` |
| Forgetting to rebuild after code changes           | Old asset filenames in HTML, new ones in zip | Build → Zip → Deploy (always in sequence)        |

## One-Liner (Build + Deploy)

```bash
cd ~/development/cei-ui && npm run build && \
cd dist && zip -r /tmp/cei-ui-deploy.zip . > /dev/null && cd .. && \
RESULT=$(AWS_PROFILE=cei-dev aws amplify create-deployment --app-id d1cnuuhsdb7jup --branch-name main --region us-east-1 --output json) && \
JOB_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['jobId'])") && \
ZIP_URL=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['zipUploadUrl'])") && \
curl -s -T /tmp/cei-ui-deploy.zip "$ZIP_URL" > /dev/null && \
AWS_PROFILE=cei-dev aws amplify start-deployment --app-id d1cnuuhsdb7jup --branch-name main --job-id "$JOB_ID" --region us-east-1 --query 'jobSummary.status' --output text
```

## E2E Verification (Playwright)

> **Rule: Never claim a visual fix works without automated verification.**
> Deploy → ask human → "still broken" → repeat is slow. Playwright diagnostics are 50x faster.

### Auth Setup (one-time)

```bash
cd ~/development/cei-ui
npx playwright test --project=setup
# Creates .auth/e2e-user.json (Cognito session)
```

### Quick Visual Verification

After deploying a UI fix, run a Playwright script to verify the rendered layout:

```typescript
import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  storageState: '.auth/e2e-user.json',
})
const page = await context.newPage()
await page.goto('https://main.d1cnuuhsdb7jup.amplifyapp.com/')
```

### Measuring CSS Layout Chains

For layout bugs (chart height, overlay sizing, flex collapse), measure **every container** in the chain:

```typescript
const selectors = [
  '.parent-container',
  '.intermediate-wrapper',
  '.target-element',
]
for (const sel of selectors) {
  const el = page.locator(sel).first()
  if (await el.isVisible()) {
    const box = await el.boundingBox()
    const styles = await el.evaluate((node) => {
      const cs = window.getComputedStyle(node)
      return {
        height: cs.height, minHeight: cs.minHeight,
        flex: cs.flex, display: cs.display,
        position: cs.position, overflow: cs.overflowY,
      }
    })
    console.log(`${sel}: ${box.width}x${box.height}`)
    console.log(`  h=${styles.height} flex=${styles.flex} pos=${styles.position}`)
  }
}
```

This pinpoints exactly which container has the wrong dimensions — no guessing.

### Full E2E Test Suite

```bash
cd ~/development/cei-ui
npx playwright test --project=setup --project=chromium
```

### CSS Layout Traps to Watch For

| Trap | Symptom | Fix |
|------|---------|-----|
| **Implicit grid rows** | `grid-row: 1 / -1` doesn't span all rows | Use `position: absolute` or add explicit `grid-template-rows` |
| **Flex height collapse** | Child with `flex: 1` has 0 height | Ensure every ancestor has resolved height |
| **ResponsiveContainer** | Recharts chart is tiny | Parent must have explicit resolved pixel height |
| **`height: 100%` in flex** | Percentage resolves to 0 | Use `flex: 1` instead of `height: 100%` |
| **Stacking context bleed** | Sidebar visible through overlay | Use `visibility: hidden` or higher `z-index` |

### Verification Workflow

```
1. Deploy fix to Amplify
2. Wait for SUCCEED status
3. Run Playwright diagnostic against live URL
4. Verify dimensions are correct in stdout
5. THEN tell the human it's fixed
```

## Environment Variables

Baked in at build time via `.env.production`:

| Variable                    | Purpose                                            |
| --------------------------- | -------------------------------------------------- |
| `VITE_API_URL`              | API Gateway endpoint (fallback)                    |
| `VITE_AGENT_RUNTIME_ARN`    | Bedrock AgentCore runtime ARN                      |
| `VITE_AGENTCORE_REGION`     | AgentCore region                                   |
| `VITE_USE_DIRECT_AGENTCORE` | `true` — bypasses API GW, calls AgentCore directly |
| `VITE_COGNITO_USER_POOL_ID` | Cognito pool for auth                              |
| `VITE_COGNITO_CLIENT_ID`    | Cognito app client                                 |
| `VITE_COGNITO_REGION`       | Cognito region                                     |
