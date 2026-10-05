import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { ArrowLeft, Maximize, Minimize, Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bookmark, Heart } from 'lucide-react';
import type { Book } from '../types/book';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './PdfReader.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

interface PdfReaderProps {
  book: Book;
  isFavorite: boolean;
  resumePage?: number;
  onToggleFavorite: () => void;
  onProgress: (page: number, totalPages: number) => void;
  onPageViewed: (page: number, totalPages: number) => void;
}

type FitMode = 'width' | 'page';
const DEFAULT_PAGE_RATIO = 1.414;

function LoadingState({ message }: { message: string }) {
  return <div className="pdf-reader-state" role="status"><span className="reader-spinner" aria-hidden="true"/><span>{message}</span></div>;
}

export default function PdfReader({ book, isFavorite, resumePage, onToggleFavorite, onProgress, onPageViewed }: PdfReaderProps) {
  const readerRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [numPages, setNumPages] = useState(0);
  const [pageRatio, setPageRatio] = useState(DEFAULT_PAGE_RATIO);
  const [viewport, setViewport] = useState({ width: 800, height: 700 });
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState<FitMode>(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches ? 'width' : 'page');
  const [pageRendered, setPageRendered] = useState(false);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const measure = () => setViewport({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      setFullscreenAvailable(Boolean(document.fullscreenEnabled && readerRef.current?.requestFullscreen));
    };
    updateFullscreen();
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  const goToPage = useCallback((requestedPage: number) => {
    if (!numPages || !Number.isFinite(requestedPage)) return;
    const nextPage = Math.min(numPages, Math.max(1, Math.trunc(requestedPage)));
    setPageNumber(nextPage);
    setPageInput(String(nextPage));
    setPageRendered(false);
    setResumeDismissed(true);
    onProgress(nextPage, numPages);
  }, [numPages, onProgress]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(target.tagName))) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); goToPage(pageNumber - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); goToPage(pageNumber + 1); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goToPage, pageNumber]);

  const onDocumentLoadSuccess = (pdf: PDFDocumentProxy) => {
    setNumPages(pdf.numPages);
    setPageNumber(1);
    setPageInput('1');
    setPageRendered(false);
    setDocumentLoaded(true);
    setLoadFailed(false);
    setResumeDismissed(false);
  };

  const onPageLoadSuccess = (page: PDFPageProxy) => {
    const size = page.getViewport({ scale: 1 });
    setPageRatio(size.height / size.width);
  };

  const failToLoad = (error: Error) => {
    if (import.meta.env.DEV) console.error('PDF.js could not open this book:', error);
    setLoadFailed(true);
    setDocumentLoaded(false);
  };

  const retry = () => {
    setLoadFailed(false);
    setDocumentLoaded(false);
    setPageRendered(false);
    setNumPages(0);
    setRetryToken(value => value + 1);
  };

  const commitPageInput = () => {
    const requestedPage = Number(pageInput);
    if (Number.isFinite(requestedPage) && requestedPage >= 1) goToPage(requestedPage);
    else setPageInput(String(pageNumber));
  };

  const onPageInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { commitPageInput(); event.currentTarget.blur(); }
  };

  const pageWidth = Math.max(1, Math.round((fitMode === 'page'
    ? Math.min(viewport.width - 32, (viewport.height - 32) / pageRatio)
    : viewport.width - 32) * zoom));

  const toggleFullscreen = async () => {
    const element = readerRef.current;
    if (!element) return;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    else if (element.requestFullscreen) await element.requestFullscreen().catch(() => undefined);
  };

  const controls = <div className="pdf-reader-controls" aria-label="PDF reading controls">
    <div className="pdf-zoom-controls">
      <button type="button" className="pdf-control-button" aria-label="Zoom out" title="Zoom out" onClick={() => setZoom(value => Math.max(0.55, Math.round((value - 0.15) * 100) / 100))}><Minus size={17}/></button>
      <span className="pdf-zoom-level">{Math.round(zoom * 100)}%</span>
      <button type="button" className="pdf-control-button" aria-label="Zoom in" title="Zoom in" onClick={() => setZoom(value => Math.min(2.5, Math.round((value + 0.15) * 100) / 100))}><Plus size={17}/></button>
      <button type="button" className={'pdf-fit-button '+(fitMode === 'width' ? 'is-active' : '')} onClick={() => { setFitMode('width'); setZoom(1); }}>Fit width</button>
      <button type="button" className={'pdf-fit-button '+(fitMode === 'page' ? 'is-active' : '')} onClick={() => { setFitMode('page'); setZoom(1); }}>Fit page</button>
    </div>
    <div className="pdf-page-controls">
      <button type="button" className="pdf-control-button" aria-label="Previous page" title="Previous page" disabled={pageNumber <= 1 || !numPages} onClick={() => goToPage(pageNumber - 1)}><ChevronLeft size={19}/></button>
      <label className="pdf-page-label">Page <input aria-label="Page number" type="number" min={1} max={numPages || undefined} inputMode="numeric" value={pageInput} onChange={event => setPageInput(event.target.value)} onBlur={commitPageInput} onKeyDown={onPageInputKeyDown}/> <span>of {numPages || '—'}</span></label>
      <button type="button" className="pdf-control-button" aria-label="Next page" title="Next page" disabled={!numPages || pageNumber >= numPages} onClick={() => goToPage(pageNumber + 1)}><ChevronRight size={19}/></button>
    </div>
    {fullscreenAvailable&&<button type="button" className="pdf-control-button pdf-fullscreen-button" aria-label={isFullscreen?'Exit fullscreen':'Enter fullscreen'} title={isFullscreen?'Exit fullscreen':'Enter fullscreen'} onClick={toggleFullscreen}>{isFullscreen?<Minimize size={17}/>:<Maximize size={17}/>}</button>}
  </div>;

  return <main className="pdf-reader" ref={readerRef}>
    <header className="pdf-reader-header">
      <Link className="pdf-reader-back" to={'/books/'+encodeURIComponent(book.id)} aria-label="Back to book"><ArrowLeft size={19}/><span>Back to Book</span></Link>
      <strong title={book.title}>{book.title}</strong>
      <button type="button" className={'pdf-reader-favorite '+(isFavorite?'is-favorite':'')} aria-label={isFavorite?'Remove from favorites':'Add to favorites'} title={isFavorite?'Remove from favorites':'Add to favorites'} onClick={onToggleFavorite}>{isFavorite?<Heart size={19} fill="currentColor"/>:<Bookmark size={19}/>}</button>
    </header>
    {controls}
    <section className="pdf-reader-viewport" ref={viewportRef} aria-label="PDF document">
      {resumePage && resumePage > 1 && !resumeDismissed && <div className="pdf-resume-banner"><span>Continue from page {resumePage}</span><button type="button" onClick={() => goToPage(resumePage)}>Continue</button><button type="button" className="resume-dismiss" aria-label="Dismiss resume prompt" onClick={() => setResumeDismissed(true)}>Start at page 1</button></div>}
      {loadFailed ? <div className="pdf-reader-error"><h2>Unable to open this book.</h2><p>Please check your connection and try again.</p><div><button type="button" className="button-primary" onClick={retry}>Retry</button><Link className="button-secondary" to={'/books/'+encodeURIComponent(book.id)}>Back to book</Link></div></div> : <Document key={book.id+':'+retryToken} file={book.fileUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={failToLoad} loading={<LoadingState message="Loading PDF"/>} error={<div className="pdf-reader-error"><h2>Unable to open this book.</h2><p>Please try again.</p><button type="button" className="button-primary" onClick={retry}>Retry</button></div>}>
        <div className="pdf-page-wrap">
          {!pageRendered&&documentLoaded&&<div className="pdf-page-preparing" role="status">Preparing page {pageNumber}…</div>}
          <Page pageNumber={pageNumber} width={pageWidth} onLoadSuccess={onPageLoadSuccess} onRenderSuccess={() => {setPageRendered(true);onPageViewed(pageNumber,numPages);}} onRenderError={failToLoad} renderTextLayer renderAnnotationLayer loading={<LoadingState message={`Preparing page ${pageNumber}…`}/>}/>
        </div>
      </Document>}
    </section>
  </main>;
}
