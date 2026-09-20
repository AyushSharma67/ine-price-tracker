const { chromium } = require("playwright");
const supabase = require("../supabase");

// ========================================
// PRODUCTS TO TEST
// ========================================

const PRODUCT_IDS = [150];
const MAX_ATTEMPTS = 3;


// ========================================
// HANDLE COOKIE POPUP
// ========================================

async function handleCookies(page) {
    console.log("Checking for cookie popup...");

    const cookieOverlay = page.locator(".cookie-overlay");

    for (let i = 0; i < 20; i++) {
        const visible =
            await cookieOverlay.isVisible().catch(() => false);

        if (visible) {
            console.log("Cookie popup found");
            console.log("Accepting cookies...");

            const acceptButton =
                cookieOverlay
                    .locator('button:has-text("ACCEPT")')
                    .first();

            await acceptButton.click({
                force: true,
                timeout: 10000
            });

            console.log("Cookies accepted");

            await page.waitForTimeout(1500);

            return true;
        }

        await page.waitForTimeout(500);
    }

    console.log("No cookie popup detected");

    return false;
}


// ========================================
// MAKE SURE COOKIE OVERLAY IS GONE
// ========================================

async function ensureCookiesGone(page) {
    const cookieOverlay =
        page.locator(".cookie-overlay");

    for (let i = 0; i < 20; i++) {
        const visible =
            await cookieOverlay.isVisible().catch(() => false);

        if (!visible) {
            return;
        }

        console.log("Cookie overlay still visible...");

        const acceptButton =
            cookieOverlay
                .locator('button:has-text("ACCEPT")')
                .first();

        if (
            await acceptButton.isVisible().catch(() => false)
        ) {
            console.log(
                "Accepting cookie popup again..."
            );

            await acceptButton.click({
                force: true,
                timeout: 10000
            });

            await page.waitForTimeout(1000);
        }
        else {
            await page.waitForTimeout(500);
        }
    }

    const stillVisible =
        await cookieOverlay.isVisible()
            .catch(() => false);

    if (stillVisible) {
        throw new Error(
            "Cookie overlay is still blocking the page"
        );
    }
}


// ========================================
// SCRAPE PRODUCT
// ========================================

