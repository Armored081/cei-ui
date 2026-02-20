import type { StoryCard as ModernContextStoryCard } from '../../types/modern-context.js'

/**
 * Builds a valid story card for tests.
 */
export function buildStoryCard(
  overrides: Partial<ModernContextStoryCard> = {},
): ModernContextStoryCard {
  return {
    id: 'story-1',
    title: 'Credential abuse attempts spiked',
    severity: 'high',
    narrative: 'Failed privileged authentication attempts increased by 42% week-over-week.',
    correlatedEntities: [
      {
        type: 'risk',
        id: 'RSK-1',
        name: 'Credential Abuse Risk',
      },
      {
        type: 'control',
        id: 'AC-2',
        name: 'Account Management',
      },
    ],
    temporalWindow: {
      startDate: '2026-01-10',
      endDate: '2026-01-16',
    },
    triggerMetrics: ['failed_auth_rate'],
    recommendedActions: ['Require phishing-resistant MFA'],
    ...overrides,
  }
}
