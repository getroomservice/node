export class RoomServiceOutageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoomServiceOutageError';
  }
}
