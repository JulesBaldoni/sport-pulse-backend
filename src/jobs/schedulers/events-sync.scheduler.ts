import cron from 'node-cron'
import { createChildLogger } from '@/lib/logger.js'
import { sportsApiClient } from '@/integrations/sports-api/sports-api.client.js'
import { mapFixture } from '@/integrations/sports-api/sports-api.mapper.js'
import { sportsRepository } from '@/modules/sports/sports.repository.js'
import { teamsRepository } from '@/modules/teams/teams.repository.js'
import { eventsRepository } from '@/modules/events/events.repository.js'

const log = createChildLogger('events-sync-scheduler')

// ─── Extracted pipeline functions (testable) ──────────────────────────────────

export async function runEventsSync(): Promise<number> {
  log.info('Starting scheduled events sync')

  const fixtures = await sportsApiClient.getRecentFinishedFixtures()
  log.info({ count: fixtures.length }, 'Fetched fixtures from Sports API')

  let upserted = 0

  for (const rawFixture of fixtures) {
    const sport = await sportsRepository.findBySlug('football')
    if (!sport) {
      log.warn(
        { fixtureId: rawFixture.fixture.id },
        'Sport "football" not found in DB, skipping fixture',
      )
      continue
    }

    const { event, homeTeam, awayTeam } = mapFixture(rawFixture)

    const [upsertedHome, upsertedAway] = await Promise.all([
      teamsRepository.upsertByExternalId({ ...homeTeam, sport_id: sport.id }),
      teamsRepository.upsertByExternalId({ ...awayTeam, sport_id: sport.id }),
    ])

    await eventsRepository.upsertByExternalId({
      ...event,
      sport_id: sport.id,
      home_team_id: upsertedHome.id,
      away_team_id: upsertedAway.id,
    })

    upserted++
  }

  log.info({ upserted }, `Sync complete: ${upserted} events upserted`)
  return upserted
}

// ─── Scheduler entry point ────────────────────────────────────────────────────

/** @deprecated Use startNewsDigestScheduler instead for article generation */
export function startSchedulers(): void {
  cron.schedule('0 * * * *', async () => {
    try {
      await runEventsSync()
    } catch (err) {
      log.error({ err }, 'Events sync cron job failed')
    }
  })

  log.info('Events sync scheduler started (0 * * * *)')
}
