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
- PowerShell
- pip
- SQLite lokalnie lub PostgreSQL na produkcji

## Uruchomienie backendu

```powershell
.\start.ps1
```

Skrypt automatycznie:

1. tworzy środowisko `.venv`,
2. kopiuje `.env.example` do `.env`, jeśli `.env` nie istnieje,
3. instaluje zależności z `requirements.txt`,
4. uruchamia API.

Jeśli PowerShell blokuje skrypt, wykonaj jednorazowo:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Adres aplikacji

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
