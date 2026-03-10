import { NotFoundError } from '@/lib/errors.js'
import { usersRepository } from './users.repository.js'
import type { User, UpdatePreferencesInput } from './users.types.js'

export const usersService = {
  async getMe(userId: string): Promise<User> {
    const user = await usersRepository.findById(userId)
    if (!user) {
      throw new NotFoundError(`User ${userId} not found`)
    }
    return user
  },

  async updatePreferences(userId: string, data: UpdatePreferencesInput): Promise<User> {
    return usersRepository.updatePreferences(userId, data)
  },
}
