import { useState, type FormEvent } from 'react';
import { ArrowRight, CalendarDays, Check, CircleAlert, LoaderCircle, LockKeyhole, MapPin, Repeat2 } from 'lucide-react';
import { api } from './api';
import Modal from './Modal';
import type { Reservation, Resource, TimeFilter, User } from './types';
import { localDate, timeRange } from './utils';

export function FormError({ message }: { message: string }) {
  return message ? <div className="form-error" role="alert"><CircleAlert size={18} /><span>{message}</span></div> : null;
}

export function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return <button className="button primary" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : null}{children}{!busy && <ArrowRight size={17} />}</button>;
}

export function LoginModal({ onClose, onLogin }: { onClose: () => void; onLogin: (token: string, user: User) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const { access_token } = await api<{ access_token: string }>('/auth/login', {
        method: 'POST', body: new URLSearchParams({ username: String(data.get('email')), password: String(data.get('password')) }),
      });
      const user = await api<User>('/users/me', {}, access_token);
      onLogin(access_token, user);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <Modal title="Logowanie" subtitle="Zaloguj się i zarezerwuj swoje miejsce w biurze." onClose={onClose} busy={busy}>
    <form className="form" onSubmit={submit}>
      <label>Służbowy adres e-mail<input name="email" type="email" autoComplete="username" placeholder="imie.nazwisko@firma.pl" required /></label>
      <label>Hasło<input name="password" type="password" autoComplete="current-password" placeholder="Wpisz hasło" required /></label>
      <FormError message={error} />
      <SubmitButton busy={busy}>Zaloguj się</SubmitButton>
      <p className="form-note"><LockKeyhole size={15} /> Nie masz konta? Poproś administratora o dostęp.</p>
    </form>
  </Modal>;
}

export function PasswordChangeModal({ token, onClose, onSaved }: { token: string; onClose: () => void; onSaved: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setError('');
    try {
      await api('/users/me/password', { method: 'PATCH', body: JSON.stringify(data) }, token);
      onSaved('Hasło zostało zmienione.');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <Modal title="Zmiana hasła" subtitle="Ustaw nowe hasło do swojego konta." onClose={onClose} busy={busy}>
    <form className="form" onSubmit={submit}>
      <label>Obecne hasło<input name="current_password" type="password" autoComplete="current-password" required /></label>
      <label>Nowe hasło<input name="new_password" type="password" autoComplete="new-password" minLength={6} required /></label>
      <FormError message={error} />
      <SubmitButton busy={busy}>Zmień hasło</SubmitButton>
    </form>
  </Modal>;
}

export function BookingModal({ resource, reservation, resources, filter, token, onClose, onSaved }: {
  resource: Resource;
  reservation?: Reservation;
  resources: Resource[];
  filter: TimeFilter;
  token: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [date, setDate] = useState(reservation?.start_time.slice(0, 10) ?? filter.date);
  const [start, setStart] = useState(reservation?.start_time.slice(11, 16) ?? filter.start);
  const [end, setEnd] = useState(reservation?.end_time.slice(11, 16) ?? filter.end);
  const [resourceId, setResourceId] = useState(resource.id);
  const [recurring, setRecurring] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>([(new Date(`${date}T12:00:00`).getDay() + 6) % 7]);
  const [until, setUntil] = useState(date);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selectedResource = resources.find(item => item.id === resourceId) ?? resource;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const times = timeRange({ date, start, end });
    if (end <= start) return setError('Godzina zakończenia musi być późniejsza od rozpoczęcia.');
    if (new Date(times.start_time) <= new Date()) return setError('Wybierz termin w przyszłości.');
    if (recurring && (!weekdays.length || until < date)) return setError('Wybierz dni tygodnia i poprawną datę końcową.');
    setBusy(true);
    try {
      const payload = { resource_id: resourceId, ...times, ...(recurring ? { weekdays, repeat_until: until } : {}) };
      const result = await api<Reservation | Reservation[]>(reservation ? `/reservations/${reservation.id}` : recurring ? '/reservations/recurring' : '/reservations', {
        method: reservation ? 'PUT' : 'POST', body: JSON.stringify(payload),
      }, token);
      onSaved(reservation ? 'Zmiany w rezerwacji zostały zapisane.' : Array.isArray(result) ? `Utworzono rezerwacje cykliczne: ${result.length}.` : 'Rezerwacja została zapisana.');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <Modal title={reservation ? 'Edytuj rezerwację' : 'Nowa rezerwacja'} subtitle="Sprawdź termin i potwierdź rezerwację." onClose={onClose} busy={busy}>
    <div className="booking-summary"><div className="summary-icon"><CalendarDays size={23} /></div><div><strong>{selectedResource.name}</strong><span><MapPin size={13} />{selectedResource.location} · {selectedResource.capacity} os.</span></div><Check size={19} /></div>
    <form className="form" onSubmit={submit}>
      {reservation && <label>Miejsce<select value={resourceId} onChange={event => setResourceId(Number(event.target.value))}>{resources.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      <label>Data rezerwacji<input type="date" required value={date} min={localDate()} onChange={event => { setDate(event.target.value); if (until < event.target.value) setUntil(event.target.value); if (!recurring) setWeekdays([(new Date(`${event.target.value}T12:00:00`).getDay() + 6) % 7]); }} /></label>
      <div className="form-row"><label>Od godziny<input type="time" required value={start} onChange={event => setStart(event.target.value)} /></label><label>Do godziny<input type="time" required value={end} onChange={event => setEnd(event.target.value)} /></label></div>
      {!reservation && <label className="check-label"><input type="checkbox" checked={recurring} onChange={event => setRecurring(event.target.checked)} /><Repeat2 size={18} /><span>Powtarzaj rezerwację co tydzień</span></label>}
      {recurring && <div className="recurring-fields"><fieldset><legend>Wybierz dni tygodnia</legend><div className="weekdays">{['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'].map((name, i) => <button type="button" key={name} aria-pressed={weekdays.includes(i)} className={weekdays.includes(i) ? 'selected' : ''} onClick={() => setWeekdays(prev => prev.includes(i) ? prev.filter(day => day !== i) : [...prev, i])}>{name}</button>)}</div></fieldset><label>Powtarzaj do<input type="date" value={until} min={date} required onChange={event => setUntil(event.target.value)} /></label><p className="muted small">Wszystkie terminy zostaną sprawdzone przed zapisaniem cyklu.</p></div>}
      <FormError message={error} />
      <SubmitButton busy={busy}>{reservation ? 'Zapisz zmiany' : recurring ? 'Zarezerwuj cyklicznie' : 'Potwierdź rezerwację'}</SubmitButton>
      <p className="form-note">Swoją rezerwację znajdziesz w zakładce „Moje rezerwacje”.</p>
    </form>
  </Modal>;
}

export function CancelModal({ reservation, token, onClose, onSaved }: { reservation: Reservation; token: string; onClose: () => void; onSaved: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function cancel() {
    if (busy) return;
    setBusy(true); setError('');
    try { await api(`/reservations/${reservation.id}`, { method: 'DELETE' }, token); onSaved('Rezerwacja została anulowana.'); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <Modal title="Anulować rezerwację?" subtitle={`Zwolnisz miejsce: ${reservation.resource?.name ?? `Zasób #${reservation.resource_id}`}. Inna osoba będzie mogła z niego skorzystać.`} onClose={onClose} busy={busy}>
    <FormError message={error} /><div className="modal-actions"><button className="button secondary" disabled={busy} onClick={onClose}>Zachowaj rezerwację</button><button className="button danger" disabled={busy} onClick={cancel}>{busy && <LoaderCircle className="spin" size={16} />}Anuluj rezerwację</button></div>
  </Modal>;
}

export function AdminPanel({ token, onSaved }: { token: string; onSaved: (message: string) => void }) {
  const [tab, setTab] = useState<'user' | 'resource' | 'access' | 'users'>('user');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true); setError('');
    try {
      if (tab === 'user') {
        const user = await api<User>('/auth/register', { method: 'POST', body: JSON.stringify(data) }, token);
        onSaved(`Utworzono konto ${user.name} ${user.surname}. Identyfikator: ${user.id}.`);
      } else if (tab === 'resource') {
        await api('/resources', { method: 'POST', body: JSON.stringify({ ...data, capacity: Number(data.capacity) }) }, token);
        onSaved('Nowe miejsce zostało dodane do biura.');
      } else if (tab === 'users') {
        const search = String(data.search).trim();
        const result = await api<User[]>(`/users?search=${encodeURIComponent(search)}`, {}, token);
        setUsers(result);
      } else {
        const user = await api<User>(`/users/${data.id}/${data.action}`, { method: 'PATCH' }, token);
        setUsers(prev => prev.map(item => item.id === user.id ? user : item));
        onSaved(`Konto ${user.email} zostało ${user.is_active ? 'aktywowane' : 'dezaktywowane'}.`);
      }
      form.reset();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="admin-layout"><div className="panel"><div className="panel-heading"><h2>Zarządzanie biurem</h2><p className="muted">Zarządzaj dostępem pracowników i dodawaj nowe miejsca.</p></div><div className="tabs admin-tabs" role="tablist" aria-label="Zarządzanie">{([['user', 'Nowy pracownik'], ['resource', 'Nowe miejsce'], ['access', 'Dostęp do kont'], ['users', 'Użytkownicy']] as const).map(([id, label]) => <button role="tab" aria-selected={tab === id} key={id} disabled={busy} className={tab === id ? 'active' : ''} onClick={() => { setTab(id); setError(''); setUsers([]); }}>{label}</button>)}</div>
      <form className="form admin-form" key={tab} onSubmit={submit}>
        {tab === 'user' ? <><div className="form-row"><label>Imię<input name="name" required minLength={2} maxLength={100} autoComplete="off" /></label><label>Nazwisko<input name="surname" required minLength={2} maxLength={100} autoComplete="off" /></label></div><label>E-mail<input name="email" type="email" required /></label><label>Numer telefonu<input name="phone_number" type="tel" required minLength={3} maxLength={30} /></label><label>Hasło początkowe<input name="password" type="password" required minLength={6} maxLength={100} autoComplete="new-password" /></label></> : tab === 'resource' ? <><label>Nazwa miejsca<input name="name" required minLength={2} maxLength={50} placeholder="np. Biurko A3" /></label><div className="form-row"><label>Rodzaj<select name="type"><option value="desk">Biurko</option><option value="room">Sala konferencyjna</option></select></label><label>Liczba osób<input name="capacity" type="number" min={1} defaultValue={1} required /></label></div><label>Lokalizacja<input name="location" required maxLength={100} placeholder="np. Strefa ciszy · Piętro 1" /></label></> : tab === 'access' ? <><p className="muted">Wpisz identyfikator pracownika otrzymany podczas tworzenia konta.</p><label>Identyfikator pracownika<input name="id" type="number" required min={1} /></label><label>Operacja<select name="action"><option value="activate">Aktywuj konto</option><option value="deactivate">Dezaktywuj konto</option></select></label></> : <><p className="muted">Wpisz ID, email, imię albo nazwisko użytkownika.</p><label>Szukaj użytkownika<input name="search" required minLength={1} maxLength={100} autoComplete="off" /></label></>}
        <FormError message={error} /><SubmitButton busy={busy}>{tab === 'user' ? 'Utwórz konto pracownika' : tab === 'resource' ? 'Dodaj miejsce' : tab === 'access' ? 'Zapisz dostęp' : 'Szukaj użytkowników'}</SubmitButton>
        {tab === 'users' && users.length > 0 && <div className="user-list">{users.map(item => <div className="user-row" key={item.id}><strong>#{item.id} · {item.name} {item.surname}</strong><span>{item.email} · {item.role === 'admin' ? 'Administrator' : 'Pracownik'} · {item.is_active ? 'Aktywne' : 'Nieaktywne'}</span></div>)}</div>}
      </form></div></section>;
}
