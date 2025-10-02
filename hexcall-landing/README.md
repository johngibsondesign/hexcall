# Hexcall Landing Page

A coming soon landing page for Hexcall - Voice Chat for League of Legends.

## Features

- 🎨 Modern dark theme with violet/cyan gradients matching the main app
- 📱 Fully responsive design
- ✉️ Email signup with Supabase integration
- 🎮 Gaming-focused feature showcase
- 🚀 Optimized performance with Next.js

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Supabase account (for email collection)

### Installation

1. Clone or copy this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp env.example .env.local
   ```
   
4. Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

### Database Setup

Create a table in your Supabase database:

```sql
CREATE TABLE mailing_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'landing-page',
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE mailing_list ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts (for new subscribers)
CREATE POLICY "Allow public inserts" ON mailing_list
  FOR INSERT WITH CHECK (true);

-- Create policy to allow reads (for duplicate checking)
CREATE POLICY "Allow public reads" ON mailing_list
  FOR SELECT USING (true);
```

### Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) to view the landing page.

### Building for Production

```bash
npm run build
```

The app is configured for static export and can be deployed to any static hosting service.

## Customization

### Colors and Branding

The design system is defined in `styles/globals.css` using CSS custom properties:

- `--color-brand-start`: Primary brand color (violet)
- `--color-brand-end`: Secondary brand color (cyan)
- `--color-background`: Dark background
- `--color-foreground`: Text color

### Features

Update the features array in `pages/index.tsx` to highlight different aspects of your app.

### Social Links

Update the footer social links in `pages/index.tsx` to point to your actual social media accounts.

## Deployment

This app is configured for static export and can be deployed to:

- Vercel
- Netlify  
- GitHub Pages
- Any static hosting service

The build output will be in the `out/` directory after running `npm run build`.

## Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Database**: Supabase (PostgreSQL)
- **Icons**: React Icons
- **Deployment**: Static export ready

## License

This project is part of the Hexcall application suite.
