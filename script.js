// ==========================================
// 1. CORE STATE & DOM ELEMENTS
// ==========================================
let cart = [];
const prodGrid = document.getElementById('prodGrid');
const cartCount = document.querySelector('.cart-count');
const cartSidebar = document.getElementById('cartSidebar');
const cartIcon = document.querySelector('.cart-icon');
const closeCart = document.getElementById('closeCart');

// BACKEND URL - Make it easy to change
const BACKEND_URL = 'https://stride-1-ait1.onrender.com';

// Fake data for when backend is offline
const FAKE_PRODUCTS = [
    { id: 1, name: "Nike Air Max", price: 129.99, category: "Running", imgUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400" },
    { id: 2, name: "Adidas Ultraboost", price: 159.99, category: "Running", imgUrl: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400" },
    { id: 3, name: "Puma Suede Classic", price: 69.99, category: "Casual", imgUrl: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400" },
    { id: 4, name: "New Balance 574", price: 89.99, category: "Lifestyle", imgUrl: "https://images.unsplash.com/photo-1570993492881-25240ce854f4?w=400" },
    { id: 5, name: "Vans Old Skool", price: 59.99, category: "Skate", imgUrl: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400" },
    { id: 6, name: "Converse Chuck Taylor", price: 54.99, category: "Casual", imgUrl: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400" },
    { id: 7, name: "Reebok Classic", price: 74.99, category: "Lifestyle", imgUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400" },
    { id: 8, name: "Under Armour Curry", price: 119.99, category: "Basketball", imgUrl: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400" }
];

let isBackendAvailable = true;

// ==========================================
// 2. INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('user'));
    const navLinks = document.querySelector('.nav-links');

    if (user) {
        // Update Navbar for logged-in user
        if (navLinks) {
            const loginLink = navLinks.querySelector('a[href="auth.html"]');
            if (loginLink) {
                loginLink.parentElement.innerHTML = `
                    <div class="user-menu" style="margin-left: 2rem;">
                        <a href="#" style="cursor:default; color: var(--primary);"><i class="fas fa-user-circle"></i> ${user.email.split('@')[0]}</a>
                        <button onclick="logout()" class="logout-btn" style="margin-left: 10px; padding: 5px 10px; background: #ff6b6b; color: white; border: none; border-radius: 5px; cursor: pointer;">Logout</button>
                    </div>
                `;
            }
        }
        // Load user's cart from database/memory
        cart = user.cart || [];
    } else {
        // Load guest cart from local storage
        cart = JSON.parse(localStorage.getItem('localCart')) || [];
    }

    updateUI();
    getProds(); 
    setupCategoryFilters();
    setTimeout(animateOnScroll, 500);
});

// ==========================================
// 3. PRODUCT FETCHING & RENDERING
// ==========================================
async function getProds(category = null) {
    try {
        let url = `${BACKEND_URL}/api/products`;
        if (category) {
            url += `?category=${encodeURIComponent(category)}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        isBackendAvailable = true;
        showProds(data, category);
        
        // Remove warning if it exists
        const warning = document.querySelector('.demo-warning');
        if (warning) warning.remove();
        
    } catch (err) {
        console.error("Error fetching products:", err);
        isBackendAvailable = false;
        // Use fake data when backend is offline
        let fakeData = [...FAKE_PRODUCTS];
        if (category) {
            fakeData = fakeData.filter(p => p.category.toLowerCase() === category.toLowerCase());
        }
        showProds(fakeData, category, true);
        if (prodGrid && fakeData.length === 0) {
            prodGrid.innerHTML = `<p style="grid-column: 1/-1; color: #ff4757; text-align: center;">Unable to load products. Using demo data. Ensure the backend server is running for full functionality.</p>`;
        }
    }
}

function showProds(prods, category, isFakeData = false) {
    if (!prodGrid) return;
    prodGrid.innerHTML = '';
    
    // Update Section Title based on filter
    const title = document.querySelector('#featured h2');
    if (title) {
        title.textContent = category ? `${category} Collection` : "Featured Products";
    }

    if (prods.length === 0) {
        prodGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">No products found in this category.</p>`;
        return;
    }

    prods.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card animate__animated animate__fadeInUp';
        
        card.innerHTML = `
            <div class="product-image">
                <img src="${p.imgUrl}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'">
            </div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <p>${p.category || 'Lifestyle'} shoe</p>
                <div class="product-price">
                    <span class="price">$${p.price}</span>
                    <button class="add-to-cart-btn">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Add to Cart Event Listener
        const btn = card.querySelector('.add-to-cart-btn');
        btn.addEventListener('click', () => {
            addToCart(p);
            
            // Visual Success Feedback
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.style.backgroundColor = '#2ecc71';
            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-plus"></i>';
                btn.style.backgroundColor = '';
            }, 1000);
        });

        prodGrid.appendChild(card);
    });

    // Add warning banner if using fake data
    if (isFakeData && !document.querySelector('.demo-warning')) {
        const warningBanner = document.createElement('div');
        warningBanner.className = 'demo-warning';
        warningBanner.style.cssText = `
            background: #ff9800;
            color: white;
            text-align: center;
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            grid-column: 1/-1;
            position: sticky;
            top: 80px;
            z-index: 100;
        `;
        warningBanner.innerHTML = '⚠️ Demo Mode: Using sample data. Backend server not connected.';
        prodGrid.parentElement.insertBefore(warningBanner, prodGrid);
    }
}

function setupCategoryFilters() {
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const categoryName = card.querySelector('h3').textContent;
            getProds(categoryName);
            document.getElementById('featured').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ==========================================
// 4. CART & SYNC LOGIC
// ==========================================
async function addToCart(product) {
    cart.push(product);
    
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && isBackendAvailable) {
        // Sync to cloud if logged in and backend available
        user.cart = cart;
        localStorage.setItem('user', JSON.stringify(user));
        try {
            const response = await fetch(`${BACKEND_URL}/api/cart/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.userId, cart: cart })
            });
            if (!response.ok) throw new Error('Sync failed');
            console.log('Cart synced successfully');
        } catch (err) {
            console.error("Failed to sync cart:", err);
            // Store sync pending
            localStorage.setItem('pendingSync', JSON.stringify({ userId: user.userId, cart: cart }));
        }
    } else {
        // Save locally if guest or backend unavailable
        localStorage.setItem('localCart', JSON.stringify(cart));
        if (user && !isBackendAvailable) {
            // Store for later sync
            localStorage.setItem('pendingSync', JSON.stringify({ userId: user.userId, cart: cart }));
        }
    }
    
    updateUI();

    // Visual feedback on navbar icon
    if(cartIcon) {
        cartIcon.classList.add('animate__animated', 'animate__rubberBand');
        setTimeout(() => cartIcon.classList.remove('animate__rubberBand'), 1000);
    }
}

