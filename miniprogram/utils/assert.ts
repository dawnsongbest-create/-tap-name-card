export function developmentAssert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Development assertion failed: ${message}`);
  }
}