async function scrapeProduct(page, productId) {

    const url =
        `https://demo.inelabteamdev.com/product/${productId}`;

    console.log(`\nOpening: ${url}`);


    // ========================================
    // OPEN PRODUCT
    // ========================================

    await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000
    });

    console.log("Page loaded");


    // ========================================
    // HANDLE COOKIES
    // ========================================

    await handleCookies(page);
    await ensureCookiesGone(page);


    // ========================================
    // PRODUCT NAME
    // ========================================

    const productName =
        await page.locator("h1")
            .first()
            .innerText();

    console.log(
        "Product:",
        productName
    );


    // ========================================
    // FIND REVEAL BUTTON
    // ========================================

    const revealButton =
        page.getByRole("button", {
            name: /reveal price/i
        });

    const priceArea =
        page.locator(".price-block").first();


    // ========================================
    // BROWSER INFO
    // ========================================

    console.log(
        "PLAYWRIGHT UA:",
        await page.evaluate(() => navigator.userAgent)
    );

    console.log(
        "PLAYWRIGHT PLATFORM:",
        await page.evaluate(() => navigator.platform)
    );

    console.log(
        "PLAYWRIGHT SCREEN:",
        await page.evaluate(() => [
            screen.width,
            screen.height,
            window.devicePixelRatio
        ])
    );

    console.log(
        "PLAYWRIGHT MOBILE:",
        await page.evaluate(
            () => navigator.userAgentData?.mobile
        )
    );


    await revealButton.waitFor({
        state: "visible",
        timeout: 10000
    });

    console.log("Reveal Price button found");


    // ========================================
    // CHECK COOKIES AGAIN
    // ========================================

    await handleCookies(page);
    await ensureCookiesGone(page);


    // ========================================
    // HUMAN-LIKE MOUSE MOVEMENT
    // ========================================

    console.log(
        "Hovering over price area..."
    );

    console.log(
        "Starting human-like mouse movement..."
    );

    const box =
        await priceArea.boundingBox();

    if (!box) {
        throw new Error(
            "Could not get price area position"
        );
    }

    const startX =
        box.x + 100;

    const startY =
        box.y + box.height / 2;

    await page.mouse.move(
        startX,
        startY
    );

    for (let i = 0; i < 10; i++) {

        const x =
            box.x +
            50 +
            (i * (box.width - 100) / 9);

        const y =
            box.y +
            20 +
            ((i % 3) * 20);

        await page.mouse.move(x, y);

        await page.waitForTimeout(80);
    }

    console.log(
        "Mouse movement completed"
    );

    await page.waitForTimeout(1000);
    await page.waitForTimeout(2000);


    // ========================================
    // WAIT FOR BUTTON TO ENABLE
    // ========================================

    console.log(
        "Waiting for Reveal Price button to become enabled..."
    );

    await page.waitForFunction(
        () => {

            const btn =
                document.querySelector(
                    'button[aria-label="Reveal price"]'
                );

            return btn && !btn.disabled;
        },
        {
            timeout: 60000
        }
    );

    console.log(
        "Reveal Price button enabled"
    );


    // ========================================
    // DEBUG LISTENERS
    // ========================================

    console.log(
        "Preparing to click Reveal Price..."
    );

    const requestHandler = request => {

        if (
            request.url().includes("/api/session")
        ) {
            console.log(
                "SESSION REQUEST URL:",
                request.url()
            );

            console.log(
                "SESSION METHOD:",
                request.method()
            );

            console.log(
                "SESSION HEADERS:",
                request.headers()
            );

            console.log(
                "SESSION BODY:",
                request.postData()
            );
        }
    };


    const responseHandler = async response => {

        if (
            response.url().includes("/api/session")
        ) {
            console.log(
                "SESSION RESPONSE STATUS:",
                response.status()
            );

            try {
                console.log(
                    "SESSION RESPONSE:",
                    await response.text()
                );
            }
            catch { }
        }
    };


    const productResponseHandler = response => {

        if (
            response.url().includes("/api/products/")
        ) {
            console.log(
                "RESPONSE:",
                response.status(),
                response.url()
            );
        }
    };


    page.on(
        "request",
        requestHandler
    );

    page.on(
        "response",
        responseHandler
    );

    page.on(
        "response",
        productResponseHandler
    );


    try {

        // ========================================
        // START WAITING BEFORE CLICK
        // ========================================

        const priceResponsePromise =
            page.waitForResponse(
                response =>
                    response.url().includes(
                        `/api/products/${productId}/price`
                    ),
                {
                    timeout: 60000
                }
            );


        // ========================================
        // CLICK REVEAL PRICE
        // ========================================

        console.log(
            "Clicking Reveal Price..."
        );

        await revealButton.click();
        console.log("BUTTON TEXT AFTER CLICK:",
            await revealButton.innerText().catch(() => "ERROR")
        );

        console.log("PRICE AREA HTML:",
            await priceArea.innerHTML().catch(() => "ERROR")
        );

        console.log(
            "Waiting for price API..."
        );


        // ========================================
        // GET PRICE RESPONSE
        // ========================================

        let priceResponse;

        try {

            priceResponse =
                await priceResponsePromise;

        }
        catch (error) {

            throw new Error(
                "No price API response received within 60 seconds"
            );
        }


        // ========================================
        // API INFORMATION
        // ========================================

        console.log(
            "Price API status:",
            priceResponse.status()
        );

        console.log(
            "Price API URL:",
            priceResponse.url()
        );


        // ========================================
        // READ API RESPONSE
        // ========================================

        let priceData = null;

        try {

            priceData =
                await priceResponse.json();

            console.log(
                "Price API data:",
                priceData
            );

        }
        catch (error) {

            console.log(
                "Price API response was not JSON"
            );
        }


        // ========================================
        // CHECK API STATUS
        // ========================================

        if (priceResponse.status() !== 200) {

            throw new Error(
                `Price API failed with status ${priceResponse.status()}`
            );
        }


        console.log(
            "Price API succeeded. Waiting for page to update..."
        );

        await page.waitForTimeout(2000);


        // ========================================
        // FIND PRICE
        // ========================================

        // const priceElement = page
        //     .locator(".price-main span:visible")
        //     .filter({ hasText: /(?:₹|Rs\.)/ })
        //     .first();
        const priceElement = page
            .locator('.price-main span[class*="pv-"]:visible')
            .first();

        const stockElement =
            page
                .locator(".stock-badge:visible")
                .first();


        await priceElement.waitFor({
            state: "visible",
            timeout: 30000
        });

        await stockElement.waitFor({
            state: "visible",
            timeout: 30000
        });


        const rawPrice =
            await priceElement.innerText();

        const rawStock =
            await stockElement.innerText();


        console.log(
            "Raw price:",
            rawPrice
        );

        console.log(
            "Raw stock:",
            rawStock
        );


        // ========================================
        // CONVERT PRICE
        // ========================================

        const normalizedPrice =
            rawPrice
                .normalize("NFKC")
                .replace(
                    /[\u200B\u200C\u200D\uFEFF]/g,
                    ""
                );

        const price =
            Number(
                normalizedPrice.replace(
                    /[^\d]/g,
                    ""
                )
            );


        // ========================================
        // CONVERT STOCK
        // ========================================

        let stock = 0;

        if (/OUT OF STOCK/i.test(rawStock)) {

            stock = 0;

        }
        else {

            const match =
                rawStock.match(/(\d+)/);

            if (match) {

                stock =
                    Number(match[1]);
            }
        }


        // ========================================
        // VALIDATE
        // ========================================

        if (!price || price <= 0) {

            throw new Error(
                `Invalid price: ${rawPrice}`
            );
        }


        if (stock < 0) {

            throw new Error(
                `Invalid stock: ${rawStock}`
            );
        }


        // ========================================
        // RETURN
        // ========================================

        return {

            productId,

            productName,

            price,

            stock,

            rawPrice,

            rawStock
        };

    }
    finally {

        // ========================================
        // REMOVE DEBUG LISTENERS
        // ========================================

        page.removeListener(
            "request",
            requestHandler
        );

        page.removeListener(
            "response",
            responseHandler
        );

        page.removeListener(
            "response",
            productResponseHandler
        );
    }
}

