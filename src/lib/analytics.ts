import type { Book } from '../types/book';

type AnalyticsParameters = Record<string, string | number | boolean>;
type GtagCommand = 'js' | 'config' | 'event' | 'set';
type Gtag = (command: GtagCommand, ...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: Gtag;
  }
}

export interface ReadingPosition {
  page: number;
  totalPages: number;
}

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
const sentMilestones = new Map<string, Set<number>>();
let initialized = false;
let lastPageView = '';
let previousSafeLocation = '';

function canSend(): boolean {
  return import.meta.env.PROD && Boolean(measurementId) && typeof window !== 'undefined' && typeof window.gtag === 'function';
}

function emit(eventName: string, parameters: AnalyticsParameters = {}): void {
  if (!import.meta.env.PROD) {
    if (import.meta.env.DEV) console.info(`[Analytics] ${eventName}`, parameters);
    return;
  }
  if (!canSend()) return;
  try {
    window.gtag?.('event', eventName, parameters);
  } catch {
    // Analytics must never affect library features.
  }
}

function optionalMetadata(parameters: AnalyticsParameters, key: string, value: string | undefined): void {
  const normalized = value?.trim();
  if (normalized) parameters[key] = normalized;
}

export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;
  if (!import.meta.env.PROD || !measurementId || typeof window === 'undefined') return;

  try {
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: `${window.location.origin}${import.meta.env.BASE_URL}`,
      page_referrer: window.location.origin,
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.onerror = () => { /* Blocked analytics is intentionally silent. */ };
    document.head.appendChild(script);
  } catch {
    // A blocked script or unavailable browser API should not affect the app.
  }
}

export function trackPageView(safeRoute: string, pageTitle: string, navigationKey = safeRoute): void {
  const route = safeRoute.startsWith('/') ? safeRoute : '/';
  const dedupeKey = `${navigationKey}|${route}|${pageTitle}`;
  if (dedupeKey === lastPageView) return;
  lastPageView = dedupeKey;

  const safeLocation = `${window.location.origin}${import.meta.env.BASE_URL}#${route}`;
  if (!import.meta.env.PROD) {
    if (import.meta.env.DEV) console.info('[Analytics] page_view', { page_location: safeLocation, page_title: pageTitle });
    return;
  }
  if (!canSend()) return;
  try {
    const safeReferrer = previousSafeLocation || window.location.origin;
    window.gtag?.('set', { page_location: safeLocation, page_referrer: safeReferrer });
    window.gtag?.('event', 'page_view', {
      page_location: safeLocation,
      page_title: pageTitle,
      page_referrer: safeReferrer,
    });
    previousSafeLocation = safeLocation;
  } catch {
    // Analytics must never affect navigation.
  }
}

export function trackBookOpened(book: Book): void {
  const parameters: AnalyticsParameters = { book_id: book.id, book_title: book.title };
  optionalMetadata(parameters, 'category', book.category);
  optionalMetadata(parameters, 'subcategory', book.subcategory);
  optionalMetadata(parameters, 'collection', book.collection);
  emit('book_opened', parameters);
}

export function trackCategoryViewed(category: string): void {
  emit('category_viewed', { category });
}

export function trackCollectionViewed(collection: string): void {
  emit('collection_viewed', { collection });
}

export function trackSearch(resultCount: number): void {
  emit('search_performed', { result_count: Math.max(0, Math.trunc(resultCount)) });
}

export function trackFavoriteAdded(book: Pick<Book, 'id'>): void {
  emit('favorite_added', { book_id: book.id });
}

export function trackFavoriteRemoved(book: Pick<Book, 'id'>): void {
  emit('favorite_removed', { book_id: book.id });
}

export function startReadingSession(book: Pick<Book, 'id'>): void {
  sentMilestones.set(book.id, new Set<number>());
}

export function trackReadingProgress(book: Pick<Book, 'id'>, position: ReadingPosition): void {
  if (position.totalPages <= 0) return;
  const progressPercent = Math.min(100, Math.max(0, Math.floor((position.page / position.totalPages) * 100)));
  let sent = sentMilestones.get(book.id);
  if (!sent) {
    sent = new Set<number>();
    sentMilestones.set(book.id, sent);
  }
  for (const milestone of [25, 50, 75, 90, 100]) {
    if (progressPercent >= milestone && !sent.has(milestone)) {
      sent.add(milestone);
      emit('reading_progress', { book_id: book.id, progress_percent: milestone });
    }
  }
}
