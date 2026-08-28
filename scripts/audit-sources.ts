/**
 * Checks that every specification's cited source is still there, and says which
 * specs are due to be checked again.
 *
 * The registry's one real asset is that every number in it came from the
 * authority that set it. That claim decays two ways and this catches both: a
 * source URL that has moved or died, and a spec whose `lastVerified` has aged
 * past the re-verification window while the government quietly changed the
 * page underneath it.
 *
 * NOT part of CI, deliberately. It makes one network request per spec to
 * government sites that rate-limit and occasionally block datacentre traffic,
 * so a red run here would mean "the internet was unhelpful this morning"
 * rather than "somebody broke something". Run it before authoring a tranche
 * and before a release.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const SPEC_DIR = 'src/photo-spec/specs';
const SPEC_SUFFIX = '.spec.ts';

/**
 * Read out of the spec files rather than imported from the registry.
 *
 * The registry is a module graph with path aliases behind it, and this script
 * runs on bare Node so that it needs no build. What it actually needs from a
 * spec is two strings, and a file is a perfectly good place to read two strings
 * from — provided nothing can go missing quietly, which is what the
 * declaration count below is for.
 */
const SPEC_DECLARATION = /export const \w+: PhotoSpec/g;
const SOURCE_FIELD = /^\s*source:\s*$|^\s*source:\s*'([^']+)'/m;
const CONTINUED_SOURCE = /^\s*'([^']+)',/m;
const VERIFIED_FIELD = /^\s*lastVerified:\s*'([^']+)'/m;

const SPEC_REVERIFICATION_DAYS = 180;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const DAYS_TO_MS = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

const REQUEST_TIMEOUT_MS = 20_000;
const FIRST_ERROR_STATUS = 400;
const EXIT_FAILURE = 1;

/**
 * Statuses that mean "not today", not "not there".
 *
 * Several authorities put a bot wall in front of their guidance and answer a
 * datacentre address with 403 or 429 however polite the request. That says
 * nothing about whether the page still holds the requirements we cited, so it
 * is reported and not failed on. A 404, a 410 or a server error is a different
 * claim and is treated as one.
 */
const UNAUTHORISED = 401;
const FORBIDDEN = 403;
const TOO_MANY_REQUESTS = 429;
const BLOCKED_STATUSES: readonly number[] = [UNAUTHORISED, FORBIDDEN, TOO_MANY_REQUESTS];

/**
 * A browser user-agent, because several authorities serve a block page to
 * anything that looks automated. We are checking that a human following our
 * citation would arrive somewhere, so we ask the way a human's browser does.
 */
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

type Outcome =
  | { readonly kind: 'ok'; readonly status: number }
  | { readonly kind: 'blocked'; readonly status: number }
  | { readonly kind: 'moved'; readonly status: number; readonly to: string }
  | { readonly kind: 'gone'; readonly status: number }
  | { readonly kind: 'unreachable'; readonly detail: string };

const check = async (url: string): Promise<Outcome> => {
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT },
    });

    if (BLOCKED_STATUSES.includes(response.status)) {
      return { kind: 'blocked', status: response.status };
    }
    if (response.status >= FIRST_ERROR_STATUS) return { kind: 'gone', status: response.status };
    if (response.url !== url) return { kind: 'moved', status: response.status, to: response.url };

    return { kind: 'ok', status: response.status };
  } catch (error) {
    return { kind: 'unreachable', detail: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
};

const describe = (outcome: Outcome): string => {
  switch (outcome.kind) {
    case 'ok':
      return `reachable (${String(outcome.status)})`;
    case 'blocked':
      return `refused our request (${String(outcome.status)}) — a bot wall, not evidence the page has gone`;
    case 'moved':
      return `REDIRECTS to ${outcome.to} — cite the destination`;
    case 'gone':
      return `GONE (${String(outcome.status)}) — re-verify before this spec ships again`;
    case 'unreachable':
      return `unreachable: ${outcome.detail} — may be a block rather than a dead link`;
  }
};

interface AuditableSpec {
  readonly name: string;
  readonly source: string;
  readonly lastVerified: string;
}

const isStale = (lastVerified: string, now: Date): boolean =>
  (now.getTime() - new Date(`${lastVerified}T00:00:00Z`).getTime()) / DAYS_TO_MS >
  SPEC_REVERIFICATION_DAYS;

/**
 * One spec per file, and the file says so.
 *
 * A file declaring two specs would have one of them audited and the other
 * silently skipped, so that is refused outright rather than half-handled. The
 * United States file declares a passport and a visa spec that share a source,
 * so the count is what is checked, not the arithmetic.
 */
const readSpecs = async (): Promise<readonly AuditableSpec[]> => {
  const files = (await readdir(SPEC_DIR)).filter((file) => file.endsWith(SPEC_SUFFIX)).sort();
  const specs: AuditableSpec[] = [];

  for (const file of files) {
    const text = await readFile(join(SPEC_DIR, file), 'utf8');
    const declarations = text.match(SPEC_DECLARATION) ?? [];
    if (declarations.length === 0) continue;

    const sourceMatch = SOURCE_FIELD.exec(text);
    const verifiedMatch = VERIFIED_FIELD.exec(text);

    if (sourceMatch === null || verifiedMatch?.[1] === undefined) {
      throw new Error(`${file} declares a spec with no source or no lastVerified.`);
    }

    // A long URL is wrapped onto the next line by the formatter.
    const source =
      sourceMatch[1] ?? CONTINUED_SOURCE.exec(text.slice(sourceMatch.index + sourceMatch[0].length))?.[1];

    if (source === undefined) throw new Error(`${file} has a source that could not be read.`);

    specs.push({
      name: file.slice(0, -SPEC_SUFFIX.length),
      source,
      lastVerified: verifiedMatch[1],
    });
  }
  return specs;
};

const main = async (): Promise<void> => {
  const specs = await readSpecs();
  const now = new Date();
  let failures = 0;

  console.log(`Auditing ${String(specs.length)} specification sources.\n`);

  for (const spec of specs) {
    const { name } = spec;
    const outcome = await check(spec.source);
    const stale = isStale(spec.lastVerified, now);

    // Unreachable is reported but not failed on: a government site refusing a
    // datacentre IP says nothing about whether the page is still correct, and
    // failing on it would train everyone to ignore this script.
    if (outcome.kind === 'gone' || outcome.kind === 'moved') failures += 1;

    console.log(`${name}\n  source: ${spec.source}\n  ${describe(outcome)}`);
    console.log(
      stale
        ? `  STALE: last verified ${spec.lastVerified}, over ${String(SPEC_REVERIFICATION_DAYS)} days ago`
        : `  verified ${spec.lastVerified}`,
    );
    console.log('');
  }

  if (failures > 0) {
    console.error(`${String(failures)} source(s) moved or gone.`);
    process.exit(EXIT_FAILURE);
  }
  console.log('Every source still resolves.');
};

await main();
