import { NotFoundError } from '@/lib/errors.js';
import { buildPaginatedResponse } from '@/lib/pagination.js';
import type { PaginatedResponse } from '@/lib/pagination.js';
import { eventsRepository } from './events.repository.js';
import type {
  Event,
  EventWithRelations,
  ListEventsParams,
} from './events.types.js';

export const eventsService = {
  async listEvents(
    params: ListEventsParams,
  ): Promise<PaginatedResponse<Event>> {
    const items = await eventsRepository.findMany(params);
    return buildPaginatedResponse(items, params.limit);
  },

  async getEventById(id: string): Promise<EventWithRelations> {
    const event = await eventsRepository.findById(id);
    if (!event) {
      throw new NotFoundError(`Event ${id} not found`);
    }
    return event;
  },
};

