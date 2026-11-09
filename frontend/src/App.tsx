import { useEffect, useMemo, useState } from 'react';
import { Armchair, ArrowDown, ArrowRight, CalendarCheck2, CalendarDays, Check, ChevronRight, CircleAlert, Clock3, DoorOpen, HelpCircle, LayoutGrid, LoaderCircle, LogIn, LogOut, MapPin, Menu, Pencil, RefreshCw, Search, Settings2, SlidersHorizontal, Users, X } from 'lucide-react';
import { api, ApiError } from './api';
import { AdminPanel, BookingModal, CancelModal, LoginModal } from './Forms';
import Modal from './Modal';
import type { Reservation, Resource, TimeFilter, User, View } from './types';
import { formatDate, formatTime, initialFilter, localDate, timeRange } from './utils';

export default function App() {
  const [view, setView] = useState<View>('spaces');
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('mydesk-token'));
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(Boolean(token));
  const [sessionError, setSessionError] = useState('');
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [available, setAvailable] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsError, setReservationsError] = useState('');
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState<TimeFilter>(initialFilter);
  const [filter, setFilter] = useState<TimeFilter>(initialFilter);
  const [filterError, setFilterError] = useState('');
  const [type, setType] = useState<'all' | 'desk' | 'room'>('all');
  const [location, setLocation] = useState('all');
  const [query, setQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState('available');
  const [booking, setBooking] = useState<{ resource: Resource; reservation?: Reservation } | null>(null);
  const [cancel, setCancel] = useState<Reservation | null>(null);
  const [toast, setToast] = useState('');
  const [reservationTab, setReservationTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');

  function logout() {
    sessionStorage.removeItem('mydesk-token'); setToken(null); setUser(null);
    setReservations([]); setBooking(null); setCancel(null); setView('spaces');
  }

  useEffect(() => {
    if (!token) { setSessionLoading(false); setSessionError(''); return; }
    let current = true;
    setSessionLoading(true); setSessionError('');
    api<User>('/auth/me', {}, token).then(data => { if (current) setUser(data); }).catch(e => {
      if (!current) return;
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        sessionStorage.removeItem('mydesk-token'); setToken(null); setUser(null);
        setToast('Sesja wygasła. Zaloguj się ponownie.');
      } else setSessionError((e as Error).message);
    }).finally(() => { if (current) setSessionLoading(false); });
    return () => { current = false; };
  }, [token, sessionAttempt]);

  useEffect(() => {
    let current = true;
    setLoading(true); setLoadError('');
    const params = new URLSearchParams(timeRange(filter));
    Promise.all([api<Resource[]>('/resources'), api<Resource[]>(`/resources/availability?${params}`)])
      .then(([all, free]) => { if (current) { setResources(all); setAvailable(new Set(free.map(item => item.id))); } })
      .catch(e => { if (current) setLoadError((e as Error).message); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [filter, revision]);

  useEffect(() => {
    if (!token || !user) return;
    let current = true;
    setReservationsLoading(true); setReservationsError('');
    api<Reservation[]>('/reservations', {}, token).then(data => { if (current) setReservations(data); })
      .catch(e => {
        if (!current) return;
        if (e instanceof ApiError && e.status === 401) {
          sessionStorage.removeItem('mydesk-token'); setToken(null); setUser(null); setReservations([]);
          setToast('Sesja wygasła. Zaloguj się ponownie.');
        } else setReservationsError((e as Error).message);
      }).finally(() => { if (current) setReservationsLoading(false); });
    return () => { current = false; };
  }, [token, user, revision]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 6500);
    return () => clearTimeout(timer);
  }, [toast]);

  function navigate(next: View) { setView(next); setMobileOpen(false); }
  function saved(message: string) { setBooking(null); setCancel(null); setToast(message); setRevision(value => value + 1); }
  function applyFilter() {
    if (!draft.date || !draft.start || !draft.end) return setFilterError('Uzupełnij datę i godziny.');
    if (draft.end <= draft.start) return setFilterError('Godzina zakończenia musi być późniejsza od rozpoczęcia.');
    if (draft.date < localDate()) return setFilterError('Wybierz dzisiejszą lub przyszłą datę.');
    setFilterError(''); setFilter({ ...draft });
  }

  const locations = [...new Set(resources.map(item => item.location))].sort();
  const filtered = useMemo(() => resources.filter(item =>
    (type === 'all' || item.type === type) && (location === 'all' || item.location === location) &&
    (!onlyAvailable || available.has(item.id)) && `${item.name} ${item.location}`.toLocaleLowerCase('pl').includes(query.toLocaleLowerCase('pl')),
  ).sort((a, b) => sort === 'capacity' ? b.capacity - a.capacity : sort === 'name' ? a.name.localeCompare(b.name, 'pl') : Number(available.has(b.id)) - Number(available.has(a.id)) || a.id - b.id), [resources, available, type, location, query, onlyAvailable, sort]);
  const activeReservations = reservations.filter(item => item.status === 'active' && new Date(item.end_time) > new Date()).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const shownReservations = reservations.filter(item => reservationTab === 'cancelled' ? item.status === 'cancelled' : item.status === 'active' && (reservationTab === 'upcoming' ? new Date(item.end_time) > new Date() : new Date(item.end_time) <= new Date())).sort((a, b) => reservationTab === 'upcoming' ? a.start_time.localeCompare(b.start_time) : b.start_time.localeCompare(a.start_time));
  const navItems = [
    { id: 'spaces' as View, label: 'Znajdź miejsce', icon: LayoutGrid },
    { id: 'reservations' as View, label: 'Moje rezerwacje', icon: CalendarDays },
    ...(user?.role === 'admin' ? [{ id: 'admin' as View, label: 'Administracja', icon: Settings2 }] : []),
  ];
  const title = view === 'spaces' ? 'Znajdź miejsce' : view === 'reservations' ? 'Moje rezerwacje' : 'Administracja';

  return <div className="app-shell">
    <a href="#main" className="skip-link">Przejdź do treści</a>
    {mobileOpen && <button className="sidebar-overlay" aria-label="Zamknij menu" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
      <a className="brand" href="#" onClick={event => { event.preventDefault(); navigate('spaces'); }} aria-label="MyDesk — strona główna"><span className="brand-mark"><Armchair size={23} strokeWidth={1.7} /></span><span>MyDesk</span></a>
      <nav aria-label="Menu główne">{navItems.map(item => <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined}><item.icon size={20} /><span>{item.label}</span>{item.id === 'reservations' && user && activeReservations.length > 0 && <span className="nav-count">{activeReservations.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item help-button" onClick={() => setHelpOpen(true)}><HelpCircle size={19} />Jak to działa?<ArrowRight size={16} /></button><div className="sidebar-profile"><span className="avatar">{user ? `${user.name[0]}${user.surname[0]}` : <Users size={18} />}</span><div><strong>{user ? `${user.name} ${user.surname}` : 'Tryb gościa'}</strong><span>{user?.role === 'admin' ? 'Administrator' : user ? 'Pracownik' : 'Niezalogowany'}</span></div><button className="icon-button" title={user ? 'Wyloguj się' : 'Zaloguj się'} aria-label={user ? 'Wyloguj się' : 'Zaloguj się'} disabled={sessionLoading} onClick={() => user ? logout() : setLoginOpen(true)}>{user ? <LogOut size={18} /> : <LogIn size={18} />}</button></div></div>
    </aside>

    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Otwórz menu" onClick={() => setMobileOpen(true)}><Menu size={21} /></button><span className="breadcrumb-home">Moje biuro</span><ChevronRight size={14} /><strong>{title}</strong></div><div className="topbar-right"><span className="today"><CalendarDays size={15} />{formatDate(`${localDate()}T12:00:00`, { day: 'numeric', month: 'long', year: 'numeric' })}</span><span className="topbar-divider" />{sessionLoading ? <span className="muted small"><LoaderCircle size={16} className="spin" /> Łączenie…</span> : user ? <span className="header-user"><span className="online-dot" />Cześć, {user.name}!</span> : <button className="button small-button secondary" onClick={() => setLoginOpen(true)}>Zaloguj się<ArrowRight size={15} /></button>}</div></header>

      <main id="main">
        {sessionError && <div className="session-error" role="alert"><CircleAlert size={18} /><span>Nie udało się przywrócić sesji. {sessionError}</span><button onClick={() => setSessionAttempt(value => value + 1)}>Ponów</button><button onClick={logout}>Kontynuuj jako gość</button></div>}
        {view === 'spaces' ? <>
          <section className="spaces-section" aria-labelledby="spaces-title"><div className="section-heading"><div><h1 id="spaces-title">Biurka i sale</h1><p className="muted">Wybierz termin i sprawdź dostępne miejsca.</p></div></div>
            <form className="filter-panel" onSubmit={event => { event.preventDefault(); applyFilter(); }}><div className="date-field filter-field"><CalendarDays size={19} /><label>Data<input aria-label="Data dostępności" type="date" min={localDate()} required value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} /></label></div><div className="time-fields"><Clock3 size={19} /><label>Od<input aria-label="Godzina rozpoczęcia" type="time" required value={draft.start} onChange={event => setDraft({ ...draft, start: event.target.value })} /></label><span className="time-dash">—</span><label>Do<input aria-label="Godzina zakończenia" type="time" required value={draft.end} onChange={event => setDraft({ ...draft, end: event.target.value })} /></label></div><div className="filter-field location-field"><MapPin size={19} /><label>Lokalizacja<select aria-label="Lokalizacja" value={location} onChange={event => setLocation(event.target.value)}><option value="all">Wszystkie lokalizacje</option>{locations.map(item => <option key={item}>{item}</option>)}</select></label></div><button className="button primary search-button" type="submit"><Search size={17} />Sprawdź dostępność</button></form>
            {filterError && <p className="inline-error" role="alert">{filterError}</p>}
            {(draft.date !== filter.date || draft.start !== filter.start || draft.end !== filter.end) && <p className="filter-hint">Zmieniono termin. Kliknij „Sprawdź dostępność”, aby odświeżyć wyniki.</p>}
            <div className="catalog-toolbar"><div className="tabs" role="tablist" aria-label="Rodzaj miejsca">{([{ id: 'all', label: 'Wszystkie miejsca', icon: LayoutGrid }, { id: 'desk', label: 'Biurka', icon: Armchair }, { id: 'room', label: 'Sale konferencyjne', icon: DoorOpen }] as const).map(item => <button key={item.id} role="tab" aria-selected={type === item.id} className={type === item.id ? 'active' : ''} onClick={() => setType(item.id)}><item.icon size={16} />{item.label}<span>{item.id === 'all' ? resources.length : resources.filter(resource => resource.type === item.id).length}</span></button>)}</div><label className="availability-toggle"><input type="checkbox" checked={onlyAvailable} onChange={event => setOnlyAvailable(event.target.checked)} />Tylko dostępne</label></div>
            <div className="results-toolbar"><span className="result-count">{loading ? 'Sprawdzamy dostępność…' : loadError ? 'Dostępność chwilowo niedostępna' : <><strong>{filtered.length}</strong> {filtered.length === 1 ? 'miejsce' : 'miejsc'} <span>· {formatDate(`${filter.date}T12:00:00`)} · {filter.start}–{filter.end}</span></>}</span><div className="results-actions"><label className="inline-search"><Search size={16} /><input aria-label="Szukaj miejsca" placeholder="Szukaj miejsca…" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="sort-select"><ArrowDown size={14} /><select aria-label="Sortowanie" value={sort} onChange={event => setSort(event.target.value)}><option value="available">Dostępne najpierw</option><option value="name">Nazwa A–Z</option><option value="capacity">Najwięcej osób</option></select></label></div></div>
            {loading ? <div className="resource-grid" aria-busy="true" aria-label="Ładowanie miejsc">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton-card"><div /><span /><span /></div>)}</div> : loadError ? <EmptyState icon={<CircleAlert size={28} />} title="Nie możemy sprawdzić dostępności" text={loadError} action={<button className="button secondary" onClick={() => setRevision(value => value + 1)}><RefreshCw size={16} />Spróbuj ponownie</button>} /> : filtered.length === 0 ? <EmptyState icon={<Search size={28} />} title="Nie znaleźliśmy takiego miejsca" text="Zmień filtry lub wybierz inny termin." action={<button className="button secondary" onClick={() => { setType('all'); setLocation('all'); setOnlyAvailable(false); setQuery(''); }}>Wyczyść filtry</button>} /> : <div className="resource-grid">{filtered.map(resource => <article className="resource-card" key={resource.id}><div className="card-content"><div className="card-meta"><span className="resource-type">{resource.type === 'room' ? 'Sala konferencyjna' : 'Biurko'}</span><span className={`availability-badge ${available.has(resource.id) ? 'free' : 'occupied'}`}><span />{available.has(resource.id) ? 'Dostępne' : 'Zajęte'}</span></div><div className="card-title-row"><h3>{resource.name}</h3></div><p className="card-location"><MapPin size={14} />{resource.location}</p><div className="card-bottom"><span className="muted small">{resource.capacity} {resource.capacity === 1 ? 'osoba' : 'osób'}</span><button className={`book-button ${!available.has(resource.id) ? 'unavailable' : ''}`} disabled={!available.has(resource.id) || sessionLoading} onClick={() => user ? setBooking({ resource }) : setLoginOpen(true)}>{available.has(resource.id) ? 'Zarezerwuj' : 'Niedostępne'}{available.has(resource.id) && <ArrowRight size={16} />}</button></div></div></article>)}</div>}
          </section>
        </> : view === 'reservations' ? <>
          <div className="page-heading"><h1>Moje rezerwacje</h1><p className="muted">Przeglądaj, zmieniaj i anuluj swoje rezerwacje.</p></div>
          {!user ? <EmptyState icon={<CalendarDays size={30} />} title="Zaloguj się, aby zobaczyć rezerwacje" text="Zaloguj się, aby przeglądać rezerwacje i zarządzać swoimi wizytami w biurze." action={<button className="button primary" onClick={() => setLoginOpen(true)}>Zaloguj się<ArrowRight size={16} /></button>} /> : <><div className="reservation-toolbar"><div className="tabs" role="tablist" aria-label="Status rezerwacji">{([['upcoming', 'Nadchodzące'], ['past', 'Zakończone'], ['cancelled', 'Anulowane']] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={reservationTab === id} className={reservationTab === id ? 'active' : ''} onClick={() => setReservationTab(id)}>{label}</button>)}</div><button className="button primary" onClick={() => navigate('spaces')}>Nowa rezerwacja<ArrowRight size={16} /></button></div>{reservationsLoading ? <div className="loading-state"><LoaderCircle className="spin" /> Wczytywanie rezerwacji…</div> : reservationsError ? <EmptyState icon={<CircleAlert size={28} />} title="Nie udało się pobrać rezerwacji" text={reservationsError} action={<button className="button secondary" onClick={() => setRevision(value => value + 1)}>Spróbuj ponownie</button>} /> : shownReservations.length === 0 ? <EmptyState icon={<CalendarCheck2 size={30} />} title={reservationTab === 'upcoming' ? 'Brak nadchodzących rezerwacji' : 'Nie ma tu jeszcze rezerwacji'} text={reservationTab === 'upcoming' ? 'Wybierz biurko lub salę i zaplanuj kolejny dzień w biurze.' : 'Rezerwacje z tym statusem pojawią się tutaj.'} action={<button className="button secondary" onClick={() => navigate('spaces')}>Znajdź miejsce<ArrowRight size={16} /></button>} /> : <div className="reservation-list">{shownReservations.map(item => {
            const resource = item.resource ?? resources.find(r => r.id === item.resource_id);
            const editable = item.status === 'active' && new Date(item.start_time) > new Date();
            return <article className="reservation-card" key={item.id}><div className="reservation-date"><strong>{new Date(item.start_time).getDate()}</strong><span>{formatDate(item.start_time, { month: 'short' })}</span></div><div className="reservation-info"><div><span className={`status-pill ${item.status === 'cancelled' ? 'cancelled' : reservationTab === 'past' ? 'past' : ''}`}>{item.status === 'cancelled' ? 'Anulowana' : reservationTab === 'past' ? 'Zakończona' : 'Potwierdzona'}</span><span className="reservation-id">#{String(item.id).padStart(4, '0')}</span></div><h3>{resource?.name ?? `Zasób #${item.resource_id}`}</h3><p><MapPin size={14} />{resource?.location ?? 'Biuro'}<span>·</span><Clock3 size={14} />{formatTime(item.start_time)}–{formatTime(item.end_time)}{localDate(new Date(item.start_time)) !== localDate(new Date(item.end_time)) && ` (${formatDate(item.end_time)})`}</p></div>{editable && <div className="reservation-actions"><button className="button secondary small-button" disabled={!resource} onClick={() => resource && setBooking({ resource, reservation: item })}><Pencil size={14} />Edytuj</button><button className="icon-button cancel-button" aria-label={`Anuluj rezerwację ${resource?.name ?? item.id}`} onClick={() => setCancel(item)}><X size={19} /></button></div>}</article>;
          })}</div>}</>}
        </> : user?.role === 'admin' && token ? <><div className="page-heading"><h1>Administracja</h1><p className="muted">Zarządzaj pracownikami i miejscami w biurze.</p></div><AdminPanel token={token} onSaved={saved} /></> : null}
      </main>
    </div>
    {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onLogin={(newToken, newUser) => { sessionStorage.setItem('mydesk-token', newToken); setToken(newToken); setUser(newUser); setLoginOpen(false); setToast(`Zalogowano jako ${newUser.name}.`); }} />}
    {booking && token && user && <BookingModal {...booking} resources={resources} filter={filter} token={token} onClose={() => setBooking(null)} onSaved={saved} />}
    {cancel && token && user && <CancelModal reservation={cancel} token={token} onClose={() => setCancel(null)} onSaved={saved} />}
    {helpOpen && <Modal title="Jak zarezerwować miejsce?" onClose={() => setHelpOpen(false)}><div className="help-steps">{[{ icon: CalendarDays, title: 'Wybierz termin', text: 'Podaj dzień i godziny wizyty. Dostępność jest sprawdzana dla całego przedziału.' }, { icon: SlidersHorizontal, title: 'Wybierz miejsce', text: 'Przeglądaj biurka i sale. Filtruj lokalizację i wybierz miejsce dla siebie lub zespołu.' }, { icon: CalendarCheck2, title: 'Zarezerwuj i gotowe', text: 'Zaloguj się, potwierdź termin lub ustaw cykl. Rezerwacje możesz edytować i anulować przed rozpoczęciem.' }].map((step, i) => <div key={step.title}><span className="help-step-icon"><step.icon size={21} /></span><div><span className="eyebrow">KROK 0{i + 1}</span><h3>{step.title}</h3><p>{step.text}</p></div></div>)}</div><button className="button primary full-width" onClick={() => { setHelpOpen(false); navigate('spaces'); }}>Przeglądaj miejsca<ArrowRight size={16} /></button></Modal>}
    {toast && <div className="toast" role="status"><span><Check size={19} /></span><p>{toast}</p><button className="icon-button" aria-label="Zamknij powiadomienie" onClick={() => setToast('')}><X size={17} /></button></div>}
  </div>;
}


function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{text}</p>{action}</div>;
}
