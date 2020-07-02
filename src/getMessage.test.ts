import { from, change, save } from 'automerge';
import { applyChanges } from './getMessage';

test('recovery from Object.assign', () => {
  let doc = from<any>({
    label: 'yay',
  });

  const withoutSymbols = Object.assign({}, doc);

  const { changes } = applyChanges(withoutSymbols, d => {
    d.label = 'woo';
  });

  expect(changes.length).toEqual(1);
});
