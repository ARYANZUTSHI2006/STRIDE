const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const app = express();
const port = process.env.PORT || 4000;

// --- MIDDLEWARE - FIXED CORS ---
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
const mongoURI = "mongodb+srv://aryanzutshi0710_db_user:do1xeNC9Ft8IwDG2@cluster0.f0pirpa.mongodb.net/strideDB";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ DB Error:", err));

// ==========================================
// SCHEMAS
// ==========================================
const subscriberSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    subscribedAt: { type: Date, default: Date.now }
});
const Subscriber = mongoose.model("Subscriber", subscriberSchema);

const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    category: String,
    imgUrl: String
});
const Product = mongoose.model("Product", productSchema);

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    cart: { type: Array, default: [] },
    orders: { type: Array, default: [] }
});
const User = mongoose.model("User", userSchema);

// ==========================================
// HELPER: DB ready check
// ==========================================
function isDbReady(res) {
    if (mongoose.connection.readyState !== 1) {
        res.status(503).json({ msg: "Server is warming up, please try again in a few seconds." });
        return false;
    }
    return true;
}

// ==========================================
// ROUTES
// ==========================================
app.get("/", (req, res) => {
    res.send("🚀 Backend is running!");
});

app.get("/health", (req, res) => {
    res.json({ status: "OK", db: mongoose.connection.readyState === 1 ? "connected" : "connecting" });
});

// Products
app.get("/api/products", async (req, res) => {
    if (!isDbReady(res)) return;
    try {
        let products = await Product.find();
        if (products.length === 0) {
            const defaultProducts = [
                { name: "Nike Air Max", price: 129.99, category: "Running", imgUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400" },
                { name: "Adidas Ultraboost", price: 159.99, category: "Running", imgUrl: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400" },
                { name: "Puma Suede", price: 69.99, category: "Casual", imgUrl: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400" }
            ];
            await Product.insertMany(defaultProducts);
            products = await Product.find();
        }
        res.json(products);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Signup
app.post("/api/signup", async (req, res) => {
    if (!isDbReady(res)) return;
    try {
        const { email, password } = req.body;
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ msg: "User exists" });
        
        const hashed = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashed });
        await user.save();
        res.json({ msg: "User created" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Login
app.post("/api/login", async (req, res) => {
    if (!isDbReady(res)) return;
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: "Invalid credentials" });
        
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ msg: "Invalid credentials" });
        
        res.json({ 
            msg: "Login successful", 
            userId: user._id, 
            email: user.email, 
            cart: user.cart,
            orders: user.orders 
        });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Cart sync
app.post("/api/cart/sync", async (req, res) => {
    if (!isDbReady(res)) return;
    try {
        const { userId, cart } = req.body;
        await User.findByIdAndUpdate(userId, { cart });
        res.json({ msg: "Synced" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

app.get("/api/user/:id", async (req, res) => {
    if (!isDbReady(res)) return;
    try {
        const user = await User.findById(req.params.id);
        res.json(user);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

app.post("/api/checkout", async (req, res) => {
    if (!isDbReady(res)) return;
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user.cart.length) return res.status(400).json({ msg: "Cart empty" });
        
        const total = user.cart.reduce((s, i) => s + i.price, 0);
        const order = { items: user.cart, date: new Date(), total };
        
        await User.findByIdAndUpdate(userId, {
            $push: { orders: order },
            $set: { cart: [] }
        });
        res.json({ msg: "Purchase successful" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

app.post("/api/subscribe", async (req, res) => {
    if (!isDbReady(res)) return;
    try {
        const { email } = req.body;
        const sub = new Subscriber({ email });
        await sub.save();
        res.json({ msg: "Subscribed!" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// START
app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server on port ${port}`);
});