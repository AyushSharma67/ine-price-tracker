const { spawn } = require("child_process");

const scraper = spawn(
    process.execPath,
    [__dirname + "/testScraper.js"],
    {
        stdio: "inherit"
    }
);

scraper.on("close", (code) => {
    console.log(`Scraper finished with exit code ${code}`);

    if (code !== 0) {
        process.exit(1);
    }
});