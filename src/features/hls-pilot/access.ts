export const NO_ACCESS_MESSAGE = 'no access for now';

export class PilotAccessError extends Error {
  constructor() {
    super(NO_ACCESS_MESSAGE);
    this.name = 'PilotAccessError';
  }
}