// ========================================
// SAVE SCRAPE LOG
// ========================================

async function saveScrapeLog({
    productId,
    attempt,
    status,
    price = null,
    stock = null,
    error = null,
    startedAt,
    finishedAt
}) {
    const { error: logError } =
        await supabase
            .from("scrape_logs")
            .insert({
                product_id: productId,
                attempt: attempt,
                status: status,
                price: price,
                stock: stock,
                error: error,
                started_at: startedAt,
                finished_at: finishedAt
            });

    if (logError) {
        console.error(
            "Scrape log error:",
            logError
        );
    }
}

// ========================================
// MAIN
// ========================================

async function main() {

    const browser =
        await chromium.launch({
            headless: true
        });

    const page =
        await browser.newPage();

    console.log("\nTesting browser frame timing...");

    const frameTiming = await page.evaluate(async () => {
        const times = [];

        return new Promise(resolve => {
            let last = performance.now();

            function frame(now) {
                times.push(now - last);
                last = now;

                if (times.length >= 10) {
                    resolve(times);
                    return;
                }

                requestAnimationFrame(frame);
            }

            requestAnimationFrame(frame);
        });
    });

    console.log("FRAME TIMINGS:", frameTiming);

    try {

        // ========================================
        // SCRAPE PRODUCTS
        // ========================================

        for (const productId of PRODUCT_IDS) {

            console.log(
                "\n========================================"
            );

            console.log(
                `SCRAPING PRODUCT ${productId}`
            );

            console.log(
                "========================================"
            );


            // ========================================
            // RETRY ATTEMPTS
            // ========================================

            for (
                let attempt = 1;
                attempt <= MAX_ATTEMPTS;
                attempt++
            ) {

                console.log(
                    `\n========== ATTEMPT ${attempt}/${MAX_ATTEMPTS} ==========`
                );

                const attemptStartedAt =
                    new Date().toISOString();


                try {

                    const result =
                        await scrapeProduct(
                            page,
                            productId
                        );


                    // ========================================
                    // SUCCESS
                    // ========================================

                    console.log(
                        "\nSUCCESS!"
                    );

                    console.log(
                        result
                    );


                    // ========================================
                    // SAVE PRODUCT
                    // ========================================

                    const { error } =
                        await supabase
                            .from("products")
                            .upsert({

                                id:
                                    result.productId,

                                name:
                                    result.productName,

                                price:
                                    result.price,

                                stock:
                                    result.stock,

                                url:
                                    `https://demo.inelabteamdev.com/product/${result.productId}`,

                                last_scraped_at:
                                    new Date().toISOString()
                            });


                    if (error) {

                        console.error(
                            "Database error:",
                            error
                        );

                    }
                    else {

                        console.log(
                            "Product saved to Supabase!"
                        );
                    }


                    // ========================================
                    // SAVE PRICE HISTORY
                    // ========================================

                    const {
                        error: historyError
                    } =
                        await supabase
                            .from("price_history")
                            .insert({

                                product_id:
                                    result.productId,

                                price:
                                    result.price,

                                stock:
                                    result.stock,

                                scraped_at:
                                    new Date().toISOString()
                            });


                    if (historyError) {

                        console.error(
                            "Price history error:",
                            historyError
                        );

                    }
                    else {

                        console.log(
                            "Price history saved!"
                        );
                    }
                    await saveScrapeLog({
                        productId: result.productId,
                        attempt: attempt,
                        status: "success",
                        price: result.price,
                        stock: result.stock,
                        startedAt: attemptStartedAt,
                        finishedAt: new Date().toISOString()
                    });


                    // ========================================
                    // STOP RETRIES
                    // ========================================

                    break;

                }
                catch (error) {

                    console.log(
                        `Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${error.message}`
                    );

                    await saveScrapeLog({
                        productId: productId,
                        attempt: attempt,
                        status:
                            attempt < MAX_ATTEMPTS
                                ? "retrying"
                                : "failed",
                        error: error.message,
                        startedAt: attemptStartedAt,
                        finishedAt: new Date().toISOString()
                    });

                    if (
                        attempt < MAX_ATTEMPTS
                    ) {

                        console.log(
                            "Retrying..."
                        );

                        await page.waitForTimeout(
                            2000
                        );

                    }
                    else {

                        console.log(
                            `FAILED: Product ${productId} could not be scraped after ${MAX_ATTEMPTS} attempts.`
                        );

                    }
                }
            }
        }

    }
    finally {

        console.log(
            "\n========================================"
        );

        console.log(
            "SCRAPING FINISHED"
        );

        console.log(
            "========================================"
        );

        await browser.close();
    }
}


// ========================================
// START
// ========================================

main();