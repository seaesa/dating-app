import * as React from "react";

/**
 * `asChild` support: render a component's props onto its single child instead
 * of wrapping it in another element.
 *
 * This replaces `@rn-primitives/slot`, which publishes raw JSX inside both its
 * CJS and ESM builds. Metro and Babel happen to cope; Turbopack panics and
 * vite refuses to parse it, so it makes the web app unbuildable. The other
 * `@rn-primitives` packages are fine — this is the only broken one, and it is
 * small enough to own outright, which is the copy-in model React Native
 * Reusables is built on anyway.
 */

type AnyProps = Record<string, unknown>;

type StyleValue = unknown;
type StyleFn = (state: never) => StyleValue;

/**
 * Assign a node to one ref, remembering any cleanup it returns.
 *
 * React 19 ref callbacks may return a cleanup function. Dropping it leaks
 * whatever the child registered every time the ref is reattached.
 */
function setRef<T>(
  ref: React.Ref<T> | undefined,
  node: T | null,
  cleanups: Map<unknown, () => void>,
): void {
  if (typeof ref === "function") {
    const previous = cleanups.get(ref);
    if (previous) {
      cleanups.delete(ref);
      previous();
    }
    const cleanup = ref(node) as unknown;
    if (typeof cleanup === "function") {
      cleanups.set(ref, cleanup as () => void);
    }
  } else if (ref && typeof ref === "object") {
    (ref as React.MutableRefObject<T | null>).current = node;
  }
}

function composeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
  const cleanups = new Map<unknown, () => void>();
  return (node) => {
    for (const ref of refs) {
      setRef(ref, node, cleanups);
    }
  };
}

/**
 * Combine two style props, either of which may be a function.
 *
 * `Pressable` passes `style={({ pressed }) => ...}`. Putting that callback into
 * a plain array hands React Native a function where a style object belongs,
 * which produces silently wrong output rather than an error.
 */
function combineStyles(slotStyle: StyleValue, childStyle: StyleValue): StyleValue {
  const isFn = typeof slotStyle === "function" || typeof childStyle === "function";
  if (!isFn) {
    return [slotStyle, childStyle].filter(Boolean);
  }
  return (state: never) => {
    const resolve = (value: StyleValue) =>
      typeof value === "function" ? (value as StyleFn)(state) : value;
    return [resolve(slotStyle), resolve(childStyle)].filter(Boolean);
  };
}

/**
 * Merge slot props onto child props.
 *
 * The child wins on conflicts, except for handlers and styling: handlers are
 * chained so neither side's behaviour is dropped, and className and style are
 * combined so a slot can decorate without erasing what the child set.
 */
function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const merged: AnyProps = { ...slotProps, ...childProps };

  for (const key of Object.keys(slotProps)) {
    const slotValue = slotProps[key];
    const childValue = childProps[key];

    if (/^on[A-Z]/.test(key)) {
      if (typeof slotValue === "function" && typeof childValue === "function") {
        merged[key] = (...args: unknown[]) => {
          (childValue as (...a: unknown[]) => unknown)(...args);
          (slotValue as (...a: unknown[]) => unknown)(...args);
        };
      } else if (typeof slotValue === "function") {
        merged[key] = slotValue;
      }
      continue;
    }

    if (key === "style") {
      merged[key] = combineStyles(slotValue, childValue);
      continue;
    }

    if (key === "className") {
      merged[key] = [slotValue, childValue].filter(Boolean).join(" ");
    }
  }

  return merged;
}

export interface SlotProps {
  children?: React.ReactNode;
  ref?: React.Ref<unknown>;
  [key: string]: unknown;
}

export function Slot({ children, ref, ...slotProps }: SlotProps) {
  if (!React.isValidElement(children)) {
    // Upstream logs here, and silence is worse: `<Text asChild>hello</Text>`
    // renders an empty tree with nothing to explain why.
    if (children !== null && children !== undefined) {
      console.warn(
        "Slot expects a single React element child; received " +
          typeof children +
          ". Nothing was rendered.",
      );
    }
    return null;
  }

  const childProps = (children.props ?? {}) as AnyProps & {
    ref?: React.Ref<unknown>;
  };
  const { ref: childRef, ...restChildProps } = childProps;

  return React.cloneElement(
    children as React.ReactElement<AnyProps>,
    {
      ...mergeProps(slotProps, restChildProps),
      ref: ref ? composeRefs(ref, childRef) : childRef,
    } as AnyProps,
  );
}

Slot.displayName = "Slot";

// The RNR components import these named slots; all three behave identically
// here because the merge logic is not element-specific.
export const Pressable = Slot;
export const View = Slot;
export const Text = Slot;
