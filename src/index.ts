import { API } from './api';
import {
  DocumentCheckpoint,
  ListInterpreter,
  ListMeta,
  ListStore,
  MapInterpreter,
  MapMeta,
  MapStore,
} from '@roomservice/core';
import { v4 as uuid } from 'uuid';

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

  /**
   * clears all changes made to this map so they won't be saved.
   */
  clearChanges() {
    this.cmds = [];
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
  id: string;
  private cmds: string[][];
  private store: ListStore;
  private meta: ListMeta;

  constructor(
    name: string,
    rawCheckpoint: DocumentCheckpoint,
    cmds: string[][]
  ) {
    this.id = name;
    this.cmds = cmds;

    const { store, meta, cmd } = ListInterpreter.newList(
      rawCheckpoint.id,
      name,
      uuid()
    );
    this.cmds.push(cmd);
    this.store = store;
    this.meta = meta;
  }

  private clone(): ListClient {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
  }

  push<T>(...args: T[]) {
    const cmds = ListInterpreter.runPush<T>(this.store, this.meta, ...args);
    this.cmds.push(...cmds);
    return this.clone();
  }

  set<T>(index: number, value: T) {
    const cmd = ListInterpreter.runSet<T>(this.store, this.meta, index, value);
    this.cmds.push(cmd);
    return this.clone();
  }

  insertAfter<T>(index: number, value: T) {
    const cmd = ListInterpreter.runInsertAfter<T>(
      this.store,
      this.meta,
      index,
      value
    );
    this.cmds.push(cmd);
    return this.clone();
  }

  insertAt<T>(index: number, value: T) {
    const cmd = ListInterpreter.runInsertAt<T>(
      this.store,
      this.meta,
      index,
      value
    );
    this.cmds.push(cmd);
    return this.clone();
  }

  delete(index: number) {
    const cmd = ListInterpreter.runDelete(this.store, this.meta, index);
    if (!cmd) return this.clone();
    this.cmds.push(cmd);
    return this.clone();
  }

  /**
   * clears all changes made to this map so they won't be saved.
   */
  clearChanges() {
    this.cmds = [];
  }
}

export class Checkpoint {
  private name: string;
  private checkpoint: DocumentCheckpoint;
  private cmds: {
    maps: {
      [key: string]: string[][];
    };
    lists: {
      [key: string]: string[][];
    };
  };
  private api: API;

  constructor(api: API, name: string, rawCheckpoint: DocumentCheckpoint) {
    this.api = api;
    this.name = name;
    this.checkpoint = rawCheckpoint;
    this.cmds = {
      maps: {},
      lists: {},
    };
  }

  map(name: string) {
    this.cmds.maps[name] = [];
    return new MapClient(name, this.checkpoint, this.cmds.maps[name]);
  }

  list(name: string) {
    this.cmds.lists[name] = [];
    return new ListClient(name, this.checkpoint, this.cmds.lists[name]);
  }

  async save(...args: Array<MapClient<any> | ListClient>) {
    let changes: string[][] = [];

    for (let client of args) {
      if (client instanceof MapClient) {
        changes = changes.concat(this.cmds.maps[client.id]);
        client.clearChanges();
        continue;
      }
      if (client instanceof ListClient) {
        changes = changes.concat(this.cmds.lists[client.id]);
        continue;
      }
    }

    await this.api.postChanges(this.name, changes);
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
