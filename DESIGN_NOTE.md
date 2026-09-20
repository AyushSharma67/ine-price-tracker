# Design and Reliability Note

## 1. Project Overview

INE Price Tracker is a full-stack application that allows users to search for products from the INE mock store, track selected products, and view their current price, stock, historical data, and scraper execution logs.

The application consists of a React frontend, Node.js/Express backend, Supabase PostgreSQL database, Playwright-based scraper, and an externally scheduled Render Cron Job.

---

## 2. Architecture

The system is divided into the following components:

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** Supabase PostgreSQL
- **Scraper:** Playwright
- **Backend hosting:** Render
- **Frontend hosting:** Vercel
- **Scheduler:** Render Cron Job

The frontend communicates with the Express backend through REST APIs. The backend reads and writes application data in Supabase.

The scraper reads the products selected by users from the `tracked_products` table and updates the latest product information and historical records after successful scraping.

---

## 3. Scraper Reliability

Scraper reliability was treated as a core requirement because the target store can respond slowly, return server errors, or require browser-side interaction.

### Retry mechanism

Each product is attempted up to three times.

A failed attempt does not immediately terminate the complete scraping process. Instead, the scraper records the failure and retries the product.

Example:

```text
Attempt 1 → HTTP 503 → retry
Attempt 2 → timeout → retry
Attempt 3 → successful response → save data
This allows temporary failures to recover without losing the complete scraping run.

Timeout handling

The scraper detects situations where the expected price API response does not arrive within the allowed time.

Instead of treating the missing response as a valid result, the attempt is recorded as a failure/retry and the scraper continues according to the retry policy.

Failure-safe data storage

Price and stock values are only stored after successful extraction and validation.

If scraping fails, the scraper does not replace an existing valid price or stock value with empty or invalid data.

This prevents temporary website failures from becoming incorrect historical observations.

4. Scrape Logging

Every scraper attempt is recorded in the scrape_logs table.

The log contains information such as:

Product ID
Attempt number
Status
Price
Stock
Error message
Start time
Finish time

The main statuses are:

retrying
success
failed

This provides an auditable record of what happened during each scraping attempt.

For example, a product that fails twice and succeeds on the third attempt will have three corresponding log entries.

5. Dynamic Product Tracking

The scraper does not rely on a permanently hard-coded product list.

Before each run, it queries the tracked_products table and obtains the product IDs currently selected by users.

Therefore:

User tracks product
        ↓
Product ID stored in tracked_products
        ↓
Scheduled scraper reads tracked products
        ↓
Product is scraped
        ↓
Successful result stored in database

This makes the scheduled scraper automatically adapt when users track or untrack products.

6. Why Playwright Was Used

The target store contains browser-side behavior for revealing product prices and handling dynamic interactions.

A simple HTTP request is therefore not sufficient for reliably obtaining the final price.

Playwright was used to:

Open product pages
Handle browser interactions
Interact with the price reveal mechanism
Wait for dynamic content
Extract the resulting price and stock information

The scraper also performs the required browser interaction sequence before attempting to obtain the final price.

7. Handling Dynamic Price Data

The price displayed by the store can contain formatting and Unicode characters.

The extracted price is normalized before converting it to a numeric value.

This prevents formatting differences from causing incorrect price parsing.

The scraper also uses the specific visible sale-price element rather than a broader price selector, preventing the MRP from being accidentally stored as the current sale price.

8. Database Design

The application uses separate tables for different types of information.

products

Stores the latest known product information.

price_history

Stores successful historical price and stock observations.

scrape_logs

Stores every scraper attempt and its outcome.

tracked_products

Stores the products currently selected for automatic tracking.

This separation allows current state, historical observations, tracking state, and execution logs to be handled independently.

9. Scheduling

The scraper is executed externally using a Render Cron Job.

The configured schedule is:

0 */2 * * *

This executes the scraper every two hours.

The scheduled command is:

node scraper/runScheduled.js

The scheduled runner launches the existing scraper without changing the scraper's core logic.

10. Important Engineering Tradeoffs
Playwright vs. simple HTTP requests

A direct HTTP scraper would generally be lighter and faster, but the target website requires browser-side behavior for reliably revealing the price.

Playwright therefore adds resource and execution overhead but provides the browser environment required by the target site.

Retry count

Three attempts were selected to balance reliability and execution time.

More retries could improve recovery from temporary failures but could also make a scheduled run unnecessarily long.

Current product scope

Only products explicitly tracked by users are scraped.

This avoids unnecessarily scraping all available products and reduces the amount of work performed during each scheduled run.

11. AI-Assisted Development and Corrections

AI assistance was used during development for debugging, code suggestions, and understanding the target site's behavior.

Several implementation issues were identified and corrected through testing rather than accepting generated code blindly.

Examples include:

Correcting the sale-price selector after discovering that a broad selector could select the MRP instead of the sale price.
Correcting Unicode price parsing so formatted currency values are converted correctly.
Adding retry and timeout handling after observing real API failures.
Adding persistent scrape logs so failed and retried attempts are visible instead of silently ignored.
Changing the scraper from a fixed product list to dynamically reading tracked products from the database.
Adjusting the Render Playwright installation command after the initial deployment produced a playwright: Permission denied build error.

These corrections were based on observed application behavior and deployment logs.

12. Testing Evidence

The scraper was tested against unreliable responses from the mock store.

A representative recovery sequence was observed:

Attempt 1 → API 503 → retry
Attempt 2 → no price API response within timeout → retry
Attempt 3 → API success → price and stock saved

The individual attempts were stored in scrape_logs.

This demonstrates that temporary failures do not automatically result in incorrect stored product data and that the scraper can recover during the same execution.

13. Known Limitations
The free Render web service can spin down after inactivity, which may introduce startup delay.
Playwright requires more resources than a simple HTTP scraper.
The scraper currently processes tracked products sequentially.
The application does not currently provide price-drop notifications.