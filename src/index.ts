import got from "got";
import { struct } from "superstruct";

const ROOM_SERVICE_API_URL = "https://api.roomservice.dev";

const AuthorizationBody = struct({
  room: {
    reference: "string"
  }
});

type Room =
  | string
  | {
      reference: string;
      name?: string;
      defaultState?: object;
    };

type Guest =
  | string
  | {
      reference: string;
      name?: string;
      defaultState?: object;
    };

interface AuthorizeParams {
  room: Room;
  guest: Guest;
}

export default class RoomService {
  private apiKey: string;

  // We use the local variable to make testing easier
  private _apiUrl: string = ROOM_SERVICE_API_URL;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Your API Key is undefined. You may encounter this if you're reading it from an environment variable, but that variable isn't set.")
    }

    if (!apiKey.startsWith("sk_")) {
      throw new Error(
        "Your API key doesn't look right. Valid API Keys start with 'sk_'."
      );
    }

    this.apiKey = apiKey;
  }

  async authorize(res: any, params: AuthorizeParams) {
    const body = {
      room:
        typeof params.room === "string"
          ? { reference: params.room }
          : params.room,
      guest:
        typeof params.room === "string"
          ? { reference: params.guest }
          : params.guest
    };

    try {
      const response = await got.post(this._apiUrl + "/server/authorize", {
        json: body,
        headers: {
          authorization: `Bearer ${this.apiKey}`
        }
      });

      const { session, room } = JSON.parse(response.body);

      res.status(200);
      res.json({
        room,
        session
      });
    } catch (err) {
      console.error("error", err);
      res.status(500).end();
    }
  }

  parse(
    body: any
  ): {
    // In the future, we may have some other options here
    // so we're keeping this an object to future-proof
    room: {
      reference: string;
    };
  } {
    return AuthorizationBody(body);
  }
}
