type EnvSource = Record<string, string | undefined>;

/**
 * Read a required environment variable. Throws naming the variable, because a
 * missing-config crash should say which key to set.
 */
export function requireEnv(name: string, source: EnvSource = process.env): string {
  const value = source[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(
  name: string,
  fallback: string,
  source: EnvSource = process.env,
): string {
  const value = source[name];
  return value === undefined || value === "" ? fallback : value;
}
