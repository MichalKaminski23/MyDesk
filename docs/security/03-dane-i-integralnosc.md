# Ochrona danych i rezerwacji

Testuj na osobnej bazie. Przygotuj administratora, dwóch pracowników i wolny zasób. Opisano oczekiwane wyniki, nie wyniki wykonanych testów.

## SEC-07 — Ochrona haseł

**Kroki:** Sprawdź odpowiedzi `GET /api/users/me` i administracyjnego `GET /api/users` oraz zapis hasła testowego konta w bazie.

**Oczekiwany wynik:** API nie ujawnia haseł ani ich skrótów. W bazie zapisany jest skrót bcrypt zamiast jawnego hasła.

## SEC-08 — Wstrzyknięcie SQL

**Kroki:** Jako administrator wywołaj `GET /api/users`, podając w parametrze `search` tekst `' OR 1=1 --`.

**Oczekiwany wynik:** Tekst nie jest wykonywany jako SQL. Nie dochodzi do ujawnienia wszystkich rekordów wskutek wstrzyknięcia ani błędu `500`.

## SEC-09 — Równoczesne rezerwacje

**Kroki:** Z dwóch kont wyślij równocześnie `POST /api/reservations` dla tego samego wolnego zasobu i terminu. Sprawdź osobno SQLite i PostgreSQL.

**Oczekiwany wynik:** Powstaje tylko jedna aktywna rezerwacja. Odpowiedzi to `201` i `409`.
