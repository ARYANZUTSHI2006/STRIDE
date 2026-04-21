const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const app = express();
const port = process.env.PORT || 4000;  // FIXED: Use environment port for Render

// --- MIDDLEWARE ---
app.use(cors({
    origin: '*',
    credentials: true
}));

// --- DATABASE CONNECTION ---
const mongoURI = "mongodb+srv://aryanzutshi0710_db_user:do1xeNC9Ft8IwDG2@cluster0.f0pirpa.mongodb.net/strideDB";

mongoose.connect(mongoURI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.error("❌ Database Connection Error:", err));

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
    res.send("🚀 Stride Backend is running!");
});

// --- NEWSLETTER ROUTES ---
app.post("/api/subscribe", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ msg: "Email is required" });

        const newSubscriber = new Subscriber({ email });
        await newSubscriber.save();
        
        console.log(`📧 New Subscriber: ${email}`);
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
        
        // If no products in DB, seed some default ones
        if (products.length === 0) {
            console.log("⚠️ No products found, seeding default products...");
            const defaultProducts = [
                { name: "Nike Air Max", price: 129.99, category: "Running", imgUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400" },
                { name: "Adidas Ultraboost", price: 159.99, category: "Running", imgUrl: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400" },
                { name: "Puma Suede Classic", price: 69.99, category: "Casual", imgUrl: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400" },
                { name: "New Balance 574", price: 89.99, category: "Lifestyle", imgUrl: "https://images.unsplash.com/photo-1570993492881-25240ce854f4?w=400" },
                { name: "Vans Old Skool", price: 59.99, category: "Skate", imgUrl: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400" },
                { name: "Converse Chuck Taylor", price: 54.99, category: "Casual", imgUrl: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400" },
                { name: "Reebok Classic", price: 74.99, category: "Lifestyle", imgUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400" },
                { name: "Under Armour Curry", price: 119.99, category: "Basketball", imgUrl: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400" }
            ];
            await Product.insertMany(defaultProducts);
            const seededProducts = await Product.find(filter);
            res.json(seededProducts);
        } else {
            res.json(products);
        }
    } catch (err) {
        console.error("Error fetching products:", err);
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
    } catch (err) { 
        res.status(500).json({ msg: "Update failed" }); 
    }
});

app.delete("/api/products/:id", async (req, res) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ msg: "Product not found" });
        res.json({ msg: "Product successfully deleted" });
    } catch (err) { 
        res.status(500).json({ msg: "Delete failed" }); 
    }
});

// --- AUTHENTICATION ROUTES ---
app.post("/api/signup", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ msg: "User already exists" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword, cart: [], orders: [] });
        await newUser.save();
        res.status(201).json({ msg: "User created successfully" });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ msg: "Server error during signup" });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ msg: "Invalid credentials" });
        }
        res.json({ 
            msg: "Login successful", 
            userId: user._id, 
            email: user.email, 
            cart: user.cart,
            orders: user.orders 
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ msg: "Server error during login" });
    }
});

// --- CART & CHECKOUT ROUTES ---
// 1. Get full user data (Needed for the sidebar history)
app.get("/api/user/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }
        res.json(user);
    } catch (err) {
        console.error("Error fetching user:", err);
        res.status(500).json({ msg: "Error fetching user data" });
    }
});

// 2. Sync local cart to database
app.post("/api/cart/sync", async (req, res) => {
    try {
        const { userId, cart } = req.body;
        const updatedUser = await User.findByIdAndUpdate(userId, { cart: cart }, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ msg: "User not found" });
        }
        res.json({ msg: "Cart synced to cloud", cart: updatedUser.cart });
    } catch (err) {
        console.error("Cart sync error:", err);
        res.status(500).json({ msg: "Error saving cart" });
    }
});

// 3. Checkout: Move cart items to order history
app.post("/api/checkout", async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }
        
        if (!user.cart || user.cart.length === 0) {
            return res.status(400).json({ msg: "Cart is empty" });
        }

        const total = user.cart.reduce((sum, item) => sum + item.price, 0);
        const newOrder = {
            items: [...user.cart],
            date: new Date(),
            total: total
        };
        
        // Push the new order to the orders array and empty the cart
        const updatedUser = await User.findByIdAndUpdate(userId, {
            $push: { orders: newOrder },
            $set: { cart: [] }
        }, { new: true });
        
        res.json({ 
            msg: "Purchase Successful", 
            order: newOrder,
            cart: updatedUser.cart,
            orders: updatedUser.orders
        });
    } catch (err) {
        console.error("Checkout error:", err);
        res.status(500).json({ msg: "Checkout failed" });
    }
});

// Health check endpoint for Render
app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date() });
});

// ==========================================
// START SERVER
// ==========================================
app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server is running on port ${port}`);
    console.log(`📍 Local: http://localhost:${port}`);
    console.log(`🌍 Deployed: https://stride-1-ait1.onrender.com`);
});