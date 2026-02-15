# Yugi-Forge-Arena Project Overview

This project is a community hub for Yu-Gi-Oh! players, providing features such as deck building, player profiles, tournament management, and a news/blog system.

## Project Stack

*   **Frontend:** React with Vite, Tailwind CSS, shadcn/ui
*   **Backend/Database:** Supabase (PostgreSQL)
*   **Authentication:** Supabase Auth
*   **File Storage:** Supabase Storage

## Key Features Implemented

The project includes a comprehensive set of features:

*   **Deck Builder:** Core functionality for creating, editing, saving, importing, and exporting Yu-Gi-Oh! decks. Includes fuzzy card search, card previews, and adherence to deck rules (e.g., 3-copy limit).
*   **Player Profiles:** View and edit user profiles (avatar, banner, bio), and display saved decks.
*   **Deck Viewing:** Dedicated pages to view individual decks.
*   **Tournament System:**
    *   Listing and detail pages for tournaments.
    *   Admin dashboard for creating, editing, and deleting tournaments.
    *   Role-based access control (`admin`, `organizer`, `user`) for tournament management.
    *   Supabase Storage integration for tournament banners with RLS.
    *   Player ranking system based on tournament participation.
    *   Tournament enrollment and decklist submission with locking mechanisms based on tournament status and date.
*   **Home Page:** A structured home page displaying upcoming tournaments, top-ranked players, and featured decks.
*   **Deck Privacy:** Functionality to mark decks as private or public.
*   **News and Blog System:**
    *   Public pages for listing and viewing news articles.
    *   Admin dashboard for managing news posts (create, edit, delete).
    *   Integrated Rich Text Editor (RTE) for news content, supporting inline image uploads to a dedicated `news_content` Supabase bucket.
    *   Comment section for news posts with user authentication and RLS.
    *   Like button for news posts.
    *   **Hotfixes Applied:**
        *   Corrected `news_comments` RLS `INSERT` policy to `WITH CHECK (auth.uid() = user_id)`.
        *   Added missing `created_at` column to `public.news_comments` table.
        *   Added missing `SELECT` RLS policy to `public.profiles` (`USING (auth.uid() = id)`) to ensure `get_user_role()` functions correctly for storage policies.

## Building and Running

The main application resides in the `yugi-forge-arena` subdirectory.

### Development

To start the development server:

```bash
cd yugi-forge-arena
npm install # or yarn install / bun install
npm run dev # or yarn dev / bun dev
```

### Production Build

To build the project for production:

```bash
cd yugi-forge-arena
npm install # or yarn install / bun install
npm run build # or yarn build / bun build
```

To preview the production build locally:

```bash
cd yugi-forge-arena
npm run preview # or yarn preview / bun preview
```

### Linting

To run ESLint checks:

```bash
cd yugi-forge-arena
npm run lint # or yarn lint / bun lint
```

## Development Conventions

*   **Language:** TypeScript
*   **Linting:** ESLint
*   **Data Fetching:** `@tanstack/react-query`
*   **Form Handling:** `react-hook-form` with `zod` for validation.
*   **Backend Interaction:** Heavy reliance on Supabase for database, authentication, and storage, with careful implementation of Row Level Security (RLS).
*   **Database Migrations:** Supabase migration files are used for schema changes.
    *   **Current Schema:** `yugi-forge-arena/supabase/migrations/20251110182821_remote_schema.sql`
*   **UI Components:** shadcn/ui.
*   **Rich Text Editor:** TipTap for rich text editing capabilities.

## Operations Cheat Sheet (Environment-Specific)

### Database Queries (via SSH)
Para rodar queries SQL no banco de dados que está dentro do Docker no servidor, use o **Piping Method**. Isso evita conflitos de aspas entre o PowerShell (Windows) e o Bash (Linux):

```bash
"SELECT * FROM public.profiles LIMIT 1;" | ssh sart@deathstar-server "docker exec -i supabase-db psql -U postgres -d postgres"
```

### Git Workflow (PowerShell)
O terminal PowerShell não aceita o operador `&&`. Execute os comandos sequencialmente ou use `;`:

```powershell
# Método Seguro:
git add .
git commit -m "mensagem"
git push origin main
```

## Supabase Workflow

- The user does not run Supabase locally.
- Any Supabase-related tasks need to be passed to the user for manual execution.
- The user does not have the Supabase CLI installed.
- All SQL migration scripts must be written and placed in the `yugi-forge-arena/supabase/migrations` folder.
- **DO NOT** run `npm run lint`. Linting might fix functional code and introduce new issues.

*   **Maintenance, Manual Card Entry & Admin UI (Feb 10, 2026):**
    *   **Tournament 36 Repair:** 
        *   Investigated bracket logic for 18 participants (32-slot tree) and corrected "phantom wins" where participants had victory points without existing matches.
        *   Clarified BYE behavior: BYEs grant +1 win for ranking/advancement but are excluded from Head-to-Head Rivalry history.
    *   **Manual Card Insertion System:**
        *   Developed `CardManagementPage.tsx` exclusively for the Super Admin (ID: `80193776-6790-457c-906d-ed45ea16df9f`).
        *   Integrated a **"Adicionar Carta Manual"** shortcut button directly into the Deck Builder sidebar for rapid card additions.
        *   Created an automated ID generator for manual entries to prevent collision with official API data.
    *   **New Card Deployment:** Manually added **"W:P Fancy Ball"** (Link-3 / Cyberse) with its complete effect and hosted its image locally at `/public/cards/wp-fancy-ball.webp` to bypass external hotlink blocks.
    *   **Match Reporter Enhancement:** Updated the Admin results panel to display player avatars with their equipped **Profile Frames**, ensuring visual consistency with the rest of the platform.
    *   **System Cleanup:** Removed over 15 temporary debug, verification, and fix scripts from the project root to maintain a production-ready environment.
    *   **Bug Fixes:** Resolved syntax errors in `TournamentDashboard.tsx` and missing imports in `DeckBuilder.tsx` caused by UI refactoring.
*   **Local Database Migration (Feb 14, 2026):**
    *   The project now uses a local PostgreSQL database (Self-hosted Supabase). 
    *   Database connection (local): `postgresql://postgres:staff_arena_prod_2026@localhost:5432/postgres`.
    *   Supabase Local URL: `https://api.staffygo.com.br`.
    *   Direct database queries can be performed via SSH on `deathstar-server` using the user `sart`.