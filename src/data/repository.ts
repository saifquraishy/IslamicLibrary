import type { Book } from '../types/book';
let cache: Book[] | undefined;
export async function getBooks(): Promise<Book[]> {
  if (cache) return cache;
  const libraryBaseUrl = import.meta.env.VITE_LIBRARY_BASE_URL?.replace(/\/+$/, '');
  const assetUrl = (path: string) => libraryBaseUrl
    ? `${libraryBaseUrl}/${path.replace(/^\/+/, '')}`
    : `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
  const response = await fetch(assetUrl('data/books.json'));
  if (!response.ok) throw new Error('Unable to load the book catalogue');
  const catalogue = await response.json() as Book[];
  cache = catalogue.map(book => ({
    ...book,
    ...(book.coverUrl ? { coverUrl: assetUrl(book.coverUrl) } : {}),
    fileUrl: assetUrl(book.fileUrl),
  }));
  return cache;
}
export async function getBookById(id: string): Promise<Book | undefined> { return (await getBooks()).find(book => book.id === id); }
export async function getBooksByCategory(category: string): Promise<Book[]> { return (await getBooks()).filter(book => book.category.toLowerCase() === category.toLowerCase()); }
export function searchBooks(books: Book[], query: string): Book[] { const terms = query.normalize('NFKD').toLocaleLowerCase().replace(/[\p{P}\p{S}]+/gu, ' ').trim().split(/\s+/).filter(Boolean); if (!terms.length) return []; return books.filter(book => { const volumeTerms = book.volume === undefined ? [] : ['volume '+book.volume, 'vol '+book.volume]; const text = [book.title, book.filename, book.category, book.subcategory, book.author, book.volume, ...volumeTerms, book.collection].filter(value => value !== undefined && value !== null).join(' ').normalize('NFKD').toLocaleLowerCase().replace(/[\p{P}\p{S}]+/gu, ' '); return terms.every(term => text.includes(term)); }); }