async function removeFromCart(index) {
    cart.splice(index, 1);
    
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && isBackendAvailable) {
        user.cart = cart;
        localStorage.setItem('user', JSON.stringify(user));
        try {
            await fetch(`${BACKEND_URL}/api/cart/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.userId, cart: cart })
            });
        } catch (err) {
            console.error("Failed to sync cart:", err);
            localStorage.setItem('pendingSync', JSON.stringify({ userId: user.userId, cart: cart }));
        }
    } else {
        localStorage.setItem('localCart', JSON.stringify(cart));
        if (user && !isBackendAvailable) {
            localStorage.setItem('pendingSync', JSON.stringify({ userId: user.userId, cart: cart }));
        }
    }
    
    updateUI();
}

function updateUI() {
    // 1. Update Bubble
    if (cartCount) {
        cartCount.textContent = cart.length;
    }

    // 2. Render Sidebar
    const container = document.getElementById('cartItemsContainer');
    const totalSpan = document.getElementById('cartTotal');

    if (!container) return; 

    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-msg" style="padding: 10px 0;">Your cart is empty.</p>';
        if (totalSpan) totalSpan.textContent = '0.00';
        return;
    }

    let total = 0;
    container.innerHTML = cart.map((item, index) => {
        total += item.price;
        return `
            <div class="cart-item">
                <img src="${item.imgUrl}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/50x50?text=No+Image'">
                <div style="flex-grow: 1; padding: 0 15px;">
                    <h4 style="font-size: 0.95rem; margin-bottom: 5px;">${item.name}</h4>
                    <p style="color: #777; font-size: 0.9rem;">$${item.price}</p>
                </div>
                <button onclick="removeFromCart(${index})" style="background: none; border: none; color: #ff4757; cursor: pointer; font-size: 1.1rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');

    if (totalSpan) {
        totalSpan.textContent = total.toFixed(2);
    }
}

// Sync pending cart operations when backend becomes available
async function syncPendingOperations() {
    const pendingSync = localStorage.getItem('pendingSync');
    if (pendingSync && isBackendAvailable) {
        try {
            const syncData = JSON.parse(pendingSync);
            await fetch(`${BACKEND_URL}/api/cart/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(syncData)
            });
            localStorage.removeItem('pendingSync');
            console.log('Pending sync completed');
        } catch (err) {
            console.error("Failed to sync pending operations:", err);
        }
    }
}

// ==========================================
// 5. SIDEBAR, CHECKOUT & AUTH
// ==========================================
cartIcon?.addEventListener('click', async () => {
    cartSidebar.classList.add('active');
    await refreshSidebarData();
});

closeCart?.addEventListener('click', () => {
    cartSidebar.classList.remove('active');
});

async function refreshSidebarData() {
    const user = JSON.parse(localStorage.getItem('user'));
    const historyContainer = document.getElementById('orderHistoryContainer');

    if (!user) {
        if(historyContainer) historyContainer.innerHTML = '<p class="empty-msg">Log in to view history.</p>';
        updateUI(); 
        return;
    }

    if (!isBackendAvailable) {
        if(historyContainer) historyContainer.innerHTML = '<p class="empty-msg">Demo Mode: Connect to backend to view order history.</p>';
        updateUI();
        return;
    }

    try {
        const res = await fetch(`${BACKEND_URL}/api/user/${user.userId}`);
        if (!res.ok) throw new Error('Failed to fetch user data');
        const fullUserData = await res.json();

        cart = fullUserData.cart || [];
        updateUI();

        if (historyContainer) {
            if (fullUserData.orders && fullUserData.orders.length > 0) {
                historyContainer.innerHTML = [...fullUserData.orders].reverse().map(order => `
                    <div class="history-item" style="border-bottom: 1px solid #eee; padding: 10px 0;">
                        <div class="history-header" style="display: flex; justify-content: space-between;">
                            <span>${new Date(order.date).toLocaleDateString()}</span>
                            <strong>$${order.total.toFixed(2)}</strong>
                        </div>
                        <div class="history-details" style="font-size: 0.8rem; color: #666; margin-top: 5px;">
                            ${order.items.map(item => `<span>1x ${item.name}</span>`).join(', ')}
                        </div>
                    </div>
                `).join('');
            } else {
                historyContainer.innerHTML = '<p class="empty-msg">No past purchases.</p>';
            }
        }
    } catch (err) {
        console.error("Error fetching user data:", err);
        if (historyContainer) {
            historyContainer.innerHTML = '<p class="empty-msg">Unable to load order history. Using demo mode.</p>';
        }
    }
}

async function handleCheckout() {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        alert("Please log in to proceed to payment.");
        window.location.href = 'auth.html';
        return;
    }

    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    if (!isBackendAvailable) {
        // Simulate successful checkout in demo mode
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        const fakeOrder = {
            id: Date.now(),
            date: new Date().toISOString(),
            total: total,
            items: [...cart]
        };
        
        // Store order in localStorage for demo
        const demoOrders = JSON.parse(localStorage.getItem('demoOrders')) || [];
        demoOrders.push(fakeOrder);
        localStorage.setItem('demoOrders', JSON.stringify(demoOrders));
        
        alert("Demo Mode: Payment Simulated! Order saved locally.");
        cart = [];
        user.cart = [];
        localStorage.setItem('user', JSON.stringify(user));
        updateUI();
        await refreshSidebarData();
        return;
    }

    try {
        const res = await fetch(`${BACKEND_URL}/api/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.userId })
        });

        if (res.ok) {
            const data = await res.json();
            alert("Payment Successful! Order moved to history.");
            cart = [];
            user.cart = [];
            localStorage.setItem('user', JSON.stringify(user));
            updateUI();
            await refreshSidebarData(); 
        } else {
            const error = await res.json();
            alert(`Checkout failed: ${error.msg}`);
        }
    } catch (err) {
        console.error("Checkout error:", err);
        alert("Unable to process checkout. Please try again.");
    }
}

