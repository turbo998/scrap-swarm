export class VerificationTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Verification timed out after ${timeoutMs}ms`);
    this.name = "VerificationTimeoutError";
  }
}

export function verificationPassed(errors: readonly string[], timedOut: boolean): boolean {
  return errors.length === 0 && !timedOut;
}

export async function withWatchdog<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new VerificationTimeoutError(timeoutMs)), timeoutMs);
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
