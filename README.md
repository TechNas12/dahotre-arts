# Dahotre Arts 🎨

Dahotre Arts is a modern, full-featured web application designed for managing the day-to-day operations of an arts business. This system includes a comprehensive Point of Sale (POS), inventory management, order tracking, and analytics dashboard.

> **Note**: This project is open-sourced and proudly owned by the [TechNas12](https://github.com/TechNas12) account.

## ✨ Features

- **📊 Dashboard & Analytics**: Get a bird's eye view of your business with interactive charts and metrics.
- **🏪 Point of Sale (POS)**: A streamlined interface for processing customer orders quickly and efficiently.
- **📦 Product Management**: Complete CRUD operations to manage your art inventory.
- **👥 Customer & User Management**: Keep track of your clientele and manage staff access.
- **🛒 Order Tracking**: End-to-end management of sales and orders.
- **💰 Expenses Tracking**: Log and categorize business expenses.
- **📄 Reports**: Generate detailed reports and insights.
- **⚙️ Settings**: Customizable business preferences.
- **🔒 Secure**: Authentication and secure data management using Supabase.

## 🚀 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **UI/Styling**: [React](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Deployment**: Optimized for [Vercel](https://vercel.com/)

## 🛠️ Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- A Supabase project for database and authentication

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/TechNas12/dahotre-arts.git
   cd dahotre-arts
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Copy the example environment file and fill in your Supabase credentials:
   ```bash
   cp .env.example .env.local
   ```
   Add your Supabase URL and Anon Key to `.env.local`.

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open the app**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Deployment

This project is optimized for deployment on the [Vercel Platform](https://vercel.com/).

1. Push your code to your Git repository.
2. Import the project into Vercel.
3. Add your environment variables (e.g., Supabase credentials) in the Vercel project settings.
4. Click **Deploy**.

## 📄 License

This project is open-source. All rights reserved by **TechNas12**.
