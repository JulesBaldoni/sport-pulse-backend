import { sportsRepository } from './sports.repository.js'
import type { Sport } from './sports.types.js'

export const sportsService = {
  async getAllSports(): Promise<Sport[]> {
    return sportsRepository.findAll()
  },
}
