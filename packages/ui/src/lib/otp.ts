/**
 * Whether a freshly-changed value should be reported as complete.
 *
 * Lives in a pure module, with no React or react-native import, so it can be
 * asserted directly. The component that uses it renders through
 * @rn-primitives, whose published .mjs contains raw JSX and cannot be parsed
 * outside Metro.
 *
 * The rule matters because the API consumes a code on first use: reporting the
 * same one twice submits it twice, and the second attempt fails in a way that
 * looks to the user like a wrong code.
 */
export function shouldReportComplete(
  value: string,
  length: number,
  alreadyReported: string | null,
): boolean {
  return value.length === length && alreadyReported !== value;
}
