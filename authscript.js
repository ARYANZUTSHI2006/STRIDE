
        // BACKEND URL - CHANGE THIS TO YOUR RENDER URL
        const BACKEND_URL = 'https://stride-1-ait1.onrender.com';
        
        // Authentication state toggling (Login / Sign Up)
        let isLogin = true;

        // DOM elements
        const authTitle = document.getElementById('auth-title');
        const authBtn = document.getElementById('authBtn');
        const toggleText = document.getElementById('toggle-text');
        const formMessage = document.getElementById('formMessage');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const authForm = document.getElementById('authForm');

        // Helper: display inline message (success/error) instead of alert
        function displayMessage(message, type) {
            formMessage.innerHTML = message;
            formMessage.className = `form-message ${type}`;
            // Auto-hide success messages after 3 seconds (but keep errors longer)
            if (type === 'success') {
                setTimeout(() => {
                    if (formMessage.className.includes('success')) {
                        formMessage.className = 'form-message';
                        formMessage.innerHTML = '';
                    }
                }, 3200);
            }
        }

        // Clear message when user starts typing or toggling
        function clearMessage() {
            formMessage.className = 'form-message';
            formMessage.innerHTML = '';
        }

        // Toggle between Login & Signup mode
        function toggleAuth() {
            isLogin = !isLogin;
            authTitle.innerText = isLogin ? "Login" : "Sign Up";
            authBtn.innerText = isLogin ? "Login" : "Sign Up";
            toggleText.innerText = isLogin ? 
                "Don't have an account? Sign Up" : "Already have an account? Login";
            // Clear form fields & any message for better UX
            emailInput.value = '';
            passwordInput.value = '';
            clearMessage();
        }

        // Attach toggle event
        toggleText.addEventListener('click', toggleAuth);

        // Form submission (Login / Signup)
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            // Basic validation
            if (!email || !password) {
                displayMessage("Please fill in both email and password.", "error");
                return;
            }
            if (!email.includes('@') || !email.includes('.')) {
                displayMessage("Please enter a valid email address.", "error");
                return;
            }
            if (password.length < 4) {
                displayMessage("Password must be at least 4 characters.", "error");
                return;
            }

            // Determine endpoint
            const endpoint = isLogin ? '/api/login' : '/api/signup';
            
            // Disable button & show loading state
            const originalBtnText = authBtn.innerText;
            authBtn.disabled = true;
            authBtn.innerText = "Processing...";
            clearMessage();

            try {
                const res = await fetch(`${BACKEND_URL}${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                // Handle server waking up (cold start)
                if (res.status === 503) {
                    displayMessage("Server is waking up, please try again in a few seconds.", "error");
                    authBtn.disabled = false;
                    authBtn.innerText = originalBtnText;
                    return;
                }

                const data = await res.json();

                if (res.ok) {
                    if (isLogin) {
                        // LOGIN SUCCESS: store user info & redirect to main shop
                        localStorage.setItem('user', JSON.stringify(data));
                        // Small visual feedback before redirect
                        displayMessage("Login successful! Redirecting...", "success");
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 800);
                    } else {
                        // SIGNUP SUCCESS: show success message, then switch to login mode
                        displayMessage("✨ Account created successfully! Please log in.", "success");
                        // Reset form and toggle to login after short delay
                        setTimeout(() => {
                            // only toggle if we are still on signup mode (avoid race)
                            if (!isLogin) {
                                toggleAuth();   // switch to Login mode
                                emailInput.value = email;  // keep email pre-filled for convenience
                                passwordInput.value = '';
                                clearMessage();
                            } else {
                                // fallback: just clear message
                                clearMessage();
                            }
                        }, 1800);
                    }
                } else {
                    // Server error message (e.g., user exists, invalid credentials)
                    const errorMsg = data.msg || (isLogin ? "Invalid email or password" : "Signup failed. Email might already exist.");
                    displayMessage(errorMsg, "error");
                }
            } catch (err) {
                console.error("Auth error:", err);
                displayMessage(`Network error: Cannot connect to server. Please make sure the backend is running at ${BACKEND_URL}`, "error");
            } finally {
                // Re-enable button (if not redirected immediately)
                if (authBtn.disabled) {
                    authBtn.disabled = false;
                    authBtn.innerText = originalBtnText;
                }
            }
        });