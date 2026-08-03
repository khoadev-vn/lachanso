import { CacheManager } from "./cacheManager";
export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  cacheHits: number;
  apiCalls: number;
  earlyTerminated: boolean;
}
export async function parallelProcess<T>(tasks: Array<() => Promise<T>>, maxConcurrent: number = 3): Promise<T[]> {
  const results: T[] = [];
  let executing = 0;
  const promises: Promise<void>[] = [];
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const promise = Promise.resolve().then(async () => {
      while (executing >= maxConcurrent) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      executing++;
      const result = await task();
      results[i] = result;
      executing--;
    });
    promises.push(promise);
  }
  await Promise.all(promises);
  return results;
}
export function batchWikipediaQueries(queries: string[], batchSize: number = 50): string[][] {
  const batches: string[][] = [];
  for (let i = 0; i < queries.length; i += batchSize) {
    batches.push(queries.slice(i, i + batchSize));
  }
  return batches;
}
export function extractHighConfidenceClaims(text: string): string[] {
  const sentences = text.
  split(/[.!?]+/).
  map((s) => s.trim()).
  filter((s) => s.length > 0);
  const validClaims: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length < 20)
    continue;
    if (/^(and|or|but|also|however|therefore)/i.test(sentence))
    continue;
    const hasNumbers = /\d+/.test(sentence);
    const hasNamedEntity = /\b[A-ZÀ-Ỹ][\w\s]*[A-ZÀ-Ỹ]\b/u.test(sentence);
    const hasVerb = /\b(said|reported|claimed|announced|stated|revealed|confirmed|denied)\b/i.test(sentence);
    if (hasNumbers || hasNamedEntity || hasVerb) {
      validClaims.push(sentence);
    }
  }
  return validClaims.slice(0, 10);
}
export function hashClaim(text: string): string {
  const normalized = text.
  toLowerCase().
  replace(/\b(a|an|the|and|or|but|in|on|at|to|from|of|for)\b/g, "").
  replace(/\s+/g, " ").
  trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `claim_${Math.abs(hash)}`;
}
export function deduplicateRequests<T extends {
  key: string;
}>(queue: T[], timeWindowMs: number = 10000): T[] {
  const seen = new Map<string, number>();
  const result: T[] = [];
  const now = Date.now();
  for (const item of queue) {
    const key = item.key.toLowerCase().trim();
    if (seen.has(key)) {
      const lastSeen = seen.get(key)!;
      if (now - lastSeen < timeWindowMs) {
        continue;
      }
    }
    seen.set(key, now);
    result.push(item);
  }
  return result;
}
export function shouldTerminateEarly(verificationResults: Array<{
  confidence: number;
  verified: boolean;
}>): boolean {
  if (verificationResults.length === 0)
  return false;
  const falseResults = verificationResults.filter((r) => !r.verified && r.confidence > 0.8);
  if (falseResults.length >= 2)
  return true;
  const trueResults = verificationResults.filter((r) => r.verified && r.confidence > 0.9);
  if (trueResults.length >= 2)
  return true;
  return false;
}
export class RateLimiter {
  private callTimes: number[] = [];
  constructor(private maxCalls: number, private windowMs: number) {}
  async acquire(): Promise<void> {
    const now = Date.now();
    this.callTimes = this.callTimes.filter((time) => now - time < this.windowMs);
    if (this.callTimes.length >= this.maxCalls) {
      const oldestCall = this.callTimes[0];
      const waitTime = this.windowMs - (now - oldestCall) + 100;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.callTimes.push(Date.now());
  }
}
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 3000): Promise<T | null> {
  return Promise.race([
  promise,
  new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))]
  );
}
export class PerformanceTracker {
  private metrics: PerformanceMetrics;
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      cacheHits: 0,
      apiCalls: 0,
      earlyTerminated: false
    };
  }
  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }
  recordApiCall(): void {
    this.metrics.apiCalls++;
  }
  recordEarlyTermination(): void {
    this.metrics.earlyTerminated = true;
  }
  finish(): PerformanceMetrics {
    this.metrics.endTime = Date.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
    return this.metrics;
  }
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
}
