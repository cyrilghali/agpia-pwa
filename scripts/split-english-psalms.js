#!/usr/bin/env node
/**
 * One-off script: rewrite English book.json so each psalm is its own chapter
 * with consistent "PSALM N" titles. Run from repo root:
 *   node scripts/split-english-psalms.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOK_PATH = path.join(__dirname, '../public/agpia/en/book.json');
const PSALM_HEADING = /^PSALM\s+(\d+)/i;

function splitChapterByPsalms(ch) {
  const blocks = ch.blocks || [];
  const indices = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === 'heading' && b.text && PSALM_HEADING.test(b.text)) indices.push(i);
  }
  if (indices.length <= 1) return [ch];
  const out = [];
  for (let g = 0; g < indices.length; g++) {
    const start = indices[g];
    const end = indices[g + 1] ?? blocks.length;
    const groupBlocks = blocks.slice(start, end).map((b) => ({ ...b }));
    const firstHeading = groupBlocks.find((b) => b.type === 'heading' && b.text);
    const numMatch = (firstHeading && firstHeading.text || '').match(PSALM_HEADING);
    const num = numMatch ? numMatch[1] : String(g + 1);
    const title = `PSALM ${num}`;
    if (firstHeading) firstHeading.text = title;
    const id = g === 0 ? ch.id : `${ch.id}-${g + 1}`;
    out.push({
      id,
      title,
      hourId: ch.hourId,
      blocks: groupBlocks,
    });
  }
  return out;
}

function main() {
  const book = JSON.parse(fs.readFileSync(BOOK_PATH, 'utf8'));
  const splitMap = new Map();
  const chapters = [];

  for (const ch of book.chapters) {
    const split = splitChapterByPsalms(ch);
    if (split.length > 1) {
      splitMap.set(
        ch.id,
        split.map((s) => ({ id: s.id, title: s.title }))
      );
    }
    chapters.push(...split);
  }

  const toc = book.toc.map((entry) => {
    if (!entry.children || entry.children.length === 0) return entry;
    const children = [];
    for (const child of entry.children) {
      const expanded = splitMap.get(child.id);
      if (expanded) {
        expanded.forEach((e) => children.push({ id: e.id, title: e.title }));
      } else {
        children.push(child);
      }
    }
    return { ...entry, children };
  });

  const out = {
    ...book,
    toc,
    chapters,
  };
  fs.writeFileSync(BOOK_PATH, JSON.stringify(out), 'utf8');
  console.log('Wrote', BOOK_PATH, '—', chapters.length, 'chapters total');
}

main();
