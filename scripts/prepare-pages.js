import { copyFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('dist');
const coversSource = path.resolve('public/covers');
const coversOutput = path.join(output, 'covers');
await mkdir(coversOutput, { recursive: true });
for (const name of await readdir(coversSource)) {
  if (name.endsWith('.webp')) await copyFile(path.join(coversSource, name), path.join(coversOutput, name));
}
await mkdir(path.join(output, 'data'), { recursive: true });
await copyFile(path.resolve('public/data/books.json'), path.join(output, 'data/books.json'));
await copyFile(path.resolve('public/favicon.svg'), path.join(output, 'favicon.svg'));
console.log('Prepared GitHub Pages files without copying the large book directory.');
