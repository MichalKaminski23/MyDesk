# Uprawnienia

Testuj na osobnej bazie. Przygotuj administratora, pracowników A i B oraz aktywną, przyszłą rezerwację B. Opisano oczekiwane wyniki, nie wyniki wykonanych testów.

## SEC-04 — Dostęp pracownika do administracji

**Kroki:** Z tokenem pracownika wywołaj `GET /api/users` i `POST /api/resources` z poprawnymi danymi.

**Oczekiwany wynik:** `403`, brak ujawnienia listy użytkowników i brak nowego zasobu.

## SEC-05 — Zmiana cudzej rezerwacji

**Kroki:** Jako A spróbuj zmienić i anulować rezerwację B przez `PUT` i `DELETE /api/reservations/{id}`.

**Oczekiwany wynik:** `403`, rezerwacja B pozostaje niezmieniona.

## SEC-06 — Dostęp po dezaktywacji konta

**Kroki:** Zachowaj token pracownika. Administrator dezaktywuje jego konto. Następnie użyj zachowanego tokenu do wywołania `GET /api/users/me`.

**Oczekiwany wynik:** `401`, brak dostępu mimo wcześniej wydanego tokenu.