function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('localCart');
    localStorage.removeItem('pendingSync');
    window.location.href = 'auth.html';
}

// Make functions global for HTML onclick handlers
window.removeFromCart = removeFromCart;
window.handleCheckout = handleCheckout;
window.logout = logout;

// ==========================================
// 6. UI INTERACTIONS & FORMS
// ==========================================
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const header = document.getElementById('header');
const backToTop = document.querySelector('.back-to-top');

hamburger?.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    hamburger.innerHTML = navLinks.classList.contains('active') ? 
        '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        if(navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            hamburger.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
});

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) header?.classList.add('scrolled');
    else header?.classList.remove('scrolled');

    if (window.scrollY > 300) backToTop?.classList.add('active');
    else backToTop?.classList.remove('active');
    
    animateOnScroll();
});

function animateOnScroll() {
    const elements = document.querySelectorAll('.animate__animated');
    elements.forEach(element => {
        const elementPosition = element.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.2;
        if (elementPosition < screenPosition) {
            const animationClass = element.classList[1];
            element.style.visibility = 'visible';
            element.classList.add(animationClass);
        }
    });
}

const newsletterForm = document.querySelector('.newsletter-form');
const formMessage = document.getElementById('formMessage');

if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailInput = newsletterForm.querySelector('.newsletter-input');
        const email = emailInput.value;
        const btn = newsletterForm.querySelector('.newsletter-button');

        if (!email || !email.includes('@')) {
            if (formMessage) {
                formMessage.className = 'form-message error';
                formMessage.textContent = "Please enter a valid email address.";
                setTimeout(() => formMessage.className = 'form-message', 4000);
            }
            return;
        }

        try {
            btn.disabled = true;
            btn.textContent = "Sending...";

            if (!isBackendAvailable) {
                // Simulate subscription in demo mode
                setTimeout(() => {
                    if (formMessage) {
                        formMessage.className = 'form-message success';
                        formMessage.textContent = "Demo Mode: Subscription recorded!";
                    }
                    emailInput.value = '';
                    btn.disabled = false;
                    btn.textContent = "Subscribe";
                    
                    // Save to localStorage
                    const subscriptions = JSON.parse(localStorage.getItem('demoSubscriptions')) || [];
                    subscriptions.push({ email, date: new Date().toISOString() });
                    localStorage.setItem('demoSubscriptions', JSON.stringify(subscriptions));
                    
                    setTimeout(() => {
                        if (formMessage) formMessage.className = 'form-message';
                    }, 4000);
                }, 500);
                return;
            }

            const res = await fetch(`${BACKEND_URL}/api/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (formMessage) {
                formMessage.className = 'form-message';
                if (res.ok) {
                    formMessage.textContent = data.msg;
                    formMessage.classList.add('success');
                    emailInput.value = ''; 
                } else {
                    formMessage.textContent = data.msg;
                    formMessage.classList.add('error');
                }
            }
        } catch (err) {
            console.error("Subscription error:", err);
            if (formMessage) {
                formMessage.textContent = "Could not connect to server. Using demo mode.";
                formMessage.classList.add('error');
            }
            
            // Save subscription locally in demo mode
            const subscriptions = JSON.parse(localStorage.getItem('demoSubscriptions')) || [];
            subscriptions.push({ email, date: new Date().toISOString() });
            localStorage.setItem('demoSubscriptions', JSON.stringify(subscriptions));
        } finally {
            btn.disabled = false;
            btn.textContent = "Subscribe";
            setTimeout(() => {
                if (formMessage) formMessage.className = 'form-message';
            }, 4000);
        }
    });
}

// Periodic backend availability check
setInterval(async () => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        await fetch(`${BACKEND_URL}/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!isBackendAvailable) {
            console.log('Backend is back online!');
            isBackendAvailable = true;
            await syncPendingOperations();
            const warning = document.querySelector('.demo-warning');
            if (warning) warning.remove();
            getProds(); // Refresh products from backend
        }
    } catch (err) {
        if (isBackendAvailable) {
            console.log('Backend went offline');
            isBackendAvailable = false;
        }
    }
}, 30000); // Check every 30 seconds