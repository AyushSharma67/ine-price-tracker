import { useEffect, useState } from "react";
import "./App.css";
function App() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [history, setHistory] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [error, setError] = useState("");
    const [tracked, setTracked] = useState(false);
    const [trackLoading, setTrackLoading] = useState(false);
    // Load all products
    useEffect(() => {
        async function loadProducts() {
            try {
                const response = await fetch(
                    "http://localhost:5000/api/products"
                );

                if (!response.ok) {
                    throw new Error("Failed to load products");
                }

                const data = await response.json();
                setProducts(data);

                // Select first product initially
                if (data.length > 0) {
                    setSelectedProduct(data[0]);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadProducts();
    }, []);

    // Load history and scrape logs whenever product changes
    useEffect(() => {
        if (!selectedProduct) return;

        async function loadDetails() {
            setDetailsLoading(true);

            try {
                const [historyResponse, logsResponse, trackedResponse] = await Promise.all([
                    fetch(
                        `http://localhost:5000/api/products/${selectedProduct.id}/history`
                    ),
                    fetch(
                        `http://localhost:5000/api/products/${selectedProduct.id}/logs`
                    ),
                    fetch(
                        "http://localhost:5000/api/tracked-products"
                    )
                ]);

                if (!historyResponse.ok) {
                    throw new Error("Failed to load price history");
                }

                if (!logsResponse.ok) {
                    throw new Error("Failed to load scrape logs");
                }

                const historyData = await historyResponse.json();
                const logsData = await logsResponse.json();
                const trackedData = await trackedResponse.json();

                setTracked(
                    trackedData.some(
                        (item) => item.product_id === selectedProduct.id
                    )
                );
                setHistory(historyData);
                setLogs(logsData);
            } catch (err) {
                setError(err.message);
            } finally {
                setDetailsLoading(false);
            }
        }

        loadDetails();
    }, [selectedProduct]);
    async function toggleTracking() {
        if (!selectedProduct) return;

        setTrackLoading(true);

        try {
            const method = tracked ? "DELETE" : "POST";

            const response = await fetch(
                `http://localhost:5000/api/products/${selectedProduct.id}/track`,
                {
                    method
                }
            );

            if (!response.ok) {
                throw new Error("Failed to update tracking");
            }

            setTracked(!tracked);
        } catch (err) {
            setError(err.message);
        } finally {
            setTrackLoading(false);
        }
    }
    const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return <div className="app">Loading products...</div>;
    }

    if (error && products.length === 0) {
        return <div className="app error">{error}</div>;
    }

    return (
        <div className="app">

            <header className="header">
                <h1>INE Price Tracker</h1>
                <p>Track product prices, stock and scraping reliability</p>
            </header>

            <div className="search-section">
                <input
                    type="text"
                    placeholder="Search product by name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <div className="product-list">
                    {filteredProducts.slice(0, 10).map((product) => (
                        <button
                            key={product.id}
                            className={
                                selectedProduct?.id === product.id
                                    ? "product-option selected"
                                    : "product-option"
                            }
                            onClick={() => setSelectedProduct(product)}
                        >
                            <span>{product.name}</span>
                            <span>₹{Number(product.price).toLocaleString("en-IN")}</span>
                        </button>
                    ))}

                    {filteredProducts.length === 0 && (
                        <p className="no-results">No products found.</p>
                    )}
                </div>
            </div>

            {selectedProduct && (
                <main>

                    <section className="product-card">

                        <div>
                            <h2>{selectedProduct.name}</h2>

                            <p className="price">
                                ₹{Number(selectedProduct.price).toLocaleString("en-IN")}
                            </p>

                            <p className="stock">
                                {selectedProduct.stock === 0
                                    ? "OUT OF STOCK"
                                    : `${selectedProduct.stock} items left`}
                            </p>
                        </div>

                        <a
                            href={selectedProduct.url}
                            target="_blank"
                            rel="noreferrer"
                            className="view-button"
                        >
                            View Product
                        </a>
                        <button
                            className="track-button"
                            onClick={toggleTracking}
                            disabled={trackLoading}
                        >
                            {trackLoading
                                ? "Updating..."
                                : tracked
                                    ? "Untrack Product"
                                    : "Track Product"}
                        </button>

                    </section>

                    {detailsLoading ? (
                        <p>Loading product data...</p>
                    ) : (
                        <>
                            <section className="section">

                                <h2>Price & Stock History</h2>

                                {history.length === 0 ? (
                                    <p>No history available yet.</p>
                                ) : (
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Price</th>
                                                    <th>Stock</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {history.map((item) => (
                                                    <tr key={item.id}>
                                                        <td>
                                                            {new Date(
                                                                item.scraped_at
                                                            ).toLocaleString()}
                                                        </td>

                                                        <td>
                                                            ₹{Number(item.price).toLocaleString(
                                                                "en-IN"
                                                            )}
                                                        </td>

                                                        <td>{item.stock}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                            </section>

                            <section className="section">

                                <h2>Scrape Logs</h2>

                                {logs.length === 0 ? (
                                    <p>No scrape attempts recorded yet.</p>
                                ) : (
                                    <div className="table-container">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Attempt</th>
                                                    <th>Status</th>
                                                    <th>Price</th>
                                                    <th>Stock</th>
                                                    <th>Error</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {logs.map((log) => (
                                                    <tr key={log.id}>
                                                        <td>{log.attempt}</td>

                                                        <td>
                                                            <span
                                                                className={`status ${log.status}`}
                                                            >
                                                                {log.status}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {log.price
                                                                ? `₹${Number(log.price).toLocaleString(
                                                                    "en-IN"
                                                                )}`
                                                                : "-"}
                                                        </td>

                                                        <td>
                                                            {log.stock ?? "-"}
                                                        </td>

                                                        <td>
                                                            {log.error || "-"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                            </section>
                        </>
                    )}

                </main>
            )}

        </div>
    );
}

export default App;