const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // Moved to top

const app = express();
const port = 4000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
const mongoURI = "mongodb+srv://aryanzutshi0710_db_user:do1xeNC9Ft8IwDG2@cluster0.f0pirpa.mongodb.net/strideDB";

mongoose.connect(mongoURI)
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch(err => console.error("Database Connection Error:", err));

// ==========================================
// SCHEMAS & MODELS
// ==========================================

// 1. Subscriber Schema
const subscriberSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    subscribedAt: { type: Date, default: Date.now }
});
const Subscriber = mongoose.model("Subscriber", subscriberSchema);

// 2. Product Schema
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: String,
    imgUrl: String
});
const Product = mongoose.model("product", productSchema);

// 3. User Schema (Updated with orders array for history)
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    cart: { type: Array, default: [] },
    orders: { type: Array, default: [] } 
});
const User = mongoose.model("User", userSchema);


// ==========================================
// ROUTES
// ==========================================

app.get("/", (req, res) => {
    res.send("Stride Backend is running!");
});

// --- NEWSLETTER ROUTES ---
app.post("/api/subscribe", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ msg: "Email is required" });

        const newSubscriber = new Subscriber({ email });
        await newSubscriber.save();
        
        console.log(`New Subscriber: ${email}`);
        res.status(201).json({ msg: "Successfully subscribed!" });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ msg: "You are already subscribed!" });
        res.status(500).json({ msg: "Server error, try again later" });
    }
});

// --- PRODUCT ROUTES ---
// GET products (Includes optional category filtering)
app.get("/api/products", async (req, res) => {
    try {
        const { category } = req.query;
        const filter = category ? { category: category } : {};
        const products = await Product.find(filter);
        res.json(products);
    } catch (err) {
        res.status(500).json({ msg: "Error fetching products" });
    }
});

app.post("/api/products", async (req, res) => {
    try {
        const newProduct = new Product(req.body);
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (err) {
        res.status(400).json({ msg: "Error creating product", error: err.message });
    }
});

app.put("/api/products/:id", async (req, res) => {
    try {
        const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) { res.status(500).json({ msg: "Update failed" }); }
});

app.delete("/api/products/:id", async (req, res) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ msg: "Product not found" });
        res.json({ msg: "Product successfully deleted" });
    } catch (err) { res.status(500).json({ msg: "Delete failed" }); }
});


// --- AUTHENTICATION ROUTES ---
app.post("/api/signup", async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ msg: "User created successfully" });
    } catch (err) {
        res.status(400).json({ msg: "User already exists" });
    }
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ msg: "Invalid credentials" });
    }
    res.json({ msg: "Login successful", userId: user._id, email: user.email, cart: user.cart });
});


// --- CART & CHECKOUT ROUTES ---
// 1. Get full user data (Needed for the sidebar history)
app.get("/api/user/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        res.json(user);
    } catch (err) {
        res.status(500).json({ msg: "Error fetching user data" });
    }
});

// 2. Sync local cart to database
app.post("/api/cart/sync", async (req, res) => {
    try {
        const { userId, cart } = req.body;
        await User.findByIdAndUpdate(userId, { cart: cart });
        res.json({ msg: "Cart synced to cloud" });
    } catch (err) {
        res.status(500).json({ msg: "Error saving cart" });
    }
});

// 3. Checkout: Move cart items to order history
app.post("/api/checkout", async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        
        if (!user.cart || user.cart.length === 0) {
            return res.status(400).json({ msg: "Cart is empty" });
        }

        const newOrder = {
            items: user.cart,
            date: new Date(),
            total: user.cart.reduce((sum, item) => sum + item.price, 0)
        };
        
        // Push the new order to the orders array and empty the cart
        await User.findByIdAndUpdate(userId, {
            $push: { orders: newOrder },
            $set: { cart: [] }
        });
        
        res.json({ msg: "Purchase Successful", order: newOrder });
    } catch (err) {
        res.status(500).json({ msg: "Checkout failed" });
    }
});

// ==========================================
// START SERVER
// ==========================================
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});