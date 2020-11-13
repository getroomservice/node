export class MapClient {
  set() {}
  delete() {}
}

export class ListClient {
  push() {}
}

export class Checkpoint {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  map(name: string) {}
  list(name: string) {}
  save(...args: any[]) {}
}

export class RoomService {
  checkpoint(name: string) {
    new Checkpoint(name);
  }
}
