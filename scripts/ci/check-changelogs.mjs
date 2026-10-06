#!/usr/bin/env node
/**
 * Every release needs a changelog for each versionCode that is published:
 *   <code>.txt                                 the release itself
 *   <code>001.txt, <code>002.txt, <code>003.txt  F-Droid's per-ABI builds (1000 * code + 1/2/3)
 * F-Droid looks changelogs up by the published versionCode, so missing per-ABI files mean no "What's new".
 */
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const { versionCode } = JSON.parse(readFileSync(new URL('app.json', root), 'utf8')).expo.android;
const dir = new URL('fastlane/metadata/android/en-US/changelogs/', root);
const codes = [versionCode, ...[1, 2, 3].map((n) => versionCode * 1000 + n)];
const missing = codes.filter((c) => !existsSync(new URL(`${c}.txt`, dir)));
const tooLong = codes.filter((c) => existsSync(new URL(`${c}.txt`, dir)) && readFileSync(new URL(`${c}.txt`, dir), 'utf8').length > 500);

if (missing.length) console.error(`Missing changelogs: ${missing.map((c) => `${c}.txt`).join(', ')} (in fastlane/metadata/android/en-US/changelogs/)`);
if (tooLong.length) console.error(`Over 500 characters: ${tooLong.map((c) => `${c}.txt`).join(', ')}`);
if (missing.length || tooLong.length) process.exit(1);
console.log(`Changelogs present for versionCode ${versionCode} and F-Droid's ${codes.slice(1).join(', ')}`);
