# MyDesk - System rezerwacji biurek i sal konferencyjnych

## Technologie

- **Backend:** Python (FastAPI)
- **Frontend:** React
- **Baza danych:** PostgreSQL (lokalnie domyslnie SQLite)

---

## Opis Projektu

**MyDesk** to nowoczesna aplikacja webowa zaprojektowana z myślą o optymalizacji przestrzeni biurowej. System umożliwia pracownikom szybkie oraz bezkolizyjne rezerwowanie biurek i sal konferencyjnych, zapobiegając konfliktom o zasoby i ułatwiając codzienną organizację pracy zespołowej. Rozwiązanie integruje intuicyjny interfejs użytkownika z wydajnym API oraz relacyjną bazą danych gwarantującą spójność i bezpieczeństwo danych.

## Wymagania środowiskowe

- Python 3.10 lub nowszy
- Powłoka `sh` (Linux/macOS lub Git Bash na Windows)
- pip
- SQLite lokalnie lub PostgreSQL na produkcji

## Uruchomienie backendu

```sh
sh ./start.sh
```

Skrypt automatycznie:

1. tworzy środowisko `.venv`,
2. kopiuje `.env.example` do `.env`, jeśli `.env` nie istnieje,
3. instaluje zależności z `requirements.txt`,
4. uruchamia API.

Skrypty działają również przy uruchamianiu spoza katalogu projektu. Na Linuxie musi być dostępny moduł `venv` (np. pakiet `python3-venv` na Ubuntu).

## Adres aplikacji

- Frontend React: `http://127.0.0.1:5173` (uruchomienie opisane poniżej)
- API: `http://127.0.0.1:8000`
- Dokumentacja Swagger: `http://127.0.0.1:8000/docs`
- Sprawdzenie działania: `http://127.0.0.1:8000/health`

## Endpointy

| Metoda | Endpoint                      | Opis                                    |
| ------ | ----------------------------- | --------------------------------------- |
| POST   | `/api/auth/login`             | Logowanie i pobranie tokenu             |
| GET    | `/api/auth/me`                | Dane zalogowanego użytkownika           |
| POST   | `/api/auth/register`          | Dodanie pracownika przez administratora |
| GET    | `/api/resources`              | Lista biurek i sal                      |
| GET    | `/api/resources/availability` | Dostępne zasoby w podanym czasie        |
| GET    | `/api/reservations`           | Własne rezerwacje                       |
| POST   | `/api/reservations`           | Utworzenie rezerwacji                   |
| POST   | `/api/reservations/recurring` | Utworzenie rezerwacji cyklicznych       |
| PUT    | `/api/reservations/{id}`      | Edycja rezerwacji                       |
| DELETE | `/api/reservations/{id}`      | Anulowanie rezerwacji                   |

## Przykładowe żądania

### Logowanie

```powershell
$login = Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/auth/login" `
  -Method Post `
  -ContentType "application/x-www-form-urlencoded" `
  -Body @{ username = "jan.kowalski@mydesk.pl"; password = "Pracownik123!" }

$token = $login.access_token
```

### Własne dane

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/auth/me" `
  -Headers @{ Authorization = "Bearer $token" }
```

### Lista zasobów

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/resources" `
  -Method Get
```

### Utworzenie rezerwacji

```powershell
$reservation = @{
  resource_id = 1
  start_time = "2026-11-02T09:00:00"
  end_time = "2026-11-02T17:00:00"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/reservations" `
  -Method Post `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body $reservation
```

### Anulowanie rezerwacji

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/reservations/1" `
  -Method Delete `
  -Headers @{ Authorization = "Bearer $token" }
```

Zalogowany użytkownik może pobrać własne dane przez `GET /api/auth/me`.

## Frontend React

Interfejs w katalogu `frontend/` korzysta z React, TypeScript i Vite. Wymaga Node.js 22.12+ oraz npm. Uruchom backend przez `sh ./start.sh`, a w drugim terminalu:

```sh
sh ./start-frontend.sh
```

Alternatywnie bez skryptu startowego:

```sh
cd frontend
npm ci
npm run dev
```

Otwórz `http://127.0.0.1:5173`. Vite przekazuje żądania `/api` do backendu na porcie 8000, więc lokalnie nie jest wymagana zmiana CORS.

### Dostępne funkcje

- Publiczne przeglądanie biurek i sal z dostępnością dla wybranego dnia i godzin.
- Filtrowanie według rodzaju i lokalizacji, wyszukiwanie, sortowanie i wyświetlanie tylko dostępnych miejsc.
- Logowanie pracowników i administratorów; sesja przechowywana w `sessionStorage` bieżącej karty.
- Tworzenie rezerwacji jednorazowych i cyklicznych z wyborem dni tygodnia i daty końcowej.
- Lista własnych rezerwacji z podziałem na nadchodzące, zakończone i anulowane; edycja terminu i zasobu oraz anulowanie przed rozpoczęciem.
- Panel administratora: tworzenie kont pracowników, dodawanie zasobów, aktywowanie i dezaktywowanie kont według identyfikatora. Backend nie udostępnia listy pracowników.
- Responsywny układ, obsługa klawiatury w oknach dialogowych, komunikaty błędów i ponawianie odczytu danych.

Przykładowe konta są tworzone przez backend, jeśli odpowiednie zmienne `SEED_*` są ustawione w `.env` (patrz `.env.example`). Frontend nie tworzy kont ani przykładowych danych samodzielnie.

### Budowanie i testy

```sh
cd frontend
npm run build
npm exec playwright install chromium
npm test
```

Build powstaje w `frontend/dist/`. Testy przeglądarkowe korzystają z izolowanych odpowiedzi API; nie zmieniają danych backendu.

Dodatkowo `npm run test:integration` sprawdza rzeczywiste FastAPI (wymaga zainstalowanych zależności backendu w `.venv`). Samodzielnie uruchamia serwery na portach 18000 i 15173, tworzy osobną tymczasową bazę SQLite i usuwa ją po zakończeniu. Sprawdza dostępność, logowanie, tworzenie, edycję, anulowanie i cykl rezerwacji. Zrzuty ekranu komputera i telefonu zapisuje w ignorowanym katalogu `frontend/test-results/`.

W produkcji serwer hostujący frontend powinien przekazywać `/api` do FastAPI. Jeśli API działa pod inną domeną, przed budowaniem ustaw `VITE_API_URL` (np. kopiując `frontend/.env.example` do `frontend/.env.local`) i dodaj domenę frontendu do `ALLOWED_ORIGINS` backendu. `VITE_API_URL` to publiczny adres bazowy bez końcowego `/api`. Zmienne `VITE_*` są częścią publicznego frontendu — nie umieszczaj w nich sekretów.
