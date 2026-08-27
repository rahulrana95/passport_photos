#!/usr/bin/env node
/**
 * Populates public/models before a build.
 *
 * The WASM runtime is copied out of node_modules, so it always matches the
 * installed @mediapipe/tasks-vision and can never drift from the API the code
 * calls. The landmark model is downloaded once and verified against a pinned
 * digest — the URL is mutable and belongs to somebody else, and a model that
 * silently changed would move every measurement this product makes without a
 * single test failing.
 *
 * Output is gitignored. Fifteen megabytes of binaries do not belong in a
 * repository, and both sources are reproducible from the lockfile and the
 * digest below.
 */

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = join(ROOT, 'public', 'models');
const WASM_OUTPUT_DIR = join(OUTPUT_DIR, 'wasm');
const WASM_SOURCE_DIR = join(ROOT, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');

// Read from the constants file rather than duplicated here, so the digest the
// build verifies and the one the application believes can never disagree.
const CONSTANTS = join(ROOT, 'src', 'analysis', 'model-source.constants.ts');

const readConstant = (source, name) => {
  const match = new RegExp(`${name}\\s*=\\s*\n?\\s*'([^']+)'`).exec(source);
  if (match?.[1] === undefined) throw new Error(`Could not read ${name} from ${CONSTANTS}`);
  return match[1];
};

const readNumericConstant = (source, name) => {
  const match = new RegExp(`${name}\\s*=\\s*([0-9_]+)`).exec(source);
  if (match?.[1] === undefined) throw new Error(`Could not read ${name} from ${CONSTANTS}`);
  return Number(match[1].replaceAll('_', ''));
};

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

const exists = async (path) => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

const fetchModel = async (url, expectedDigest, expectedBytes, destination) => {
  if (await exists(destination)) {
    const cached = await readFile(destination);
    if (sha256(cached) === expectedDigest) {
      console.log(`models: ${destination.split('/').pop()} already present and verified`);
      return;
    }
    console.log('models: cached copy failed verification, re-downloading');
  }

  console.log(`models: downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Model download failed: ${response.status} ${response.statusText}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = sha256(bytes);

  // Both checks, not one. A truncated download can in principle be caught by
  // length alone, and only the digest catches a model that was replaced.
  if (bytes.byteLength !== expectedBytes) {
    throw new Error(`Model is ${bytes.byteLength} bytes, expected ${expectedBytes}`);
  }
  if (digest !== expectedDigest) {
    throw new Error(`Model digest ${digest} does not match the pinned ${expectedDigest}`);
  }

  await writeFile(destination, bytes);
  console.log(`models: verified and wrote ${destination}`);
};

const copyWasmRuntime = async () => {
  if (!(await exists(WASM_SOURCE_DIR))) {
    throw new Error(
      `@mediapipe/tasks-vision is not installed — ${WASM_SOURCE_DIR} does not exist. Run npm ci first.`,
    );
  }

  await mkdir(WASM_OUTPUT_DIR, { recursive: true });
  const files = await readdir(WASM_SOURCE_DIR);

  await Promise.all(
    files.map((file) => copyFile(join(WASM_SOURCE_DIR, file), join(WASM_OUTPUT_DIR, file))),
  );

  console.log(`models: copied ${files.length} runtime files from node_modules`);
};

const MODELS = [
  { prefix: 'FACE_LANDMARKER', file: 'face_landmarker.task' },
  { prefix: 'SELFIE_SEGMENTER', file: 'selfie_segmenter.tflite' },
];

const main = async () => {
  const source = await readFile(CONSTANTS, 'utf8');

  await mkdir(OUTPUT_DIR, { recursive: true });
  await copyWasmRuntime();

  for (const model of MODELS) {
    await fetchModel(
      readConstant(source, `${model.prefix}_UPSTREAM_URL`),
      readConstant(source, `${model.prefix}_SHA256`),
      readNumericConstant(source, `${model.prefix}_BYTES`),
      join(OUTPUT_DIR, model.file),
    );
  }
};

main().catch((error) => {
  console.error(`models: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
