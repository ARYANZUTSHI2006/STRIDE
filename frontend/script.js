// ==========================================
// 1. CORE STATE & DOM ELEMENTS
// ==========================================
let cart = [];
const prodGrid = document.getElementById('prodGrid');
const cartCount = document.querySelector('.cart-count');
const cartSidebar = document.getElementById('cartSidebar');
const cartIcon = document.querySelector('.cart-icon');
const closeCart = document.getElementById('closeCart');

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
                        <button onclick="logout()" class="logout-btn">Logout</button>
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
        let url = 'http://localhost:4000/api/products';
        if (category) {
            url += `?category=${encodeURIComponent(category)}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        showProds(data, category);
    } catch (err) {
        console.error("Error fetching products:", err);
        if (prodGrid) {
            prodGrid.innerHTML = `<p style="grid-column: 1/-1; color: #ff4757; text-align: center;">Unable to load products. Ensure the backend server is running.</p>`;
        }
    }
}

function showProds(prods, category) {
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
                <img src="${p.imgUrl}" alt="${p.name}">
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
    if (user) {
        // Sync to cloud if logged in
        user.cart = cart;
        localStorage.setItem('user', JSON.stringify(user));
        try {
            await fetch('http://localhost:4000/api/cart/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.userId, cart: cart })
            });
        } catch (err) {
            console.error("Failed to sync cart:", err);
        }
    } else {
        // Save locally if guest
        localStorage.setItem('localCart', JSON.stringify(cart));
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
    if (user) {
        user.cart = cart;
        localStorage.setItem('user', JSON.stringify(user));
        try {
            await fetch('http://localhost:4000/api/cart/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.userId, cart: cart })
            });
        } catch (err) {
            console.error("Failed to sync cart:", err);
        }
    } else {
        localStorage.setItem('localCart', JSON.stringify(cart));
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
                <img src="${item.imgUrl}" alt="${item.name}">
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

    try {
        const res = await fetch(`http://localhost:4000/api/user/${user.userId}`);
        const fullUserData = await res.json();

        cart = fullUserData.cart || [];
        updateUI();

        if (historyContainer) {
            if (fullUserData.orders && fullUserData.orders.length > 0) {
                historyContainer.innerHTML = fullUserData.orders.reverse().map(order => `
                    <div class="history-item">
                        <div class="history-header">
                            <span>${new Date(order.date).toLocaleDateString()}</span>
                            <strong>$${order.total.toFixed(2)}</strong>
                        </div>
                        <div class="history-details">
                            ${order.items.map(item => `<span>1x ${item.name}</span>`).join('')}
                        </div>
                    </div>
                `).join('');
            } else {
                historyContainer.innerHTML = '<p class="empty-msg">No past purchases.</p>';
            }
        }
    } catch (err) {
        console.error("Error fetching user data:", err);
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

    try {
        const res = await fetch('http://localhost:4000/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.userId })
        });

        if (res.ok) {
            alert("Payment Successful! Order moved to history.");
            cart = [];
            user.cart = [];
            localStorage.setItem('user', JSON.stringify(user));
            updateUI();
            await refreshSidebarData(); 
        } else {
            alert("Checkout failed. Please try again.");
        }
    } catch (err) {
        console.error("Checkout error:", err);
    }
}

function logout() {
    localStorage.removeItem('user');
    window.location.reload(); 
}

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

        try {
            btn.disabled = true;
            btn.textContent = "Sending...";

            const res = await fetch('http://localhost:4000/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            formMessage.className = 'form-message';

            if (res.ok) {
                formMessage.textContent = data.msg;
                formMessage.classList.add('success');
                emailInput.value = ''; 
            } else {
                formMessage.textContent = data.msg;
                formMessage.classList.add('error');
            }
        } catch (err) {
            formMessage.textContent = "Could not connect to server.";
            formMessage.classList.add('error');
        } finally {
            btn.disabled = false;
            btn.textContent = "Subscribe";
            setTimeout(() => formMessage.className = 'form-message', 4000);
        }
    });
}