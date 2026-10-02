"use client";

import { useRef, useState } from "react";

import { roomy } from "@/components/step-form/roomy";

/**
 * For a list the user adds to (Packs, order lines): the item just added takes
 * the focus and eases in. Only that one: items already there when the step
 * opens must not move, and without the focus the cursor stays on the "Add"
 * button, where typing a space adds another item.
 *
 *   const added = useAddedItem();
 *   <button onClick={() => { added.add(items.length); onChange([...items, blank]) }}>
 *   <div className={added.className(i)}>
 *     <Input ref={added.focusRef(i)} … />
 *
 * Call `reset()` when an item is removed: indexes shift.
 */
export function useAddedItem() {
  const [added, setAdded] = useState<number | null>(null);
  const focusNext = useRef<number | null>(null);

  return {
    add(index: number) {
      focusNext.current = index;
      setAdded(index);
    },
    reset() {
      setAdded(null);
    },
    /** The entering style for item `index`, if it's the one just added. */
    className(index: number) {
      return index === added ? roomy.enter : undefined;
    },
    /** A ref for the field that should take the focus in item `index`. */
    focusRef(index: number) {
      return (el: HTMLElement | null) => {
        if (el && focusNext.current === index) {
          focusNext.current = null;
          el.focus();
        }
      };
    },
  };
}
