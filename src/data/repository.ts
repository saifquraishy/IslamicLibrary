import type { Book } from '../types/book';
let cache: Book[] | undefined;
export async function getBooks(): Promise<Book[]> {
  if (cache) return cache;
  const response = await fetch(`${import.meta.env.BASE_URL}data/books.json`);
  if (!response.ok) throw new Error('Unable to load the book catalogue');
  const catalogue = await response.json() as Book[];
  const booksBaseUrl = import.meta.env.VITE_BOOKS_BASE_URL?.replace(/\/+$/, '');
  cache = catalogue.map(book => ({
    ...book,
    ...(book.coverUrl ? { coverUrl: `${import.meta.env.BASE_URL}${book.coverUrl.replace(/^\/+/, '')}` } : {}),
    fileUrl: booksBaseUrl && book.fileUrl.startsWith('/books/')
      ? `${booksBaseUrl}/${book.fileUrl.slice('/books/'.length)}`
      : `${import.meta.env.BASE_URL}${book.fileUrl.replace(/^\/+/, '')}`,
  }));
  return cache;
}
export async function getBookById(id: string): Promise<Book | undefined> { return (await getBooks()).find(book => book.id === id); }
export async function getBooksByCategory(category: string): Promise<Book[]> { return (await getBooks()).filter(book => book.category.toLowerCase() === category.toLowerCase()); }
export function searchBooks(books: Book[], query: string): Book[] { const terms = query.normalize('NFKD').toLocaleLowerCase().replace(/[\p{P}\p{S}]+/gu, ' ').trim().split(/\s+/).filter(Boolean); if (!terms.length) return []; return books.filter(book => { const volumeTerms = book.volume === undefined ? [] : ['volume '+book.volume, 'vol '+book.volume]; const text = [book.title, book.filename, book.category, book.subcategory, book.author, book.volume, ...volumeTerms, book.collection].filter(value => value !== undefined && value !== null).join(' ').normalize('NFKD').toLocaleLowerCase().replace(/[\p{P}\p{S}]+/gu, ' '); return terms.every(term => text.includes(term)); }); }
