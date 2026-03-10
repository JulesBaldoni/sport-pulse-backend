import { describe, it, expect } from 'vitest';
import {
  parsePaginationParams,
  encodeCursor,
  decodeCursor,
  buildPaginatedResponse,
} from '@/lib/pagination.js';
import { ValidationError } from '@/lib/errors.js';

const SAMPLE_UUID = '89d9f14d-1414-4c8d-93ce-8e81c0ca3fe2';

describe('parsePaginationParams', () => {
  it('returns default limit of 20 when limit is missing', () => {
    const result = parsePaginationParams({});
    expect(result.limit).toBe(20);
    expect(result.cursor).toBeUndefined();
  });

  it('parses a valid limit', () => {
    const result = parsePaginationParams({ limit: 50 });
    expect(result.limit).toBe(50);
  });

  it('coerces string limit to number', () => {
    const result = parsePaginationParams({ limit: '10' });
    expect(result.limit).toBe(10);
  });

  it('passes cursor through', () => {
    const cursor = encodeCursor(SAMPLE_UUID);
    const result = parsePaginationParams({ cursor, limit: 5 });
    expect(result.cursor).toBe(cursor);
  });

  it('throws ValidationError when limit > 100', () => {
    expect(() => parsePaginationParams({ limit: 101 })).toThrow(ValidationError);
  });

  it('throws ValidationError when limit < 1', () => {
    expect(() => parsePaginationParams({ limit: 0 })).toThrow(ValidationError);
  });

  it('throws ValidationError when limit is negative', () => {
    expect(() => parsePaginationParams({ limit: -5 })).toThrow(ValidationError);
  });
});

describe('encodeCursor / decodeCursor — round trip', () => {
  it('encodes and decodes back to the original UUID', () => {
    const encoded = encodeCursor(SAMPLE_UUID);
    const decoded = decodeCursor(encoded);
    expect(decoded).toBe(SAMPLE_UUID);
  });

  it('produces a base64url string (no +, /, = chars)', () => {
    const encoded = encodeCursor(SAMPLE_UUID);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('round-trips multiple different UUIDs', () => {
    const uuids = [
      '99da482a-1a70-474f-a1a0-776ac1d4283f',
      '5083e480-e25e-4e4c-9ec3-d329d8d439d4',
      '8c81cdeb-edb3-4d8f-a130-c9faab555495',
    ];
    for (const uuid of uuids) {
      expect(decodeCursor(encodeCursor(uuid))).toBe(uuid);
    }
  });
});

describe('decodeCursor — invalid input', () => {
  it('throws ValidationError when decoded value is not a UUID', () => {
    // base64url encode a non-UUID string
    const notUUID = Buffer.from('not-a-uuid', 'utf-8').toString('base64url');
    expect(() => decodeCursor(notUUID)).toThrow(ValidationError);
  });

  it('throws ValidationError for empty string', () => {
    const empty = Buffer.from('', 'utf-8').toString('base64url');
    expect(() => decodeCursor(empty)).toThrow(ValidationError);
  });
});

describe('buildPaginatedResponse', () => {
  type Item = { id: string; name: string };

  const makeItems = (n: number): Item[] =>
    Array.from({ length: n }, (_, i) => ({
      id: `item-uuid-${String(i).padStart(4, '0')}-0000-0000-0000-000000000000`,
      name: `Item ${i}`,
    }));

  it('hasMore=false and nextCursor=null when items.length <= limit', () => {
    const items = makeItems(5);
    const result = buildPaginatedResponse(items, 10);
    expect(result.meta.hasMore).toBe(false);
    expect(result.meta.nextCursor).toBeNull();
    expect(result.data).toHaveLength(5);
    expect(result.meta.count).toBe(5);
  });

  it('hasMore=false when items.length equals limit exactly', () => {
    const items = makeItems(10);
    const result = buildPaginatedResponse(items, 10);
    expect(result.meta.hasMore).toBe(false);
    expect(result.meta.nextCursor).toBeNull();
    expect(result.data).toHaveLength(10);
  });

  it('hasMore=true when items.length === limit + 1', () => {
    const limit = 5;
    const items = makeItems(limit + 1); // 6 items
    const result = buildPaginatedResponse(items, limit);
    expect(result.meta.hasMore).toBe(true);
    expect(result.data).toHaveLength(limit); // extra item popped
    expect(result.meta.count).toBe(limit);
  });

  it('nextCursor is set to encoded id of last item when hasMore=true', () => {
    const limit = 3;
    const items = makeItems(limit + 1);
    const result = buildPaginatedResponse(items, limit);
    expect(result.meta.nextCursor).not.toBeNull();
    // decode the cursor and compare to last visible item
    const lastVisibleId = items[limit - 1]!.id;
    expect(result.meta.nextCursor).toBe(encodeCursor(lastVisibleId));
  });

  it('returns empty data for empty items array', () => {
    const result = buildPaginatedResponse([], 10);
    expect(result.data).toHaveLength(0);
    expect(result.meta.hasMore).toBe(false);
    expect(result.meta.nextCursor).toBeNull();
    expect(result.meta.count).toBe(0);
  });
});

