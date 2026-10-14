# Wymagania Projektu – MyDesk

## 1. Cel i charakterystyka systemu

- **Jaki problem rozwiązuje aplikacja?**  
  Aplikacja rozwiązuje problem braku przypisania biurek i sal konferencyjnych w biurze. Umożliwia efektywniejszą organizację pracy oraz lepsze zarządzanie dostępną przestrzenią.
- **Kto będzie z niej korzystał?**  
  System jest przeznaczony dla pracowników biurowych oraz administratorów zarządzających infrastrukturą firmy.
- **Dlaczego aplikacja jest potrzebna?**  
  Zapewnia przejrzysty, bezkolizyjny proces rezerwowania miejsc pracy, eliminując nieporozumienia i konflikty o biurka oraz sale konferencyjne.
- **Podstawowa funkcjonalność:**  
  Aplikacja pozwala na przeglądanie dostępności zasobów, logowanie oraz dokonywanie, modyfikację i anulowanie rezerwacji biurek i sal.

---

## 2. Role i typy użytkowników

- **Niezalogowany użytkownik (Gość):**  
  Posiada wyłącznie dostęp do publicznego widoku dostępności biurek i sal konferencyjnych w wybranym przedziale czasowym (bez możliwości rezerwacji).
- **Pracownik:**  
  Użytkownik uwierzytelniony, który może przeglądać stan zasobów, dokonywać rezerwacji biurek oraz sal, tworzyć rezerwacje cykliczne, a także modyfikować i usuwać wyłącznie własne rezerwacje.
- **Administrator:**  
  Odpowiada za konfigurację systemu oraz zarządzanie kontami pracowników (tworzenie i przydzielanie dostępów).

---

## 3. Wymagania funkcjonalne

1. **Rezerwacja biurek:** Możliwość wyboru konkretnego biurka w biurze na wskazany dzień oraz przedział godzinowy.
2. **Rezerwacja sal konferencyjnych:** Rezerwowanie dostępnych sal spotkań na określony termin i czas trwania.
3. **Logowanie i uwierzytelnianie:** Bezpieczny dostęp do konta dla zarejestrowanych pracowników i administratorów.
4. **Zarządzanie kontami użytkowników:** Tworzenie i aktywowanie kont pracowniczych przez administratora systemu.
5. **Przeglądanie dostępności zasobów:** Prezentacja aktualnego obłożenia biurek i sal na dany dzień w formie czytelnego kalendarza lub listy.
6. **Modyfikacja rezerwacji:** Edycja terminu lub przypisanego zasobu przez autora rezerwacji przed jej rozpoczęciem.
7. **Anulowanie rezerwacji:** Zwalnianie zarezerwowanego zasobu przez pracownika, jeśli termin nie będzie wykorzystany.
8. **Rezerwacje cykliczne:** Opcja powtarzania wybranej rezerwacji w określone dni tygodnia.

---

## 4. Wymagania bezpieczeństwa

1. **Bezpieczne uwierzytelnianie i autoryzacja:** Zastosowanie protokołu OAuth2 o ograniczonym czasie ważności, wymaganymi przy dostępie do chronionych zasobów.
2. **Bezpieczne przechowywanie haseł:** Wykorzystanie algorytmów haszujących z dynamiczną solą – zakaz przechowywania haseł w postaci jawnej.
3. **Kontrola dostępu na poziomie obiektów:** Weryfikacja tożsamości na poziomie backendu uniemożliwiająca podgląd, modyfikację lub usunięcie rezerwacji przypisanej do innego pracownika.
4. **Ochrona przed wstrzykiwaniem kodu SQL:** Komunikacja z bazą PostgreSQL wyłącznie poprzez ORM z użyciem zapytań parametryzowanych.
5. **Walidacja i sanityzacja danych wejściowych:** Ścisła walidacja struktur i typów przesyłanych danych, co chroni aplikację przed błędami logiki biznesowej oraz atakami XSS.
6. **Zabezpieczenie przed podwójnymi rezerwacjami:** Atomowość operacji rezerwacji gwarantowana przez transakcje bazodanowe oraz ograniczenia wykluczające w PostgreSQL, zapobiegające konfliktom przy równoległych żądaniach.
7. **Limitowanie zapytań:** Ochrona endpointów uwierzytelniania przed atakami brute-force i przeciążeniem poprzez limit dopuszczalnych żądań w jednostce czasu.
8. **Bezpieczne zarządzanie konfiguracją:** Wykluczenie danych wrażliwych i kluczy szyfrujących z repozytorium kodu – przekazywanie parametrów przez zmienne środowiskowe (.env).

