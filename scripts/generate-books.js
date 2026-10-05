import { readdir, mkdir, writeFile, access, stat } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('public/books');
const output = path.resolve('public/data/books.json');
const extensions = new Map([['.pdf','pdf'],['.doc','doc'],['.docx','docx']]);
const cleanFolder = name => name.replace(/^\s*\d+\s*[-._)]\s*/, '').trim();
const cleanTitle = name => path.parse(name).name.replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim();
const slug = value => value.normalize('NFKD').toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, '-').replace(/^-|-$/g, '') || 'book';
const encodePath = value => value.split('/').map(encodeURIComponent).join('/');
function extractVolume(title, category, subcategory) {
  const marked = title.match(/\b(?:vol(?:ume)?\.?\s*|v[-.\s]*)(0*\d+)\b/i);
  if (marked) return Number(marked[1]);
  if (category === 'Hadith' && subcategory === 'Sahih Bukhari') {
    const numberedTitle = title.match(/^BUKHARI\s*[-–]\s*0*(\d+)$/i);
    if (numberedTitle) return Number(numberedTitle[1]);
  }
  return undefined;
}
async function walk(dir, parts = []) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch (error) { if (error?.code === 'ENOENT') return []; throw error; }
  const books = [];
  for (const entry of entries.sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) books.push(...await walk(full, [...parts, entry.name]));
    else {
      const ext = path.extname(entry.name).toLowerCase();
      if (!extensions.has(ext)) continue;
      const category = cleanFolder(parts[0] || 'Uncategorized');
      const subcategory = parts.length > 1 ? cleanFolder(parts.slice(1).join(' / ')) : '';
      const relative = path.relative(path.resolve('public'), full).split(path.sep).join('/');
      const metadata = await stat(full);
      const title = cleanTitle(entry.name);
      const volume = extractVolume(title, category, subcategory);
      books.push({ id: slug(relative.replace(/\.[^.]+$/, '')), title, filename: entry.name, fileType: extensions.get(ext), category, subcategory, fileUrl: '/' + encodePath(relative), sourceModifiedAt: metadata.mtimeMs, ...(volume === undefined ? {} : { volume }) });
    }
  }
  return books;
}
const scannedBooks = await walk(root);
const pdfPaths = new Set(scannedBooks.filter(book => book.fileType === 'pdf').map(book => book.fileUrl.toLowerCase()));
const books = scannedBooks.filter(book => book.fileType !== 'docx' || !pdfPaths.has(book.fileUrl.replace(/\.docx$/i, '.pdf').toLowerCase()));
const seen = new Map();
for (const book of books) { const n = (seen.get(book.id) || 0) + 1; seen.set(book.id,n); if (n > 1) book.id += '-' + n; }
for (const book of books) {
  if (book.fileType !== 'pdf') continue;
  try { await access(path.resolve('public/covers', book.id + '.webp')); book.coverUrl = '/covers/' + encodeURIComponent(book.id) + '.webp'; }
  catch { /* Missing thumbnails use the in-app fallback cover. */ }
}
const volumeGroups = new Map();
for (const book of books) {
  if (!book.subcategory || book.subcategory === 'Other Hadith' || book.volume === undefined) continue;
  const key = book.category + '|' + book.subcategory;
  const group = volumeGroups.get(key) || [];
  group.push(book);
  volumeGroups.set(key, group);
}
for (const group of volumeGroups.values()) {
  if (new Set(group.map(book => book.volume)).size < 2) continue;
  for (const book of group) book.collection = book.subcategory;
}
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(books, null, 2) + '\n', 'utf8');
console.log('Generated ' + books.length + ' book records in ' + path.relative(process.cwd(), output));
