export function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Set it in .env.local.`);
  }

  return value;
}
