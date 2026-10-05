import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const run = promisify(execFile);
const publicDir = path.resolve('public');
const booksFile = path.join(publicDir, 'data', 'books.json');
const coversDir = path.join(publicDir, 'covers');
const pdfJsRoot = path.resolve('node_modules', 'pdfjs-dist');
const pdfJsAssetUrl = directory => path.join(pdfJsRoot, directory).replace(/\\/g, '/') + '/';

// Refresh the catalogue first so newly added files are included and IDs match the cover filenames.
await run(process.execPath, [path.resolve('scripts/generate-books.js')], { stdio: 'inherit' });
const books = JSON.parse(await readFile(booksFile, 'utf8'));
const pdfBooks = books.filter(book => book.fileType === 'pdf');
await mkdir(coversDir, { recursive: true });

let skipped = 0;
let generated = 0;
let failed = 0;
console.log('Generating ' + pdfBooks.length + ' covers...');

for (let index = 0; index < pdfBooks.length; index += 1) {
  const book = pdfBooks[index];
  const sourcePath = path.join(publicDir, ...book.fileUrl.replace(/^\//, '').split('/').map(decodeURIComponent));
  const coverPath = path.join(coversDir, book.id + '.webp');
  const metadataPath = coverPath + '.json';
  try {
    const sourceStat = await stat(sourcePath);
    const signature = { renderer: 2, size: sourceStat.size, mtimeMs: sourceStat.mtimeMs };
    let alreadyCurrent = false;
    try {
      await access(coverPath);
      const storedSignature = JSON.parse(await readFile(metadataPath, 'utf8'));
      alreadyCurrent = storedSignature.renderer === signature.renderer && storedSignature.size === signature.size && storedSignature.mtimeMs === signature.mtimeMs;
    } catch { /* Missing or old cover metadata triggers regeneration. */ }
    if (alreadyCurrent) {
      skipped += 1;
      console.log('[' + (index + 1) + '/' + pdfBooks.length + '] ' + book.title + ' — cover is current');
      continue;
    }
    const pdfData = new Uint8Array(await readFile(sourcePath));
    const document = await getDocument({
      data: pdfData,
      cMapUrl: pdfJsAssetUrl('cmaps'),
      cMapPacked: true,
      standardFontDataUrl: pdfJsAssetUrl('standard_fonts'),
      wasmUrl: pdfJsAssetUrl('wasm'),
      useSystemFonts: true,
      isEvalSupported: false,
    }).promise;
    const page = await document.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 300 / baseViewport.width });
    const canvasFactory = document.canvasFactory;
    const canvasAndContext = canvasFactory.create(Math.max(1, Math.round(viewport.width)), Math.max(1, Math.round(viewport.height)));
    await page.render({ canvasContext: canvasAndContext.context, viewport }).promise;
    const webp = canvasAndContext.canvas.toBuffer('image/webp', 82);
    await writeFile(coverPath, webp);
    await writeFile(metadataPath, JSON.stringify(signature), 'utf8');
    page.cleanup();
    await document.destroy();
    generated += 1;
    console.log('[' + (index + 1) + '/' + pdfBooks.length + '] ' + book.title + ' — generated (' + Math.round(webp.byteLength / 1024) + ' KB)');
  } catch (error) {
    failed += 1;
    console.warn('[' + (index + 1) + '/' + pdfBooks.length + '] Could not render ' + book.filename + ': ' + (error instanceof Error ? error.message : String(error)));
  }
}

await run(process.execPath, [path.resolve('scripts/generate-books.js')], { stdio: 'inherit' });
console.log('Done. ' + generated + ' generated, ' + skipped + ' current, ' + failed + ' failed.');
