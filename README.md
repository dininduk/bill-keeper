
# Bill Keeper – LKR

A robust, aesthetic bill splitting application built with React and Cloudflare Pages.

## Features
- **LKR Currency**: Native support for Sri Lankan Rupee formatting.
- **Dynamic Splits**: Assign items to specific people or share across all.
- **Persistence**: Data saved automatically to your browser's localStorage.
- **Reports**: Generate individual breakdown reports.
- **PDF Export**: Export all bill data as a PDF.
- **Email Integration**: Send individual split reports via Resend API using Cloudflare Functions.
- **Dark Mode**: Supports system preference and manual toggle.

## Setup Instructions

### 1. Local Development
1. Clone this repository.
2. Install dependencies: `npm install`.
3. Create a `.env` file based on `.env.example` (not required for local UI testing, but required for API functions).
4. Run locally: `npm run dev`.
5. To test Cloudflare Functions locally, use Wrangler: `npx wrangler pages dev`.

### 2. Deployment to Cloudflare Pages
1. Push your code to a GitHub repository.
2. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
3. Navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
4. Select your repository and configure build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. **Environment Variables**:
   - Go to your Page settings > **Environment variables**.
   - Add `RESEND_API_KEY` (Get this from [Resend](https://resend.com)).
   - Add `EMAIL_FROM` (Your verified sender email).
6. **Deployment**: Save and Deploy.

### 3. API Configuration
Ensure your `functions/` folder is at the root of your project. Cloudflare automatically picks up files in this folder to create API routes.

## Folder Structure
- `src/`: React frontend source code.
- `functions/api/`: Cloudflare Pages backend functions.
- `public/`: Static assets and redirects for SPA.
