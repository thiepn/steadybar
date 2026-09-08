import type { PracticeSession } from '../domain/models.js';

/** All durable practice commands validate the current database record, not a stale UI copy. */
export function requireActive(session: PracticeSession, expectedBlockId?: string): void {
  if (session.status !== 'active') {
    throw new Error('This session has already ended. Its saved history was not changed. Open Practice to begin a new session.');
  }
  if (expectedBlockId && session.blocks[session.activeBlockIndex]?.id !== expectedBlockId) {
    throw new Error('The active block changed before this action could be saved. Check the current block and try again.');
  }
}
