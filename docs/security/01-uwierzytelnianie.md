# Uwierzytelnianie

Testuj na osobnej bazie z kontem pracownika. Opisano oczekiwane wyniki, nie wyniki wykonanych testów.

## SEC-01 — Dostęp bez logowania

**Kroki:** Bez tokenu wywołaj `GET /api/users/me` i `POST /api/reservations` z poprawnymi danymi.

**Oczekiwany wynik:** `401`, brak dostępu do danych i brak nowej rezerwacji.

## SEC-02 — Błędne hasło

**Kroki:** Wywołaj `POST /api/auth/login` z błędnym hasłem, następnie z nieistniejącym e-mailem.

**Oczekiwany wynik:** W obu przypadkach `401` i jednakowy komunikat błędu.

## SEC-03 — Ochrona przed odgadywaniem hasła

**Kroki:** Wykonaj pięć błędnych prób logowania w ciągu 60 sekund, następnie szóstą.

**Oczekiwany wynik:** Szósta próba zwraca `429` i nagłówek `Retry-After`.
