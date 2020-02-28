import RoomService from '../src';
import nock from 'nock';

test('authorize', async () => {
  const client = new RoomService('sk_ima_key');
  const authCall = nock('https://api.roomservice.dev')
    .post('/server/authorize')
    .reply(200, {
      room: {
        reference: 'my-room',
      },
      session: {
        token: 'token-here',
      },
    });

  const value = await client.authorize({
    user: {
      reference: 'hi',
    },
    room: 'cool-friend',
  });

  expect(authCall.isDone()).toBeTruthy();
  expect(value).toEqual({
    room: {
      reference: 'my-room',
    },
    session: {
      token: 'token-here',
    },
  });
});

test('parseBody', async () => {
  const client = new RoomService('sk_ima_key');

  const strBody = client.parseBody(`{ "room": { "reference": "hi" } }`);
  expect(strBody).toEqual({ room: { reference: 'hi' } });

  const objBody = client.parseBody({ room: { reference: 'hi' } });
  expect(objBody).toEqual({ room: { reference: 'hi' } });
});
