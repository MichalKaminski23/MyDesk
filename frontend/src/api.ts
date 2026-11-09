const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const messages: Record<number, string> = {
  401: 'Nieprawidłowy e-mail lub hasło. Jeśli sesja wygasła, zaloguj się ponownie.',
  403: 'Nie masz uprawnień do tej operacji.',
  404: 'Nie znaleziono wybranego zasobu.',
  409: 'Ten termin jest już zajęty lub podane dane już istnieją. Wybierz inne dane.',
  422: 'Sprawdź poprawność danych w formularzu.',
  429: 'Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.',
};

export async function api<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof URLSearchParams)) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${base}/api${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Nie można połączyć się z serwerem. Sprawdź połączenie i uruchomienie API.', 0);
  }
  if (!response.ok) {
    throw new ApiError(messages[response.status] ?? 'Serwer nie mógł wykonać operacji. Spróbuj ponownie.', response.status);
  }
  return response.json() as Promise<T>;
}
