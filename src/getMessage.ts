import { change, load, getChanges, from } from 'automerge';
import { getClock } from 'automerge-clocks';

export function applyChanges(doc: any, changeCallback: (doc: any) => any) {
  try {
    const newDoc = change(doc, changeCallback);
    const changes = getChanges(doc, newDoc);
    const clock = getClock(newDoc);

    return {
      changes,
      clock,
    };
  } catch (err) {
    // Occasionally, folks can wipe the symbols from their document.
    // This is a way to recover.

    const oldDoc = from(doc);
    const newDoc = change(oldDoc, changeCallback);
    const changes = getChanges(oldDoc, newDoc);
    const clock = getClock(newDoc);

    return {
      changes,
      clock,
    };
  }
}

export function getMessage(docStr: string, changeCallback: (doc: any) => any) {
  return applyChanges(load(docStr), changeCallback);
}
