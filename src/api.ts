import got from 'got';
import { RoomServiceOutageError } from './errs';
import { DocumentCheckpoint } from '@roomservice/core';

function maybeThrowResponseErrors(
  path: string,
  response: { statusCode: number; body: any }
) {
  if (response.statusCode >= 500) {
    throw new RoomServiceOutageError(
      `The Room Service request to "${path}" has failed with a '500'. This is likely a bug on Room Service's side. We apologize for the disruption, engineers at Room Service have likely been alerted.

The body of the response looks like this:
${JSON.stringify(response.body, null, 2)}`
    );
  }

  if (!(response.statusCode > 100 && response.statusCode < 300)) {
    throw new Error(
      `The Room Service request to "${path}" failed unexpectedly with a '${
        response.statusCode
      }'.

The body of the response looks like this:
${JSON.stringify(response.body, null, 2)}`
    );
  }
}

export interface APIParams {
  domain: string;
  key: string;
}

function bearer(token: string) {
  return `Bearer ${token}`;
}

export class API {
  private domain: string;
  private key: string;

  constructor(params: APIParams) {
    if (params.domain.endsWith('/')) {
      throw new Error(`Domain "${params.domain}" cannot end with a "/"`);
    }
    this.domain = params.domain;
    this.key = params.key;
  }

  async postRoom(
    roomName: string
  ): Promise<{ document_raw: DocumentCheckpoint }> {
    const path = this.domain + '/v1/sdk/rooms';
    const response = await got.post<any>(path, {
      headers: {
        authorization: bearer(this.key),
      },
      json: {
        name: roomName,
        document: {
          maps: {},
          lists: {},
        },
      },
      responseType: 'json',
      throwHttpErrors: false,
    });

    if (response.statusCode === 404) {
      throw new Error(
        `The Room Service request to "${path}" has failed with a '404'. If you're using a custom domain, it may be incorrectly setup. If this is the case, please reach out to Room Service support.`
      );
    }

    maybeThrowResponseErrors(path, response);

    return response.body;
  }

  async getCheckpoint(roomName: string): Promise<DocumentCheckpoint | false> {
    const path =
      this.domain +
      '/v1/sdk/rooms/' +
      encodeURIComponent(roomName) +
      '/document/checkpoint';

    const response = await got.get<any>(path, {
      headers: {
        authorization: bearer(this.key),
      },
      responseType: 'json',
      throwHttpErrors: false,
    });
    if (response.statusCode === 404) {
      return false;
    }

    maybeThrowResponseErrors(path, response);

    return response.body;
  }

  async postChanges(roomName: string, cmds: string[][]) {
    if (cmds.length > 2000) {
      throw new Error(
        "Too many changes: you're trying to save too many changes at once. Try to make less than 1000 changes at once, and save multiple times."
      );
    }
    if (cmds.length === 0) {
      return;
    }

    const path =
      this.domain +
      '/v1/sdk/rooms/' +
      encodeURIComponent(roomName) +
      '/document/changes';

    const response = await got.post(path, {
      json: {
        commands: cmds,
      },
      headers: {
        authorization: bearer(this.key),
      },
      responseType: 'json',
      throwHttpErrors: false,
    });

    if (response.statusCode === 404) {
      throw new Error(
        `The Room Service request to "${path}" has failed with a '404'. If you're using a custom domain, it may be incorrectly setup. If this is the case, please reach out to Room Service support.`
      );
    }

    maybeThrowResponseErrors(path, response);
  }
}
