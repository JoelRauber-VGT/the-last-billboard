#!/usr/bin/env node
// The project lives on iCloud-synced ~/Desktop. iCloud races with webpack
// in dev: temp .pack.gz files in `.next/cache` get evicted before webpack
// can rename them, which truncates vendor chunks and produces
// "Invalid or unexpected token" runtime errors and missing modules.
//
// Workaround: route the `.next` build dir to /private/tmp via a symlink.
// /tmp is on the local APFS data volume and never touched by iCloud.
// Combined with NODE_PATH (set in the `dev` script) so Node can still
// resolve the project's node_modules from outside the project tree.
//
// On non-macOS or when the project lives outside iCloud, this is a no-op.

import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync, readlinkSync } from 'node:fs'
import { join } from 'node:path'
import { platform } from 'node:os'

const PROJECT_ROOT = process.cwd()
const NEXT_DIR = join(PROJECT_ROOT, '.next')
const TARGET = '/private/tmp/the-last-billboard-next-build'

function isInIcloudDesktop(p) {
  return platform() === 'darwin' && p.includes('/Desktop/')
}

if (!isInIcloudDesktop(PROJECT_ROOT)) {
  // Nothing to do — fall through and let Next use a normal `.next` dir.
  process.exit(0)
}

mkdirSync(TARGET, { recursive: true })

// If `.next` already points at the target, nothing to do.
if (existsSync(NEXT_DIR)) {
  const stat = lstatSync(NEXT_DIR)
  if (stat.isSymbolicLink()) {
    if (readlinkSync(NEXT_DIR) === TARGET) {
      console.log(`[icloud-safe-dist] .next -> ${TARGET} (already linked)`)
      process.exit(0)
    }
    rmSync(NEXT_DIR)
  } else {
    // Real directory exists from a prior `next dev` run. Replace it.
    rmSync(NEXT_DIR, { recursive: true, force: true })
  }
}

symlinkSync(TARGET, NEXT_DIR)
console.log(`[icloud-safe-dist] linked .next -> ${TARGET}`)
