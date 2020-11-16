const createClient = require('@roomservice/node').default;

const client = createClient({
  // Locally generated test key, not ive
  secret: 'QYCRn_yFLYnl5uScW44YN',
  domain: 'http://localhost:3453',
});

async function main() {
  const room = await client.checkpoint('aoiwjef');
  const map = room.map('coolmap');

  map
    .set('dog', 'good')
    .set('cat', 'also good')
    .set('snake', 'good snake no bite')
    .set('time', new Date().toString());

  room.save();
}

main().catch(console.error);
