import { test, expect, type Page } from '@playwright/test'

const PROMPT = 'Generate a chart of technical standards and policies by NIST CSF V2 category'

/**
 * Navigate to chat and start a new thread if not already on one.
 */
async function navigateToChat(page: Page): Promise<void> {
  await page.goto('/')

  // Click Chat nav item
  const chatNav = page.locator('.cei-app-sidebar').getByText('Chat', { exact: true }).first()
  await expect(chatNav).toBeVisible({ timeout: 10_000 })
  await chatNav.click()

  // Wait for the chat shell to be ready
  await expect(page.locator('.cei-cc-shell').first()).toBeVisible({ timeout: 15_000 })
}

/**
 * Send a message in the chat composer.
 */
async function sendMessage(page: Page, message: string): Promise<void> {
  // Find the composer input (textarea or input with placeholder)
  const composer = page.getByPlaceholder(/message the agent/i)
  await expect(composer).toBeVisible({ timeout: 10_000 })

  await composer.fill(message)

  // Press Enter to send (or click the send button if present)
  const sendBtn = page.locator('button[aria-label*="send" i], button[type="submit"]').first()
  if (await sendBtn.isVisible().catch(() => false)) {
    await sendBtn.click()
  } else {
    await composer.press('Enter')
  }
}

/**
 * Wait for the agent to finish responding.
 * Looks for streaming to complete (no more typing indicators, tool calls finish).
 */
async function waitForAgentResponse(page: Page, timeoutMs = 120_000): Promise<void> {
  // Wait for an agent message bubble to appear (streaming started)
  await expect(
    page.locator('.cei-message-bubble:not(.cei-message-user)').first(),
  ).toBeVisible({ timeout: 30_000 })

  // Wait for artifacts to appear (the agent generates chart artifacts)
  // This is the most reliable signal the agent finished meaningfully
  const deadline = Date.now() + timeoutMs
  let hasArtifacts = false
  while (Date.now() < deadline) {
    const artifactCount = await page
      .locator('.cei-artifact-card, [data-testid="context-rail-artifacts"] .cei-artifact-card')
      .count()
    if (artifactCount > 0) {
      // Wait a bit more to ensure streaming is fully done
      await page.waitForTimeout(3_000)
      hasArtifacts = true
      break
    }
    await page.waitForTimeout(2_000)
  }

  if (!hasArtifacts) {
    throw new Error(`Agent did not produce artifacts within ${(timeoutMs / 1000).toString()}s`)
  }
}

test.describe('Chart artifact rendering', () => {
  test('generates chart from NIST CSF prompt and renders readable artifact', async ({ page }) => {
    await navigateToChat(page)

    // Start a new thread
    const newThreadBtn = page.getByText('+ New Thread', { exact: false })
    if (await newThreadBtn.isVisible().catch(() => false)) {
      await newThreadBtn.click()
      await page.waitForTimeout(1_000)
    }

    // Send the chart prompt
    await sendMessage(page, PROMPT)

    // Wait for the agent to respond with artifacts
    await waitForAgentResponse(page)

    // Take a screenshot of the full chat response
    await page.screenshot({ path: 'e2e/screenshots/01-agent-response.png', fullPage: true })

    // Find a chart artifact card (in the context rail or mobile drawer)
    // On desktop, artifacts appear in the right rail
    // On mobile, they appear in a slide-up drawer
    let chartCard = page.locator('.cei-artifact-card').filter({ hasText: /chart/i }).first()

    // If no chart card visible (mobile mode), try opening the artifacts drawer
    if (!(await chartCard.isVisible().catch(() => false))) {
      // Look for mobile artifacts button
      const artifactsBtn = page
        .locator('button')
        .filter({ hasText: /artifact/i })
        .first()
      if (await artifactsBtn.isVisible().catch(() => false)) {
        await artifactsBtn.click()
        await page.waitForTimeout(500)
      }

      chartCard = page.locator('.cei-artifact-card').filter({ hasText: /chart/i }).first()
    }

    // Click the chart artifact to open expanded view
    await expect(chartCard).toBeVisible({ timeout: 10_000 })
    await chartCard.click()

    // Wait for the artifact overlay to appear
    await expect(page.locator('.cei-artifact-overlay-panel')).toBeVisible({ timeout: 5_000 })

    // Verify the expanded chart renders
    const chartContainer = page.locator('.cei-artifact-overlay-panel .cei-chart-wrapper')
    await expect(chartContainer).toBeVisible({ timeout: 5_000 })

    // Take a screenshot of the expanded artifact
    await page.screenshot({ path: 'e2e/screenshots/02-chart-artifact-expanded.png' })

    // Verify the chart has reasonable dimensions (not tiny)
    const chartBox = await chartContainer.boundingBox()
    expect(chartBox).toBeTruthy()
    expect(chartBox!.height).toBeGreaterThan(150)
    expect(chartBox!.width).toBeGreaterThan(200)

    // Verify the close button exists and is touch-friendly
    const closeBtn = page.getByLabel('Close artifact view')
    await expect(closeBtn).toBeVisible()
    const closeBtnBox = await closeBtn.boundingBox()
    expect(closeBtnBox).toBeTruthy()
    expect(closeBtnBox!.width).toBeGreaterThanOrEqual(38)
    expect(closeBtnBox!.height).toBeGreaterThanOrEqual(38)

    // Verify the fullscreen button exists
    const fullscreenBtn = page.getByLabel('Open full-screen artifact view')
    await expect(fullscreenBtn).toBeVisible()

    // Verify the overlay title matches
    const overlayTitle = page.locator('.cei-artifact-overlay-title')
    await expect(overlayTitle).toBeVisible()

    // Verify recharts SVG rendered inside the chart wrapper (use role=application for main chart SVG)
    const svgChart = chartContainer.locator('svg.recharts-surface[role="application"]')
    await expect(svgChart).toBeVisible({ timeout: 5_000 })

    // Verify the chart SVG has reasonable dimensions
    const svgBox = await svgChart.boundingBox()
    expect(svgBox).toBeTruthy()
    expect(svgBox!.height).toBeGreaterThan(100)
    expect(svgBox!.width).toBeGreaterThan(200)

    // Verify bar chart has actual bars rendered
    const bars = chartContainer.locator('.recharts-bar-rectangle, .recharts-rectangle')
    const barCount = await bars.count()
    expect(barCount).toBeGreaterThan(0)

    // Close the overlay via the close button
    await closeBtn.click()
    await expect(page.locator('.cei-artifact-overlay-panel')).not.toBeVisible({ timeout: 5_000 })

    // Take final screenshot showing chat with artifacts rail
    await page.screenshot({ path: 'e2e/screenshots/03-after-close.png' })
  })
})
