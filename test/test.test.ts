import { DocumentCheckpoint } from '@roomservice/core';
import { ListClient, MapClient } from '../src/index';

test('MapClient adds new commands', () => {
  const cmds = [] as any;
  const map = new MapClient<any>(
    'mymap',
    {
      id: 'doc',
      maps: {},
    } as DocumentCheckpoint,
    cmds
  );

  map.set('dogs', 'any');

  expect(cmds).toEqual([
    ['mcreate', 'doc', 'mymap'],
    ['mput', 'doc', 'mymap', 'dogs', `"any"`],
  ]);
});

test('ListClient adds new commands', () => {
  const cmds = [] as any;
  const map = new ListClient(
    'list',
    {
      id: 'doc',
      lists: {},
    } as DocumentCheckpoint,
    cmds
  );

  map.push('dogs', 'any');

  expect(cmds.length).toEqual(3);
});