---

## 5. Model zagrożeń

### 1. Nieautoryzowany dostęp i manipulacja cudzymi rezerwacjami

- **Czego dotyczy:** Endpointów API odpowiedzialnych za odczyt, edycję oraz usuwanie rezerwacji.
- **Możliwe konsekwencje:** Nieuprawniony użytkownik może zmodyfikować parametr identyfikatora w żądaniu HTTP, uzyskując możliwość usunięcia lub zmiany rezerwacji innego pracownika, co narusza spójność danych i harmonogram pracy.
- **Planowana kontrola / działanie:** Implementacja weryfikacji uprawnień na poziomie logiki aplikacji FastAPI. Serwer przed wykonaniem akcji porównuje identyfikator właściciela zasobu z identyfikatorem użytkownika.

### 2. Podwójna rezerwacja zasobu wskutek wyścigu zapytań

- **Czego dotyczy:** Endpointu tworzenia rezerwacji oraz mechanizmu weryfikacji dostępności biurek i sal.
- **Możliwe konsekwencje:** Przy niemal równoczesnym wysłaniu żądania przez dwóch pracowników ten sam zasób może zostać przypisany obu osobom, co powoduje bezpośredni konflikt organizacyjny.
- **Planowana kontrola / działanie:** Zastosowanie transakcji bazodanowych z odpowiednim poziomem izolacji, blokowania wierszy na czas sprawdzania lub unikalnych ograniczeń zakresowych na poziomie tabel PostgreSQL.

### 3. Wstrzyknięcie złośliwego kodu SQL

- **Czego dotyczy:** Warstwy zapytań do bazy danych PostgreSQL podczas filtrowania wolnych zasobów, wyszukiwania rezerwacji oraz uwierzytelniania.
- **Możliwe konsekwencje:** Wyciek poufnych danych pracowników, obejście mechanizmu logowania lub uszkodzenie struktury i zawartości bazy danych.
- **Planowana kontrola / działanie:** Użycie biblioteki ORM wymuszającej stosowanie zapytań parametryzowanych oraz bezwzględny zakaz ręcznego formatowania ciągów SQL danymi od użytkownika.

### 4. Atak siłowy na formularz logowania

- **Czego dotyczy:** Endpointu logowania użytkowników.
- **Możliwe konsekwencje:** Przejęcie kont pracowników w wyniku odgadnięcia prostych haseł oraz potencjalna degradacja wydajności aplikacji wskutek dużej liczby zapytań.
- **Planowana kontrola / działanie:** Wdrożenie limitera żądań per adres IP oraz konto bezpieczne użytkownika, wymuszenie polityki silnych haseł oraz bezpieczne haszowanie haseł.

### 5. Wyciek kluczy kryptograficznych i danych dostępowych

- **Czego dotyczy:** Kodu źródłowego backendu oraz historii zmian w repozytorium GitHub.
- **Możliwe konsekwencje:** Przejęcie klucza prywatnego podpisującego tokeny JWT (możliwość podszywania się pod dowolnego użytkownika) lub uzyskanie bezpośredniego dostępu do bazy danych PostgreSQL przez osoby trzecie.
- **Planowana kontrola / działanie:** Przeniesienie wszystkich poufnych konfiguracji do zmiennych środowiskowych, dodanie plików `.env` do `.gitignore` oraz zintegrowanie skanera sekretów w procesie CI/CD.
