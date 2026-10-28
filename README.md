# MyDesk - System rezerwacji biurek i sal konferencyjnych

## Technologie

- **Backend:** Python (FastAPI)
- **Frontend:** React
- **Baza danych:** PostgreSQL (lokalnie domyslnie SQLite)

---

## Opis Projektu

**MyDesk** to nowoczesna aplikacja webowa zaprojektowana z myślą o optymalizacji przestrzeni biurowej. System umożliwia pracownikom szybkie oraz bezkolizyjne rezerwowanie biurek i sal konferencyjnych, zapobiegając konfliktom o zasoby i ułatwiając codzienną organizację pracy zespołowej. Rozwiązanie integruje intuicyjny interfejs użytkownika z wydajnym API oraz relacyjną bazą danych gwarantującą spójność i bezpieczeństwo danych.

## Uruchomienie backendu

1. Utworz srodowisko wirtualne i zainstaluj zaleznosci:

   ```powershell
   python -m venv .venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

2. Skopiuj `.env.example` do `.env` i ustaw `DATABASE_URL`, `SECRET_KEY` oraz
   `ALLOWED_ORIGINS`. Bez pliku `.env` aplikacja uzywa lokalnego SQLite
   (`mydesk.db`), co ulatwia uruchomienie deweloperskie.

3. Uruchom API:

   ```powershell
   uvicorn app.main:app --reload
   ```

4. Otwórz przeglądarkę i przejdź do `http://127.0.0.1:8000/docs`, aby zobaczyć interaktywną dokumentację API.

Logika biznesowa jest oddzielona od obsługi HTTP w katalogu `app/services`:

- `auth_service.py` - rejestracja pracowników i logowanie,
- `resource_service.py` - lista, dostępność i tworzenie zasobów,
- `reservation_service.py` - tworzenie, edycja, anulowanie i pobieranie rezerwacji.

Routery w `app/routers` przyjmują żądania, uruchamiają zależności FastAPI i przekazują dane do odpowiedniego serwisu.
