document.addEventListener('DOMContentLoaded', function() {
    // Constants
    const TOKEN_EXPIRY_HOURS = 2;
    const VALID_ROLES = ['admin', 'student'];
    const SESSION_KEY = 'ct_session_v1';
    const USER_KEY = 'ct_user_v1';
    const USERS_KEY = 'ct_users_v1';

    // DOM Elements with null checks
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (!loginTab || !registerTab || !loginForm || !registerForm) {
        console.error('Critical DOM elements missing');
        return;
    }

    // Initialize
    cleanupExpiredSessions();
    checkAuthStatus();
    setupEventListeners();

    function setupEventListeners() {
        try {
            loginTab.addEventListener('click', switchToLogin);
            registerTab.addEventListener('click', switchToRegister);
            loginForm.addEventListener('submit', handleLogin);
            registerForm.addEventListener('submit', handleRegister);
        } catch (e) {
            console.error('Event listener setup failed:', e);
        }
    }

    function switchToLogin() {
        try {
            loginTab?.classList.add('active');
            registerTab?.classList.remove('active');
            loginForm?.classList.add('active');
            registerForm?.classList.remove('active');
        } catch (e) {
            console.error('Tab switch failed:', e);
        }
    }

    function switchToRegister() {
        try {
            registerTab?.classList.add('active');
            loginTab?.classList.remove('active');
            registerForm?.classList.add('active');
            loginForm?.classList.remove('active');
        } catch (e) {
            console.error('Tab switch failed:', e);
        }
    }

    async function handleLogin(e) {
        try {
            e.preventDefault();
            const email = sanitizeInput(loginEmail?.value || '');
            const password = document.getElementById('loginPassword')?.value || '';
            
            if (!validateInputs(email, password)) return;
            
            // Simulate API call with timeout
            setTimeout(() => {
                try {
                    const users = getUsers();
                    const user = users.find(u => u.email === email && verifyPassword(password, u.passwordHash));
                    
                    if (user) {
                        createSession(user);
                        redirectToDashboard(user.role);
                    } else {
                        showError(document.getElementById('loginPassword'), 'Invalid email or password');
                    }
                } catch (error) {
                    console.error('Login processing failed:', error);
                    showError(document.getElementById('loginPassword'), 'Login failed. Please try again.');
                }
            }, 800);
        } catch (e) {
            console.error('Login handler failed:', e);
            showError(document.getElementById('loginPassword'), 'An error occurred. Please try again.');
        }
    }

    async function handleRegister(e) {
        try {
            e.preventDefault();
            const email = sanitizeInput(regEmail?.value || '');
            const password = document.getElementById('regPassword')?.value || '';
            const confirmPassword = document.getElementById('regConfirmPassword')?.value || '';
            const role = userType?.value || '';
            
            if (!validateInputs(email, password, confirmPassword, role)) return;
            
            // Simulate API call with timeout
            setTimeout(() => {
                try {
                    const users = getUsers();
                    
                    if (users.some(u => u.email === email)) {
                        showError(regEmail, 'Email already registered');
                        return;
                    }
                    
                    const newUser = createUser(email, password, role);
                    saveUsers([...users, newUser]);
                    createSession(newUser);
                    redirectToDashboard(role);
                } catch (error) {
                    console.error('Registration processing failed:', error);
                    showError(regEmail, 'Registration failed. Please try again.');
                }
            }, 800);
        } catch (e) {
            console.error('Registration handler failed:', e);
            showError(regEmail, 'An error occurred. Please try again.');
        }
    }

    // ======================
    // VALIDATION FUNCTIONS
    // ======================

    function validateInputs(email, password, confirmPassword, role) {
        try {
            if (!validateUniversityEmail(email)) {
                showError(loginEmail, 'Please use your university email address');
                return false;
            }
            
            if (password && password.length < 8) {
                showError(document.getElementById('regPassword'), 'Password must be at least 8 characters');
                return false;
            }
            
            if (confirmPassword && password !== confirmPassword) {
                showError(document.getElementById('regConfirmPassword'), 'Passwords do not match');
                return false;
            }
            
            if (role && !VALID_ROLES.includes(role)) {
                showError(userType, 'Please select a valid user type');
                return false;
            }
            
            return true;
        } catch (e) {
            console.error('Validation failed:', e);
            return false;
        }
    }

    function validateUniversityEmail(email) {
        try {
            return /^[^\s@]+@university\.edu$/.test(email);
        } catch (e) {
            console.error('Email validation failed:', e);
            return false;
        }
    }

    function sanitizeInput(input) {
        try {
            if (typeof input !== 'string') return '';
            return input.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
        } catch (e) {
            console.error('Input sanitization failed:', e);
            return '';
        }
    }

    // ======================
    // SECURITY FUNCTIONS
    // ======================

    function hashPassword(password) {
        try {
            let hash = 0;
            for (let i = 0; i < password.length; i++) {
                const char = password.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash |= 0; // Convert to 32bit integer
            }
            return 'ct_' + hash.toString(16);
        } catch (e) {
            console.error('Password hashing failed:', e);
            return 'error_' + Date.now();
        }
    }

    function verifyPassword(inputPassword, storedHash) {
        try {
            return hashPassword(inputPassword) === storedHash;
        } catch (e) {
            console.error('Password verification failed:', e);
            return false;
        }
    }

    function generateAuthToken() {
        try {
            const randomPart = Math.random().toString(36).substring(2, 15);
            const timePart = Date.now().toString(36);
            return 'ct_' + hashPassword(`${randomPart}${timePart}`);
        } catch (e) {
            console.error('Token generation failed:', e);
            return 'err_' + Date.now();
        }
    }

    // ======================
    // SESSION MANAGEMENT
    // ======================

    function createSession(user) {
        try {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);
            
            const session = {
                userId: user.id,
                token: generateAuthToken(),
                expiresAt: expiresAt.toISOString(),
                lastActivity: new Date().toISOString(),
                ip: '127.0.0.1' // In real app, capture actual IP
            };
            
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            
            // Update user's last login
            const users = getUsers();
            const updatedUsers = users.map(u => 
                u.id === user.id ? {...u, lastLogin: new Date().toISOString()} : u
            );
            saveUsers(updatedUsers);
        } catch (e) {
            console.error('Session creation failed:', e);
            throw new Error('Session creation failed');
        }
    }

    function checkAuthStatus() {
        try {
            const sessionData = localStorage.getItem(SESSION_KEY);
            const userData = localStorage.getItem(USER_KEY);
            
            if (!sessionData || !userData) return;
            
            const session = JSON.parse(sessionData);
            const user = JSON.parse(userData);
            
            if (new Date() > new Date(session.expiresAt)) {
                clearAuthData();
                return;
            }
            
            // Update last activity
            session.lastActivity = new Date().toISOString();
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            
            redirectToDashboard(user.role);
        } catch (e) {
            console.error('Auth check failed:', e);
            clearAuthData();
        }
    }

    function cleanupExpiredSessions() {
        try {
            const sessionData = localStorage.getItem(SESSION_KEY);
            if (!sessionData) return;
            
            const session = JSON.parse(sessionData);
            if (new Date() > new Date(session.expiresAt)) {
                clearAuthData();
            }
        } catch (e) {
            console.error('Session cleanup failed:', e);
            clearAuthData();
        }
    }

    function clearAuthData() {
        try {
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(USER_KEY);
        } catch (e) {
            console.error('Failed to clear auth data:', e);
        }
    }

    // ======================
    // DATA MANAGEMENT
    // ======================

    function getUsers() {
        try {
            return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
        } catch (e) {
            console.error('Failed to get users:', e);
            return [];
        }
    }

    function saveUsers(users) {
        try {
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        } catch (e) {
            console.error('Failed to save users:', e);
        }
    }

    function createUser(email, password, role) {
        try {
            return {
                id: 'user_' + Date.now().toString(36),
                email: sanitizeInput(email),
                passwordHash: hashPassword(password),
                role: VALID_ROLES.includes(role) ? role : 'student',
                name: email.split('@')[0].replace('.', ' '),
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true,
                verified: false
            };
        } catch (e) {
            console.error('User creation failed:', e);
            throw new Error('User creation failed');
        }
    }

    // ======================
    // UI FUNCTIONS
    // ======================

    function showError(inputElement, message) {
        try {
            if (!inputElement) return;
            
            const formGroup = inputElement.closest('.form-group');
            if (!formGroup) return;
            
            const errorElement = formGroup.querySelector('.error-message');
            if (!errorElement) return;
            
            inputElement.classList.add('error');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            setTimeout(() => {
                inputElement.classList.remove('error');
                errorElement.style.display = 'none';
            }, 5000);
        } catch (e) {
            console.error('Error display failed:', e);
        }
    }

    function redirectToDashboard(role) {
        try {
            if (role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'student.html';
            }
        } catch (e) {
            console.error('Redirect failed:', e);
            window.location.href = 'index.html';
        }
    }
});