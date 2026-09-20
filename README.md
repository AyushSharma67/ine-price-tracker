# INE Price Tracker

A full-stack price tracking application for the INE mock store. Users can search for products, track products, view price/stock history, and inspect scraper execution logs.

## Live Demo

- Frontend: https://ine-price-tracker-one.vercel.app/
- Backend API: https://ine-price-tracker-c7em.onrender.com

## GitHub

https://github.com/AyushSharma67/ine-price-tracker

## Features

- Search products by name
- Select and view product details
- Track and untrack products
- Automatically scrape tracked products
- Store current price and stock
- Maintain price and stock history
- Maintain per-product scraper logs
- Retry failed scraper attempts
- Handle slow responses and API failures
- Avoid storing invalid data when a scrape fails
- Scheduled scraping every 2 hours

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Node.js
- Express.js
- Playwright
- Supabase PostgreSQL

### Deployment
- Frontend: Vercel
- Backend: Render
- Database: Supabase
- Scheduled scraper: Render Cron Job

## Project Structure

```text
ine-price-tracker/
│
├── backend/
│   ├── scraper/
│   │   ├── testScraper.js
│   │   └── runScheduled.js
│   ├── server.js
│   ├── supabase.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   ├── package.json
│   └── ...
│
└── README.md

How It Works

1. A user searches for a product.
2. The user selects a product and tracks it.
3. Tracked products are stored in the tracked_products table.
4. The scheduled scraper retrieves all tracked product IDs.
5. Playwright opens the product pages and handles the dynamic price reveal flow.
6. The scraper extracts the current price and stock.
7. Successful results are stored in:
    products
    price_history
8. Every scraper attempt is recorded in scrape_logs.
9. If an attempt fails, the scraper retries.
10.Data is only updated after a successful scrape.

Scraper Reliability

The scraper is designed to handle unreliable responses from the mock store.

Retry mechanism

Each product can be attempted up to 3 times.

The scraper records statuses such as:
    retrying
    success
    failed

For example:
    Attempt 1 → API failure → retry
    Attempt 2 → timeout → retry
    Attempt 3 → success → save price/stock
Failed attempts do not overwrite previously stored valid product data.

Dynamic product tracking

The scraper does not use a hard-coded product list.
It reads product IDs from the tracked_products table before each scheduled run.
Therefore, only products selected by users are scraped.

Scheduling

The scraper is executed using an external Render Cron Job.
Schedule:
    0 */2 * * *
This runs the scraper every 2 hours.

Cron command:
    node scraper/runScheduled.js

Environment Variables

Create a .env file inside the backend directory:
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key


Local Setup

Backend
cd backend
npm install

Install Playwright Chromium:
npx playwright install chromium

Start the backend:
node server.js

The local backend runs on:
http://localhost:5000

Frontend
Open another terminal:
cd frontend
npm install
npm run dev

The frontend runs on the Vite development server, normally:
http://localhost:5173

API Endpoints
Products
GET /api/products
GET /api/products/:id

History
GET /api/products/:id/history

Scrape Logs
GET /api/products/:id/logs

Tracking
GET /api/tracked-products
POST /api/products/:id/track
DELETE /api/products/:id/track

Database Tables

products
Stores the latest known product information.

price_history
Stores successful historical price and stock observations.

scrape_logs
Stores every scraper attempt and its outcome.

tracked_products
Stores the products currently selected for automatic tracking.

Deployment

Backend
The backend is deployed on Render.
Production API:
https://ine-price-tracker-c7em.onrender.com

Frontend
The React frontend is deployed on Vercel.
The frontend communicates with the deployed Render API.

Reliability Design

The scraper uses Playwright because the mock store contains dynamic browser-side behavior that cannot reliably be handled with a simple HTTP request.

The scraper also includes:
Retry handling
Timeout handling
Response status validation
Price validation
Stock extraction
Per-attempt logging
Successful-data-only persistence

This prevents temporary failures from being recorded as valid price or stock observations.

Testing

The scraper was tested against failure scenarios including:

HTTP 503 responses
Slow/no response from the price API
Successful recovery after retries

A successful recovery sequence was observed as:
Attempt 1 → 503 → retry
Attempt 2 → timeout → retry
Attempt 3 → success

The corresponding attempts are stored in scrape_logs.

Future Improvements

Possible future improvements include:

Price-drop notifications
Email alerts
Multi-product dashboard
Configurable scraping frequency
Price-change detection
Additional monitoring and metrics