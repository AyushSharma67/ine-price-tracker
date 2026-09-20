const express = require("express");
const cors = require("cors");
const supabase = require("./supabase");

const app = express();

app.use(cors());
app.use(express.json());


// Get all products
app.get("/api/products", async (req, res) => {

    const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("id");

    if (error) {
        console.error(error);
        return res.status(500).json({
            error: error.message
        });
    }

    res.json(data);
});


// Get one product
app.get("/api/products/:id", async (req, res) => {

    const productId = Number(req.params.id);

    const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

    if (error) {
        console.error(error);
        return res.status(404).json({
            error: "Product not found"
        });
    }

    res.json(data);
});


// Get price history
app.get("/api/products/:id/history", async (req, res) => {

    const productId = Number(req.params.id);

    const { data, error } = await supabase
        .from("price_history")
        .select("*")
        .eq("product_id", productId)
        .order("scraped_at", {
            ascending: true
        });

    if (error) {
        console.error(error);
        return res.status(500).json({
            error: error.message
        });
    }

    res.json(data);
});

// Get scrape logs
app.get("/api/products/:id/logs", async (req, res) => {

    const productId = Number(req.params.id);

    const { data, error } = await supabase
        .from("scrape_logs")
        .select("*")
        .eq("product_id", productId)
        .order("started_at", {
            ascending: false
        });

    if (error) {
        console.error(error);
        return res.status(500).json({
            error: error.message
        });
    }

    res.json(data);
});

// Get tracked products
app.get("/api/tracked-products", async (req, res) => {

    const { data, error } = await supabase
        .from("tracked_products")
        .select("product_id, created_at")
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error(error);
        return res.status(500).json({
            error: error.message
        });
    }

    res.json(data);
});


// Track a product
app.post("/api/products/:id/track", async (req, res) => {

    const productId = Number(req.params.id);

    const { data, error } = await supabase
        .from("tracked_products")
        .insert({
            product_id: productId
        })
        .select()
        .single();

    if (error) {
        // Already tracked
        if (error.code === "23505") {
            return res.status(200).json({
                message: "Product already tracked"
            });
        }

        console.error(error);
        return res.status(500).json({
            error: error.message
        });
    }

    res.status(201).json(data);
});


// Untrack a product
app.delete("/api/products/:id/track", async (req, res) => {

    const productId = Number(req.params.id);

    const { error } = await supabase
        .from("tracked_products")
        .delete()
        .eq("product_id", productId);

    if (error) {
        console.error(error);
        return res.status(500).json({
            error: error.message
        });
    }

    res.json({
        message: "Product untracked"
    });
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});