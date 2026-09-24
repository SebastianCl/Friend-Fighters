import type { Combat } from "./combat";

/** Live read view: excludes commands and prevents nested writes in TypeScript.
 * Consumers needing history must capture it before the next simulation step.
 */
type ReadState<T> = T extends readonly unknown[]
  ? { readonly [K in keyof T]: ReadState<T[K]> }
  : T extends object
    ? {
        readonly [
          K in keyof T as T[K] extends (...args: never[]) => unknown ? never : K
        ]: ReadState<T[K]>;
      }
    : T;
export type CombatState = ReadState<Combat>;
