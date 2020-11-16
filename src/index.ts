import { API } from './api';
import {
  DocumentCheckpoint,
  MapInterpreter,
  MapMeta,
  MapStore,
} from '@roomservice/core';

export class MapClient<T> {
  private cmds: string[][];
  private store: MapStore<T>;
  private meta: MapMeta;

  id: string;

  constructor(
    name: string,
    rawCheckpoint: DocumentCheckpoint,
    cmds: string[][]
  ) {
    this.id = name;
    this.cmds = cmds;

    const { store, meta, cmd } = MapInterpreter.newMap<T>(
      rawCheckpoint.id,
      name
    );
    this.cmds.push(cmd);

    this.store = store;
    this.meta = meta;

    MapInterpreter.importFromRawCheckpoint(store, rawCheckpoint, name);
  }

  private clone(): MapClient<T> {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
  }

  get keys() {
    return Object.keys(this.store);
  }

  set(key: string, value: T) {
    const cmd = MapInterpreter.runSet(this.store, this.meta, key, value);
    this.cmds.push(cmd);
    return this.clone();
  }

  delete(key: string) {
    const cmd = MapInterpreter.runDelete(this.store, this.meta, key);
    this.cmds.push(cmd);
    return this.clone();
  }

  get(key: string): T {
    return this.store[key] as T;
  }

  toObject(): { [key: string]: T } {
    const obj = {} as { [key: string]: T };
    for (let key of this.keys) {
      obj[key] = this.get(key);
    }
    return obj;
  }
}

export class ListClient {
  push() {}
}

export class Checkpoint {
  private name: string;
  private checkpoint: DocumentCheckpoint;
  private cmds: string[][];
  private api: API;

  constructor(api: API, name: string, rawCheckpoint: DocumentCheckpoint) {
    this.api = api;
    this.name = name;
    this.checkpoint = rawCheckpoint;
    this.cmds = [];
  }

  map(name: string) {
    return new MapClient(name, this.checkpoint, this.cmds);
  }

  // list(name: string) {}

  async save() {
    await this.api.postChanges(this.name, this.cmds);
    this.cmds = [];
  }
}

type RoomServiceClientParams = string | { domain: string; secret: string };

class RoomService {
  private api: API;

  constructor(paramsOrKey: RoomServiceClientParams) {
    if (typeof paramsOrKey === 'string') {
      this.api = new API({
        domain: 'https://super.roomservice.dev',
        key: paramsOrKey,
      });
      return;
    }

    this.api = new API({
      domain: paramsOrKey.domain,
      key: paramsOrKey.secret,
    });
  }

  async checkpoint(name: string) {
    let rawCheckpoint = await this.api.getCheckpoint(name);
    if (!rawCheckpoint) {
      rawCheckpoint = (await this.api.postRoom(name)).document_raw;
    }

    return new Checkpoint(this.api, name, rawCheckpoint as DocumentCheckpoint);
  }
}

export default function createClient(params: RoomServiceClientParams) {
  return new RoomService(params);
}
