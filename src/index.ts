import got from 'got';
import { struct } from 'superstruct';

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
      defaultState?: object;
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

    const response = await got.post(this._apiUrl + '/server/authorize', {
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
