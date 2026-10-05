import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, BookMarked, BookOpen, Bookmark, Check, ChevronRight, ClipboardCheck, Cloud, Compass, FileText, Flower2, HandHeart, Heart, Landmark, LibraryBig, Map as MapIcon, Menu, Moon, Scale, ScrollText, Search, Shield, Sparkles, Sun, UsersRound, X } from 'lucide-react';
import { categories } from './data/categories';
import { getBookById, getBooks, searchBooks } from './data/repository';
import type { Book } from './types/book';

const FAVORITES_KEY = 'favoriteBookIds';
const RECENT_KEY = 'recentBooks';
const categoryIcons = { BookOpen, ScrollText, Compass, Sparkles, Scale, Sun, HandHeart, Moon, Map: MapIcon, UsersRound, Heart, Landmark, Flower2, Cloud, Shield, LibraryBig, ClipboardCheck };
interface RecentBook { bookId: string; lastOpened: number; }
interface Collection { key: string; slug: string; category: string; name: string; books: Book[]; volumeCount: number; }

function readArray(key: string): unknown[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
}
function readFavorites(): string[] {
  if (localStorage.getItem(FAVORITES_KEY) !== null) return readArray(FAVORITES_KEY).filter((value): value is string => typeof value === 'string');
  const legacy = readArray('islamic-library-favorites').filter((value): value is string => typeof value === 'string');
  if (legacy.length) localStorage.setItem(FAVORITES_KEY, JSON.stringify(legacy));
  return legacy;
}
function readRecent(): RecentBook[] {
  const current = readArray(RECENT_KEY).filter((value): value is RecentBook => typeof value === 'object' && value !== null && typeof (value as RecentBook).bookId === 'string' && typeof (value as RecentBook).lastOpened === 'number');
  if (current.length) return current.sort((a,b) => b.lastOpened-a.lastOpened).slice(0,10);
  const legacy = readArray('islamic-library-recent').filter((value): value is string => typeof value === 'string').map(bookId => ({ bookId, lastOpened: 0 }));
  if (legacy.length) localStorage.setItem(RECENT_KEY, JSON.stringify(legacy));
  return legacy;
}
function useCatalogue() {
  const [books,setBooks]=useState<Book[]>([]); const [error,setError]=useState(false);
  useEffect(()=>{getBooks().then(setBooks).catch(()=>setError(true));},[]);
  return {books,error};
}
function getCollections(books: Book[]): Collection[] {
  const groups = new Map<string, Collection>();
  for (const book of books) {
    if (!book.collection || book.volume === undefined) continue;
    const key = book.category + '|' + book.collection;
    const group = groups.get(key) ?? { key, slug: slugify(book.category+' '+book.collection), category: book.category, name: book.collection, books: [], volumeCount: 0 };
    group.books.push(book); groups.set(key, group);
  }
  const result=[...groups.values()].filter(group=>{group.books.sort((a,b)=>(a.volume??Number.MAX_SAFE_INTEGER)-(b.volume??Number.MAX_SAFE_INTEGER)||a.title.localeCompare(b.title,undefined,{numeric:true,sensitivity:'base'}));group.volumeCount=new Set(group.books.map(book=>book.volume)).size;return group.volumeCount>=2;}).sort((a,b)=>a.name.localeCompare(b.name));
  return result;
}
function slugify(value:string):string{return value.normalize('NFKD').toLocaleLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^\p{Letter}\p{Number}]+/gu,'-').replace(/^-|-$/g,'');}
function Header({books,theme,toggleTheme}:{books:Book[],theme:'light'|'dark',toggleTheme:()=>void}) {
  const [params]=useSearchParams(); const navigate=useNavigate(); const [query,setQuery]=useState(params.get('q')||''); const [open,setOpen]=useState(false); const searchRef=useRef<HTMLInputElement>(null);
  useEffect(()=>setQuery(params.get('q')||''),[params]);
  useEffect(()=>{const focusSearch=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();searchRef.current?.focus();}};window.addEventListener('keydown',focusSearch);return()=>window.removeEventListener('keydown',focusSearch);},[]);
  const submit=(e:FormEvent)=>{e.preventDefault();navigate(query.trim()?'/search?q='+encodeURIComponent(query.trim()):'/search');setOpen(false);};
  return <header className="site-header"><div className="header-inner"><Link to="/" className="brand"><span className="brand-icon"><BookOpen size={21}/></span><span>Islamic Library<small>PERSONAL COLLECTION</small></span></Link><nav className={open?'nav open':'nav'} aria-label="Main navigation" onClick={()=>setOpen(false)}><NavLink to="/" end>Home</NavLink><NavLink to="/categories">Categories</NavLink><NavLink to="/collections">Collections</NavLink><NavLink to="/about">About</NavLink><NavLink to="/favorites">Favorites <span className="nav-count">{readFavorites().length}</span></NavLink></nav><form className="header-search" title={books.length+' books in collection'} onSubmit={submit}><Search size={17}/><input ref={searchRef} aria-label="Search books, authors, topics" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search books, authors, topics..."/><button aria-label="Submit search"><ChevronRight size={17}/></button></form><button className="theme-toggle icon-button" onClick={toggleTheme} aria-label={'Switch to '+(theme==='light'?'dark':'light')+' mode'} title={'Switch to '+(theme==='light'?'dark':'light')+' mode'}>{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button><button className="mobile-menu icon-button" aria-expanded={open} aria-label={open?'Close menu':'Open menu'} onClick={()=>setOpen(!open)}>{open?<X size={21}/>:<Menu size={21}/>}</button></div></header>;
}
function Footer(){return <footer className="footer"><span>Islamic Library<small>A personal collection shared by Abdul Gaffar</small></span><span>A quiet place for beneficial reading.</span></footer>;}
function Shell({books,theme,toggleTheme,children}:{books:Book[],theme:'light'|'dark',toggleTheme:()=>void,children:ReactNode}){return <><Header books={books} theme={theme} toggleTheme={toggleTheme}/>{children}<Footer/></>;}
function BookCover({book,className=''}:{book:Book,className?:string}) {
  const [failed,setFailed]=useState(false);
  return <div className={'book-cover '+className}>{book.coverUrl&&!failed?<img src={book.coverUrl} alt={book.title} loading="lazy" onError={()=>setFailed(true)}/>:<div className="cover-fallback"><BookOpen size={33}/><strong>{book.title}</strong><span>{book.category}</span></div>}</div>;
}
function BookCard({book,favorites,toggle}:{book:Book,favorites:string[],toggle:(id:string)=>void}) {
  const fav=favorites.includes(book.id);
  return <article className="book-card"><Link className="book-card-main" to={'/books/'+encodeURIComponent(book.id)} aria-label={'View details for '+book.title}><BookCover book={book}/><div className="book-card-copy"><h3>{book.title}</h3>{book.author&&<p className="book-author">{book.author}</p>}<p>{book.subcategory||book.category}</p>{book.volume!==undefined&&<small>Volume {book.volume}</small>}</div></Link><div className="book-card-actions"><button className={'favorite icon-button '+(fav?'is-favorite':'')} onClick={()=>toggle(book.id)} aria-label={fav?'Remove '+book.title+' from favorites':'Add '+book.title+' to favorites'} title={fav?'Remove from favorites':'Add to favorites'}>{fav?<Heart size={17} fill="currentColor"/>:<Bookmark size={17}/>}</button><Link className="text-link" to={'/books/'+encodeURIComponent(book.id)+'/read'}>Read <ChevronRight size={15}/></Link></div></article>;
}
function BookGrid({books,favorites,toggle,empty='No books found'}:{books:Book[],favorites:string[],toggle:(id:string)=>void,empty?:string}) {
  if(!books.length)return <div className="empty-state"><span className="empty-icon"><BookMarked/></span><h3>{empty}</h3><p>{empty==='No favorites yet'?'Bookmark books you want to easily find later.':'Try a different search term.'}</p></div>;
  return <div className="book-grid">{books.map(book=><BookCard key={book.id} book={book} favorites={favorites} toggle={toggle}/>)}</div>;
}
function BookShelf({books,favorites,toggle}:{books:Book[],favorites:string[],toggle:(id:string)=>void}) {
  return <div className="book-shelf" role="region" tabIndex={0} aria-label="Recently added books">{books.map(book=><div className="book-shelf-item" key={book.id}><BookCard book={book} favorites={favorites} toggle={toggle}/></div>)}</div>;
}
function ContinueReading({books,allRecent,favorites,toggle}:{books:Book[],allRecent:Book[],favorites:string[],toggle:(id:string)=>void}) {
  return <section className="page-section continue-section"><div className="section-heading-row"><SectionTitle eyebrow="CONTINUE READING" title="Pick up where you left off"/><div className="section-heading-actions">{allRecent.length>4&&<Link className="quiet-link" to="/recently-read">View all <ArrowUpRight size={16}/></Link>}</div></div><div className="continue-grid">{books.slice(0,4).map(book=><article className="continue-card" key={book.id}><Link className="continue-cover" to={'/books/'+encodeURIComponent(book.id)+'/read'} aria-label={'Continue reading '+book.title}><BookCover book={book}/></Link><div className="continue-copy"><span className="eyebrow">{book.category}</span><Link to={'/books/'+encodeURIComponent(book.id)+'/read'}><strong>{book.title}</strong></Link>{book.author&&<small>{book.author}</small>}<Link className="text-link" to={'/books/'+encodeURIComponent(book.id)+'/read'}>Continue reading <ChevronRight size={15}/></Link></div><button className={'favorite icon-button '+(favorites.includes(book.id)?'is-favorite':'')} onClick={()=>toggle(book.id)} aria-label={favorites.includes(book.id)?'Remove '+book.title+' from favorites':'Add '+book.title+' to favorites'} title={favorites.includes(book.id)?'Remove from favorites':'Add to favorites'}>{favorites.includes(book.id)?<Heart size={16} fill="currentColor"/>:<Bookmark size={16}/>}</button></article>)}</div></section>;
}
function SectionTitle({eyebrow,title,detail}:{eyebrow?:string,title:string,detail?:string}){return <div className="section-title">{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{detail&&<p>{detail}</p>}</div>;}
function CategoryCards({books}:{books:Book[]}) {
  return <div className="category-grid">{categories.map((category,index)=>{const count=books.filter(book=>book.category.toLowerCase()===category.name.toLowerCase()).length;const Icon=categoryIcons[category.icon as keyof typeof categoryIcons]??LibraryBig;return <Link className="category-card" to={'/categories/'+encodeURIComponent(category.name)} key={category.name}><span className={'category-mark mark-'+index}><Icon size={20}/></span><span className="category-card-text"><strong>{category.name}</strong><small>{count} {count===1?'book':'books'}</small></span><ChevronRight className="category-arrow" size={17}/></Link>;})}</div>;
}
function CollectionCards({collections,limit}:{collections:Collection[],limit?:number}) {
  const list=limit?collections.slice(0,limit):collections;
  return <div className="collection-grid">{list.map(group=><Link className="collection-card" key={group.key} to={'/collections/'+group.slug}><span className="collection-previews">{group.books.slice(0,3).map(book=><span className="collection-preview" key={book.id}><BookCover book={book}/></span>)}</span><span className="collection-card-copy"><strong>{group.name}</strong><small>{group.volumeCount} {group.volumeCount===1?'volume':'volumes'} <span>· {group.category}</span></small></span><ChevronRight size={16}/></Link>)}</div>;
}
function Home({books,favorites,toggle}:{books:Book[],favorites:string[],toggle:(id:string)=>void}) {
  const navigate=useNavigate();const [query,setQuery]=useState('');const collections=getCollections(books);
  const allRecent=readRecent().map(item=>books.find(book=>book.id===item.bookId)).filter((book):book is Book=>Boolean(book));
  const recent=allRecent.slice(0,4);
  const recentlyAdded=[...books].sort((a,b)=>(b.sourceModifiedAt??0)-(a.sourceModifiedAt??0)).slice(0,6);
  return <main><section className="hero"><div className="hero-inner"><span className="eyebrow hero-eyebrow">A PERSONAL COLLECTION</span><h1>Islamic Library</h1><p>Explore the collection</p><form className="hero-search" onSubmit={e=>{e.preventDefault();navigate('/search?q='+encodeURIComponent(query));}}><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search books..." aria-label="Search books"/><button aria-label="Search"><ArrowUpRight size={19}/></button></form><div className="collection-note"><span className="note-dot"/>{books.length} books in the collection</div></div><div className="hero-decoration" aria-hidden="true"><div className="sun-disc"/><div className="arch-outer"><div className="arch-inner"><BookOpen size={58} strokeWidth={1}/></div></div></div></section>
    {recent.length>0&&<ContinueReading books={recent} allRecent={allRecent} favorites={favorites} toggle={toggle}/>}
    {recentlyAdded.length>0&&<section className="page-section recent-section"><div className="section-heading-row"><SectionTitle eyebrow="RECENTLY ADDED" title="Featured books" detail="Explore books from your collection."/><Link className="quiet-link" to="/books">View all <ArrowUpRight size={16}/></Link></div><BookShelf books={recentlyAdded} favorites={favorites} toggle={toggle}/></section>}
    <section className="page-section"><div className="section-heading-row"><SectionTitle eyebrow="EXPLORE THE COLLECTION" title="Browse categories" detail="Find a book by subject."/><Link className="quiet-link" to="/categories">All categories <ArrowUpRight size={16}/></Link></div><CategoryCards books={books}/></section>
    {collections.length>0&&<section className="page-section"><div className="section-heading-row"><SectionTitle eyebrow="MULTI-VOLUME SUBJECTS" title="Major collections" detail="Explore verified multi-volume works."/><Link className="quiet-link" to="/collections">All collections <ArrowUpRight size={16}/></Link></div><CollectionCards collections={collections} limit={6}/></section>}
    <section className="page-section about-promo"><div className="about-promo-inner"><span className="eyebrow">A LIBRARY SHARED WITH LOVE</span><h2>A collection gathered over many years</h2><p>This collection was lovingly compiled over many years by Abdul Gaffar, driven by his love for the Qur'an, the life of the Prophet ﷺ, and the pursuit of Islamic knowledge.</p><p>This digital library was created as a small initiative to preserve and make these books easier to access, so they can continue to benefit others.</p><Link to="/about" className="quiet-link">Read the story <ArrowUpRight size={16}/></Link></div></section></main>;
}
function AboutPage(){return <main className="about-page"><div className="about-breadcrumb"><Link to="/">Home</Link><ChevronRight size={14}/><span>About</span></div><header className="about-hero"><span className="about-book-mark" aria-hidden="true"><BookOpen size={30} strokeWidth={1.4}/></span><span className="eyebrow">THE STORY BEHIND THE COLLECTION</span><h1>About the Library</h1><h2>A Personal Islamic Library, Shared for the Benefit of Others</h2></header><div className="about-copy"><p>This collection began as the personal Islamic library of Abdul Gaffar, built over many years after his retirement.</p><p>What began with an interest in the biography and life of the beloved Prophet ﷺ gradually grew into a much wider collection of Islamic literature, covering different subjects and areas of knowledge.</p><p>Over the years, the collection grew to around 800 books, with additions and removals along the way. What remains today is a carefully gathered collection of books that he wished to share with family, friends, and those close to his heart.</p><p>His intention in sharing these books is simple: to encourage us to build our own small Islamic libraries, deepen our knowledge, and return to beneficial books regularly.</p><section className="about-section"><h2>Why this website was created</h2><p>Abdul Gaffar originally began sharing the books individually. Rather than continuing to transfer books one by one, this website was created as a small initiative to bring the collection together in one place.</p><p>The purpose is not to replace the personal nature of the collection, but to make it easier to browse, discover, and read.</p><p>These books represent years of effort, reading, collecting, and preserving Islamic literature. Making them accessible in an organized library allows that effort to continue benefiting others.</p></section><section className="about-section hope-section"><h2>A shared hope</h2><blockquote><span className="quote-mark" aria-hidden="true">“</span><p>"I want you to have mini Islamic Library of your own for deepening knowledge and frequent sharpening."</p></blockquote><p>He hoped that by passing these books on to people close to his heart, both the giver and the receiver could benefit and, by Allah's mercy, share in the reward.</p></section><p className="about-closing">May Allah accept his efforts, preserve the beneficial knowledge contained in this collection, and make it a source of continuous reward for everyone who contributed to sharing it. Ameen.</p><p className="about-signoff">— The Islamic Library</p><p className="about-attribution">Collection shared by Abdul Gaffar</p></div></main>;}
function CataloguePage({books,favorites,toggle}:{books:Book[],favorites:string[],toggle:(id:string)=>void}){return <main className="content-page"><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={14}/><span>All books</span></div><SectionTitle eyebrow="THE COLLECTION" title="All books" detail={books.length+' books'}/><BookGrid books={books} favorites={favorites} toggle={toggle}/></main>;}
function RecentBooksPage({books,favorites,toggle}:{books:Book[],favorites:string[],toggle:(id:string)=>void}){const recent=readRecent().map(item=>books.find(book=>book.id===item.bookId)).filter((book):book is Book=>Boolean(book)).slice(0,10);return <main className="content-page"><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={14}/><span>Recently read</span></div><SectionTitle eyebrow="YOUR READING HISTORY" title="Recently read" detail={recent.length+' '+(recent.length===1?'book':'books')}/><BookGrid books={recent} favorites={favorites} toggle={toggle} empty="No recently read books"/></main>;}
function CategoryIndex({books}:{books:Book[]}){return <main className="content-page"><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={14}/><span>Categories</span></div><SectionTitle eyebrow="THE COLLECTION" title="Browse categories" detail="Explore books grouped by subject."/><CategoryCards books={books}/></main>;}
function CategoryPage({books,favorites,toggle}:{books:Book[],favorites:string[],toggle:(id:string)=>void}) {
  const {category=''}=useParams();const name=decodeURIComponent(category);const selected=books.filter(book=>book.category.toLowerCase()===name.toLowerCase());const groups=Array.from(new Set(selected.map(book=>book.subcategory).filter(Boolean)));
  return <main className="content-page"><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={14}/><Link to="/categories">Categories</Link><ChevronRight size={14}/><span>{name}</span></div><SectionTitle eyebrow="CATEGORY" title={name} detail={selected.length+' '+(selected.length===1?'book':'books')}/>{groups.length?groups.map(group=><section className="subgroup" key={group}><div className="subgroup-heading"><h2>{group}</h2><span>{selected.filter(book=>book.subcategory===group).length} books</span></div><BookGrid books={selected.filter(book=>book.subcategory===group)} favorites={favorites} toggle={toggle}/></section>):<BookGrid books={selected} favorites={favorites} toggle={toggle} empty="No books in this category"/>}</main>;
}
function CollectionsIndex({books}:{books:Book[]}) {
  const collections=getCollections(books);
  return <main className="content-page"><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={14}/><span>Collections</span></div><SectionTitle eyebrow="MULTI-VOLUME SUBJECTS" title="Major collections" detail={collections.length+' collections'}/><CollectionCards collections={collections}/></main>;
}
function CollectionPage({books,favorites,toggle}:{books:Book[],favorites:string[],toggle:(id:string)=>void}) {
  const {collection=''}=useParams();const group=getCollections(books).find(item=>item.slug===collection);const selected=group?.books??[];const name=group?.name??'Collection';const category=group?.category;
  return <main className="content-page"><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={14}/><Link to="/collections">Collections</Link><ChevronRight size={14}/>{category&&<><Link to={'/categories/'+encodeURIComponent(category)}>{category}</Link><ChevronRight size={14}/></>}<span>{name}</span></div><SectionTitle eyebrow={category??'COLLECTION'} title={name} detail={group?`${group.volumeCount} volumes · ${selected.length} books`:'Collection not found'}/><BookGrid books={selected} favorites={favorites} toggle={toggle} empty="No books in this collection"/></main>;
}
function SearchPage({books,favorites,toggle}:{books:Book[],favorites:string[],toggle:(id:string)=>void}) {
  const [params,setParams]=useSearchParams();const query=params.get('q')||'';const results=useMemo(()=>searchBooks(books,query),[books,query]);
  return <main className="content-page"><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={14}/><span>Search</span></div><SectionTitle eyebrow="LIBRARY SEARCH" title={query?'Search results':'Search the collection'} detail={query?results.length+' '+(results.length===1?'book':'books')+' found':'Search by title, author, filename or subject.'}/><form className="results-search" onSubmit={e=>e.preventDefault()}><Search size={19}/><input aria-label="Search books" placeholder="Search books..." value={query} onChange={e=>setParams(e.target.value?{q:e.target.value}:{})}/>{query&&<button type="button" className="clear-search" onClick={()=>setParams({})} aria-label="Clear search"><X size={17}/></button>}</form>{query&&<BookGrid books={results} favorites={favorites} toggle={toggle}/>}</main>;
}
function FavoritesPage({books,favorites,toggle}:{books:Book[],favorites:string[],toggle:(id:string)=>void}) {
  const saved=favorites.map(id=>books.find(book=>book.id===id)).filter((book):book is Book=>Boolean(book));
  return <main className="content-page"><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={14}/><span>Favorites</span></div><SectionTitle eyebrow="YOUR SAVED BOOKS" title="Favorites" detail={saved.length+' '+(saved.length===1?'book':'books')}/><BookGrid books={saved} favorites={favorites} toggle={toggle} empty="No favorites yet"/></main>;
}
function useBook(id:string|undefined) {
  const [book,setBook]=useState<Book>();const [loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;if(id)getBookById(decodeURIComponent(id)).then(found=>{if(active)setBook(found);}).catch(()=>{}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[id]);
  return {book,loading};
}
function BookDetails({favorites,toggle}:{favorites:string[],toggle:(id:string)=>void}) {
  const {id}=useParams();const {book,loading}=useBook(id);
  if(loading)return <main className="content-page"><p className="loading-text">Loading book…</p></main>;
  if(!book)return <main className="content-page"><div className="empty-state"><h3>Book not found</h3><Link className="button-primary" to="/">Return home</Link></div></main>;
  const fav=favorites.includes(book.id);
  return <main className="content-page detail-page"><div className="breadcrumbs"><Link to="/">Home</Link><ChevronRight size={14}/><Link to={'/categories/'+encodeURIComponent(book.category)}>{book.category}</Link>{book.collection&&<><ChevronRight size={14}/><Link to={'/collections/'+slugify(book.category+' '+book.collection)}>{book.collection}</Link></>}</div><div className="detail-card"><BookCover book={book} className="detail-book-cover"/><div className="detail-copy"><span className="eyebrow">{book.category}{book.subcategory?' · '+book.subcategory:''}</span><h1>{book.title}</h1><p className="file-label"><FileText size={16}/>{book.fileType.toUpperCase()}</p>{book.author&&<p>By {book.author}</p>}{book.volume!==undefined&&<p>Volume {book.volume}</p>}{book.description&&<p>{book.description}</p>}<div className="detail-actions"><Link className="button-primary" to={'/books/'+encodeURIComponent(book.id)+'/read'}><BookOpen size={17}/>Read book</Link><button className={'button-secondary '+(fav?'is-favorite':'')} onClick={()=>toggle(book.id)}>{fav?<Check size={17}/>:<Bookmark size={17}/>} {fav?'Saved to favorites':'Add to favorites'}</button></div></div></div></main>;
}
function Reader({favorites,toggle}:{favorites:string[],toggle:(id:string)=>void}) {
  const {id}=useParams();const {book,loading}=useBook(id);const [failed,setFailed]=useState(false);const [pdfSource,setPdfSource]=useState<string>();const [pdfLoading,setPdfLoading]=useState(false);
  useEffect(()=>{if(!id)return;const bookId=decodeURIComponent(id);const next=[{bookId,lastOpened:Date.now()},...readRecent().filter(item=>item.bookId!==bookId)].slice(0,10);localStorage.setItem(RECENT_KEY,JSON.stringify(next));},[id]);
  useEffect(()=>{
    setFailed(false);setPdfSource(undefined);
    if(!book||book.fileType!=='pdf'){setPdfLoading(false);return;}
    const source=new URL(book.fileUrl,window.location.href);
    if(source.origin===window.location.origin){setPdfSource(source.href);setPdfLoading(false);return;}
    let active=true;let objectUrl:string|undefined;setPdfLoading(true);
    fetch(source.href).then(response=>{if(!response.ok)throw new Error('Unable to download the PDF');return response.blob();}).then(blob=>{
      objectUrl=URL.createObjectURL(new Blob([blob],{type:'application/pdf'}));
      if(active)setPdfSource(objectUrl);
    }).catch(()=>{if(active)setFailed(true);}).finally(()=>{if(active)setPdfLoading(false);});
    return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[book?.fileUrl,book?.fileType]);
  if(loading)return <main className="reader-page"><p>Loading reader…</p></main>;
  if(!book)return <main className="reader-page"><p>Book not found.</p></main>;
  const fav=favorites.includes(book.id);
  return <main className="reader-page"><div className="reader-toolbar"><Link className="reader-back" to={'/books/'+encodeURIComponent(book.id)}><ArrowLeft size={18}/><span>Back</span></Link><strong>{book.title}</strong><div className="reader-toolbar-actions"><button className={'favorite icon-button '+(fav?'is-favorite':'')} onClick={()=>toggle(book.id)} aria-label={fav?'Remove from favorites':'Add to favorites'}>{fav?<Heart size={18} fill="currentColor"/>:<Bookmark size={18}/>}</button><a className="reader-open" href={book.fileUrl} target="_blank" rel="noreferrer">Open PDF <ArrowUpRight size={16}/></a></div></div>{failed?<div className="reader-error"><FileText size={34}/><h2>Unable to open this book.</h2><p>The book file may have been moved or is unavailable.</p><a className="button-secondary" href={book.fileUrl} target="_blank" rel="noreferrer">Try opening the file</a></div>:book.fileType==='pdf'?pdfLoading?<div className="reader-loading">Loading PDFâ€¦</div>:pdfSource?<iframe title={'PDF reader: '+book.title} src={pdfSource} className="pdf-frame" onError={()=>setFailed(true)}/>:<div className="reader-loading">Preparing PDFâ€¦</div>:<div className="reader-error"><FileText size={34}/><h2>This file type cannot be previewed in the browser.</h2><p>Download or open the document to continue reading.</p><a className="button-primary" href={book.fileUrl} target="_blank" rel="noreferrer">Open file <ArrowUpRight size={16}/></a></div>}</main>;
}
export default function App() {
  const {books,error}=useCatalogue();const [favorites,setFavorites]=useState<string[]>(()=>readFavorites());
  const [theme,setTheme]=useState<'light'|'dark'>(()=>localStorage.getItem('theme')==='dark'?'dark':'light');
  useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('theme',theme);},[theme]);
  const toggleTheme=()=>setTheme(current=>current==='light'?'dark':'light');
  const toggle=(id:string)=>setFavorites(current=>{const next=current.includes(id)?current.filter(value=>value!==id):[id,...current];localStorage.setItem(FAVORITES_KEY,JSON.stringify(next));return next;});
  const wrap=(page:ReactNode)=><Shell books={books} theme={theme} toggleTheme={toggleTheme}>{error&&<div className="catalogue-error">The book catalogue could not be loaded. Please refresh the page.</div>}{page}</Shell>;
  return <Routes><Route path="/books/:id/read" element={<Reader favorites={favorites} toggle={toggle}/>}/><Route path="/" element={wrap(<Home books={books} favorites={favorites} toggle={toggle}/>)}/><Route path="/about" element={wrap(<AboutPage/>)}/><Route path="/books" element={wrap(<CataloguePage books={books} favorites={favorites} toggle={toggle}/>)}/><Route path="/recently-read" element={wrap(<RecentBooksPage books={books} favorites={favorites} toggle={toggle}/>)}/><Route path="/categories" element={wrap(<CategoryIndex books={books}/>)}/><Route path="/categories/:category" element={wrap(<CategoryPage books={books} favorites={favorites} toggle={toggle}/>)}/><Route path="/collections" element={wrap(<CollectionsIndex books={books}/>)}/><Route path="/collections/:collection" element={wrap(<CollectionPage books={books} favorites={favorites} toggle={toggle}/>)}/><Route path="/search" element={wrap(<SearchPage books={books} favorites={favorites} toggle={toggle}/>)}/><Route path="/favorites" element={wrap(<FavoritesPage books={books} favorites={favorites} toggle={toggle}/>)}/><Route path="/books/:id" element={wrap(<BookDetails favorites={favorites} toggle={toggle}/>)}/><Route path="*" element={wrap(<main className="content-page"><SectionTitle title="Page not found"/><Link to="/">Return home</Link></main>)}/></Routes>;
}
