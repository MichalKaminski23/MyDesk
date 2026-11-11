# MyDesk

System rezerwacji biurek i sal konferencyjnych.

## Technologie

- Backend: Python, FastAPI, SQLAlchemy
- Frontend: React, TypeScript, Vite
- Baza danych: SQLite lokalnie, PostgreSQL produkcyjnie

## Wymagania

- Python 3.10+
- Node.js 22.12+ i npm
- Git Bash, Linux lub macOS (skrypty używają `sh`)
- `curl` (potrzebny przez `start-all.sh` do sprawdzenia gotowości backendu)

## Szybki start

Uruchom cały projekt jedną komendą:

```sh
sh ./start-all.sh
```

Skrypt automatycznie:

1. tworzy środowisko `.venv`,
2. kopiuje `.env.example` do `.env`, jeśli `.env` nie istnieje,
3. instaluje zależności backendu i frontendu,
4. uruchamia backend,
5. czeka na jego gotowość,
6. uruchamia frontend.

## Ręczna instalacja i konfiguracja

W katalogu projektu wykonaj:

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cd frontend
npm ci
cd ..
```

Na Windowsie w Git Bash możesz użyć `python` zamiast `python3`.

Utwórz konfigurację:

```sh
cp .env.example .env
```

Następnie sprawdź wartości w `.env`, szczególnie:

```env
DATABASE_URL=sqlite:///./mydesk.db
SECRET_KEY=your-secret-key-at-least-32-characters
SEED_ADMIN_EMAIL=admin@mydesk.pl
SEED_ADMIN_PASSWORD=Admin123!
SEED_EMPLOYEE_EMAIL=jan.kowalski@mydesk.pl
SEED_EMPLOYEE_PASSWORD=Pracownik123!
```

Nie nadpisuj istniejącego `.env` bez potrzeby — zawiera lokalną konfigurację.

## Uruchamianie osobnych części

```sh
sh ./start-app.sh       # tylko backend
sh ./start-frontend.sh  # tylko frontend
```

Możesz też użyć tych skryptów po ręcznej instalacji.

## Adresy

- Frontend: <http://127.0.0.1:5173>
- API: <http://127.0.0.1:8000>
- Swagger: <http://127.0.0.1:8000/docs>
- Health check: <http://127.0.0.1:8000/health>

## Endpointy API

| Metoda | Endpoint | Dostęp | Opis |
|---|---|---|---|
| POST | `/api/auth/login` | publiczny | Logowanie i token JWT |
| GET | `/api/users/me` | użytkownik | Własne dane |
| PATCH | `/api/users/me/password` | użytkownik | Zmiana własnego hasła |
| GET | `/api/users?search=...` | administrator | Wyszukiwanie po ID, emailu, imieniu lub nazwisku |
| POST | `/api/auth/register` | administrator | Dodanie pracownika |
| PATCH | `/api/users/{id}/activate` | administrator | Aktywacja użytkownika |
| PATCH | `/api/users/{id}/deactivate` | administrator | Dezaktywacja użytkownika |
| GET | `/api/resources` | publiczny | Lista zasobów |
| GET | `/api/resources/availability` | publiczny | Dostępne zasoby w czasie |
| POST | `/api/resources` | administrator | Dodanie zasobu |
| GET | `/api/reservations` | użytkownik | Własne rezerwacje |
| POST | `/api/reservations` | użytkownik | Rezerwacja jednorazowa |
| POST | `/api/reservations/recurring` | użytkownik | Rezerwacja cykliczna |
| PUT | `/api/reservations/{id}` | właściciel/admin | Edycja rezerwacji |
| DELETE | `/api/reservations/{id}` | właściciel/admin | Anulowanie rezerwacji |

## Przykładowe żądania

### Logowanie

```sh
curl -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=jan.kowalski@mydesk.pl&password=Pracownik123!"
```

Skopiuj `access_token` z odpowiedzi i używaj go jako:

```text
Authorization: Bearer <token>
```

### Własne dane

```sh
curl http://127.0.0.1:8000/api/users/me \
  -H "Authorization: Bearer <token>"
```

### Lista zasobów

```sh
curl http://127.0.0.1:8000/api/resources
```

### Rezerwacja

```sh
curl -X POST http://127.0.0.1:8000/api/reservations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"resource_id":1,"start_time":"2026-11-12T09:00:00","end_time":"2026-11-12T17:00:00"}'
```

### Rezerwacja cykliczna

`weekdays`: `0` oznacza poniedziałek, `6` niedzielę.

```sh
curl -X POST http://127.0.0.1:8000/api/reservations/recurring \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"resource_id":1,"start_time":"2026-11-12T09:00:00","end_time":"2026-11-12T17:00:00","weekdays":[0,2],"repeat_until":"2026-12-01"}'
```

## Testy

Najprościej uruchomić wszystkie testy:

```sh
sh ./test-all.sh
```

Tylko backend:

```sh
sh ./test-app.sh
```

Tylko frontend:

```sh
sh ./test-frontend.sh
```

Testy integracyjne frontend + działający backend:

```sh
cd frontend
npm run test:integration
```

### Ręczne uruchamianie

Backend:

```sh
python -m pip install -r requirements-test.txt
python -m unittest discover -s tests -t . -v
```

Frontend:

```sh
cd frontend
npm ci
npm test
```

## Baza danych

Lokalnie używany jest SQLite (`mydesk.db`). Aby użyć PostgreSQL, ustaw w `.env`:

```env
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/mydesk
```

Sterownik PostgreSQL znajduje się w `requirements.txt`. Przed uruchomieniem
trzeba utworzyć bazę `mydesk`. Dane SQLite nie są automatycznie przenoszone do
PostgreSQL.
