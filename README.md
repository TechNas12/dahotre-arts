# Dahotre Arts

A modern web application built with [Next.js](https://nextjs.org/) for managing Dahotre Arts.

## Features

- **Dashboard**: Point of Sale (POS) interface and analytics.
- **Products**: CRUD interface for managing inventory.
- **Database**: Integrated with Supabase for data management.

## Getting Started

First, install dependencies:

```bash
npm install
```

Set up your environment variables by copying `.env.example` to `.env.local` and filling in the values:
```bash
cp .env.example .env.local
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploy on Vercel

This project is optimized for deployment on the [Vercel Platform](https://vercel.com/). 

1. Push your code to a Git repository (GitHub, GitLab, Bitbucket).
2. Import the project into Vercel.
3. Vercel will automatically detect that it's a Next.js project and configure the build settings (`npm run build`).
4. Add your environment variables (like Supabase credentials) in the Vercel project settings under **Environment Variables**.
5. Click **Deploy**.

For more details, check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).
