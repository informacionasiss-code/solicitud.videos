# Video Request Management App

Application for managing video extraction requests from `.eml` files or manual entry. Built with React, Vite, TypeScript, TailwindCSS, and Supabase.

## Features
- **Ingresos**: Parse `.eml` files automatically or enter data manually.
- **Registros**: View, filter, and edit requests. Add video URLs.
- **Envíos**: Generate formatted emails for video delivery.
- **Dashboard**: KPI statistics and recent activity.

## Prerequisites
- Node.js (v18+)
- Supabase Project

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Environment Variables:
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Setup Database:
   Run the SQL script found in `schema.sql` in your Supabase SQL Editor.

## Development

Run the development server:
```bash
npm run dev
```

## Build

Build for production:
```bash
npm run build
```

## Tech Stack
- Frontend: Vite, React, TypeScript
- Styling: TailwindCSS, Shadcn/UI (manual implementation)
- State/Data: TanStack Query, Supabase Client
- Forms: React Hook Form, Zod
