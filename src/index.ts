import got from 'got';
import { struct } from 'superstruct';
import { change, load, getChanges } from 'automerge';
import { getClock } from 'automerge-clocks';

const ROOM_SERVICE_API_URL = 'https://api.roomservice.dev';

const AuthorizationBody = struct({
  room: {
    reference: 'string',
  },
});

type Room =
  | string
  | {
      reference: string;
      name?: string;
    };

type User =
  | string
  | {
      reference: string;
      name?: string;
    };

interface AuthorizeParams {
  room: Room;
  user: User;
}

export default class RoomService {
  private apiKey: string;

  // We use the local variable to make testing easier
  private _apiUrl: string = ROOM_SERVICE_API_URL;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error(
        "Your API Key is undefined. You may encounter this if you're reading it from an environment variable, but that variable isn't set."
      );
    }

    if (!apiKey.startsWith('sk_')) {
      throw new Error(
        "Your API key doesn't look right. Valid API Keys start with 'sk_'."
      );
    }

    this.apiKey = apiKey;
  }

  async authorize(
    params: AuthorizeParams
  ): Promise<{
    room: {
      reference: string;
    };
    session: {
      token: string;
    };
  }> {
    const body = {
      room:
        typeof params.room === 'string'
          ? { reference: params.room }
          : params.room,
      user:
        typeof params.user === 'string'
          ? { reference: params.user }
          : params.user,
    };

    const response = await got.post(this._apiUrl + '/server/v1/authorize', {
      json: body,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
      },
    });

    const { session, room } = JSON.parse(response.body);
    return {
      room,
      session,
    };
  }

  async updateDoc<T = object>(
    roomReference: string,
    documentReference: string,
    changeCallback: (doc: T) => void
  ) {
    const docResp = await got.get(
      this._apiUrl +
        `/server/v1/rooms/${roomReference}/documents/${documentReference}/automerge`,
      {
        headers: {
          authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!docResp || docResp.statusCode !== 200) {
      if (docResp.statusCode === 404) {
        throw new Error(
          `Document '${documentReference}' in room '${roomReference}' has not been created yet.`
        );
      }

      throw new Error(
        'Failed to retrieve the current state of the Room Service Document.'
      );
    }

    const oldDoc = load(docResp.body);
    const newDoc = change(oldDoc, changeCallback);
    const changes = getChanges(oldDoc, newDoc);
    const clock = getClock(newDoc);

    await got.post(
      this._apiUrl +
        `/server/v1/rooms/${roomReference}/documents/${documentReference}/publishUpdate`,
      {
        json: {
          payload: {
            msg: {
              changes,
              clock,
            },
          },
        },
        headers: {
          authorization: `Bearer ${this.apiKey}`,
        },
      }
    );
  }

  parseBody(
    body: object | string
  ): {
    // In the future, we may have some other options here
    // so we're keeping this an object to future-proof
    room: {
      reference: string;
    };
  } {
    let data;
    if (typeof body === 'string') {
      data = JSON.parse(body);
    } else {
      data = body;
    }

    return AuthorizationBody(data);
  }
}
