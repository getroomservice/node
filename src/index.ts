import got from 'got';
import { struct } from 'superstruct';
import { from, save } from 'automerge';
import { getMessage } from './getMessage';

const ROOM_SERVICE_API_URL = 'https://aws.roomservice.dev';

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
  scope?: 'read-only' | 'read-write';
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
      scope: params.scope || 'read-write',
    };

    if (params.scope) {
      if (!(params.scope === 'read-only' || params.scope === 'read-write')) {
        throw new Error("Scope must be either 'read-only' or 'read-write'");
      }
    }

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

  async setDoc<T = object>(
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
        throwHttpErrors: false,
      }
    );

    let docStr: string;

    if (!docResp || docResp.statusCode !== 200) {
      if (docResp.statusCode === 404) {
        await got.post(this._apiUrl + `/server/v1/rooms/${roomReference}`, {
          headers: {
            authorization: `Bearer ${this.apiKey}`,
          },
        });
        // Purely empty document
        docStr = save(from({}));
      } else {
        throw new Error(
          'Failed to retrieve the current state of the Room Service Document.'
        );
      }
    } else {
      docStr = docResp.body;
    }

    const msg = getMessage(docStr, changeCallback);

    await got.post(
      this._apiUrl +
        `/server/v1/rooms/${roomReference}/documents/${documentReference}/publishUpdate`,
      {
        json: {
          payload: {
            msg,
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
