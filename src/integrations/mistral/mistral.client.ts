import { Mistral } from '@mistralai/mistralai'
import { env } from '@/config/env.js'
import { createChildLogger } from '@/lib/logger.js'
import { ExternalServiceError } from '@/lib/errors.js'
import { withRetry } from '@/lib/retry.js'

const log = createChildLogger('mistral')

class MistralClient {
  private readonly sdk: Mistral
  private static readonly MODEL = 'mistral-small-latest'
  private static readonly MAX_TOKENS = 2000
  private static readonly TEMPERATURE = 0.7

  constructor() {
    this.sdk = new Mistral({ apiKey: env.MISTRAL_API_KEY })
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const approxTokens = Math.floor((systemPrompt.length + userPrompt.length) / 4)
    log.debug({ approxTokens }, 'Sending prompt to Mistral')

    const started = Date.now()

    try {
      const response = await withRetry(
        () =>
          this.sdk.chat.complete({
            model: MistralClient.MODEL,
            maxTokens: MistralClient.MAX_TOKENS,
            temperature: MistralClient.TEMPERATURE,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        2,
        1000,
      )

      const elapsed = Date.now() - started
      log.info({ elapsedMs: elapsed, model: MistralClient.MODEL }, 'Mistral completion received')

      const text = response.choices?.[0]?.message?.content
      if (typeof text !== 'string' || text.trim() === '') {
        throw new ExternalServiceError('Mistral', 'Empty response from API')
      }

      return text
    } catch (err) {
      if (err instanceof ExternalServiceError) throw err
      const message = err instanceof Error ? err.message : 'Unknown error'
      throw new ExternalServiceError('Mistral', message, err)
    }
  }
}

export const mistralClient = new MistralClient()
