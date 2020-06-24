import { change, load, getChanges } from 'automerge';
import { getClock } from 'automerge-clocks';

export function getMessage(docStr: string, changeCallback: (doc: any) => any) {
  const oldDoc = load(docStr);
  const newDoc = change(oldDoc, changeCallback);
  const changes = getChanges(oldDoc, newDoc);
  const clock = getClock(newDoc);

  return {
    changes,
    clock,
  };
}
