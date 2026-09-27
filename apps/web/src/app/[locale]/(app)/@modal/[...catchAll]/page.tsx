/**
 * Any navigation that isn't an intercepted route clears the slot — without
 * this, a link followed from under an open dialog keeps the dialog mounted.
 */
export default function CatchAll() {
  return null;
}
