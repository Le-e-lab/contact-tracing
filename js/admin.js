document.addEventListener('DOMContentLoaded', function() {
    // Constants
    const SESSION_KEY = 'ct_session_v1';
    const USER_KEY = 'ct_user_v1';
    const USERS_KEY = 'ct_users_v1';
    const CHECKINS_KEY = 'ct_checkins_v1';
    const APPOINTMENTS_KEY = 'ct_appointments_v1';
    const SYMPTOMS_KEY = 'ct_symptoms_v1';
    let currentUser = null;

    try {
        // Verify authentication
        if (!verifySession()) {
            window.location.href = 'index.html';
            return;
        }

        // Get current user
        currentUser = getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            clearAuthData();
            window.location.href = 'index.html';
            return;
        }

        // Initialize
        setupEventListeners();
        loadDashboardData(currentUser);

    } catch (error) {
        console.error('Admin dashboard initialization failed:', error);
        clearAuthData();
        window.location.href = 'index.html';
    }

    function setupEventListeners() {
        try {
            document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
            document.getElementById('generateReportBtn')?.addEventListener('click', generateReport);
            document.getElementById('refreshDataBtn')?.addEventListener('click', refreshData);
            document.getElementById('appointmentStatusFilter')?.addEventListener('change', filterAppointments);
            document.getElementById('createUserBtn')?.addEventListener('click', showCreateUserForm);
            
            // Navigation links
            document.querySelectorAll('.sidebar-nav a').forEach(link => {
                link.addEventListener('click', handleNavClick);
            });
        } catch (e) {
            console.error('Event listener setup failed:', e);
        }
    }

    function loadDashboardData(user) {
        try {
            if (!user) throw new Error('No user provided');
            
            // Set user info
            document.querySelector('.user-name').textContent = user.name;
            document.querySelector('.user-email').textContent = user.email;
            document.getElementById('lastUpdatedTime').textContent = new Date().toLocaleString();

            // Load all data
            const stats = calculateStats();
            renderStatsCards(stats);
            renderRecentCases();
            renderLocationHeatmap();
            renderAppointmentsTable();
            renderUsersTable();
            
        } catch (e) {
            console.error('Failed to load dashboard data:', e);
        }
    }

    function calculateStats() {
        try {
            const appointments = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY)) || [];
            const symptoms = JSON.parse(localStorage.getItem(SYMPTOMS_KEY)) || [];
            
            // Count active cases (users with recent symptoms)
            const activeCases = new Set(symptoms
                .filter(s => new Date(s.date) > new Date(Date.now() - 1209600000)) // Last 14 days
                .map(s => s.userId)
            ).size;
            
            return {
                activeCases: activeCases,
                potentialExposures: 0, // Simplified for demo
                todaysAppointments: appointments.filter(a => {
                    const apptDate = new Date(a.datetime);
                    const today = new Date();
                    return apptDate.toDateString() === today.toDateString();
                }).length,
                pendingAppointments: appointments.filter(a => a.status === 'pending').length
            };
        } catch (e) {
            console.error('Failed to calculate stats:', e);
            return {
                activeCases: 0,
                potentialExposures: 0,
                todaysAppointments: 0,
                pendingAppointments: 0
            };
        }
    }

    function renderStatsCards(stats) {
        try {
            document.getElementById('activeCases').textContent = stats.activeCases;
            document.getElementById('potentialExposures').textContent = stats.potentialExposures;
            document.getElementById('todaysAppointments').textContent = stats.todaysAppointments;
            document.getElementById('pendingAppointments').textContent = stats.pendingAppointments;
        } catch (e) {
            console.error('Failed to render stats cards:', e);
        }
    }

    function renderRecentCases() {
        try {
            const symptoms = JSON.parse(localStorage.getItem(SYMPTOMS_KEY)) || [];
            const checkIns = JSON.parse(localStorage.getItem(CHECKINS_KEY)) || [];
            const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
            
            // Get recent symptom reports (last 7 days)
            const recentSymptoms = symptoms
                .filter(s => new Date(s.date) > new Date(Date.now() - 604800000))
                .slice(0, 5); // Limit to 5 most recent
            
            const tableBody = document.getElementById('casesTable');
            if (!tableBody) return;
            
            tableBody.innerHTML = recentSymptoms.map((symptom, index) => {
                const user = users.find(u => u.id === symptom.userId) || {};
                const userCheckIns = checkIns.filter(ci => ci.userId === symptom.userId);
                const lastLocation = userCheckIns.length 
                    ? userCheckIns[userCheckIns.length - 1].location 
                    : 'Unknown';
                
                return `
                    <tr>
                        <td>case_${index + 1}</td>
                        <td>${user.name || 'Unknown User'}</td>
                        <td>${formatDate(symptom.date)}</td>
                        <td>${countSymptoms(symptom)}</td>
                        <td><span class="status-badge active">Active</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline" onclick="viewCaseDetails('${symptom.userId}')">View</button>
                            <button class="btn btn-sm btn-primary" onclick="initiateContactTrace('${symptom.userId}')">Trace</button>
                        </td>
                    </tr>
                `;
            }).join('') || '<tr><td colspan="6" class="text-muted">No recent cases found</td></tr>';
        } catch (e) {
            console.error('Failed to render recent cases:', e);
        }
    }

    function countSymptoms(symptomReport) {
        try {
            let count = 0;
            if (symptomReport.fever) count++;
            if (symptomReport.cough) count++;
            if (symptomReport.breath) count++;
            if (symptomReport.fatigue) count++;
            if (symptomReport.ache) count++;
            if (symptomReport.taste) count++;
            return count;
        } catch (e) {
            console.error('Failed to count symptoms:', e);
            return 0;
        }
    }

    function renderLocationHeatmap() {
        try {
            const checkIns = JSON.parse(localStorage.getItem(CHECKINS_KEY)) || [];
            const symptoms = JSON.parse(localStorage.getItem(SYMPTOMS_KEY)) || [];
            
            // Count visits per location
            const locationCounts = {};
            checkIns.forEach(checkIn => {
                locationCounts[checkIn.location] = (locationCounts[checkIn.location] || 0) + 1;
            });
            
            // Identify high-risk locations (where symptomatic users checked in)
            const highRiskLocations = new Set();
            symptoms.forEach(symptom => {
                checkIns
                    .filter(ci => ci.userId === symptom.userId)
                    .forEach(ci => highRiskLocations.add(ci.location));
            });
            
            const locations = Object.keys(locationCounts).map(location => {
                return {
                    name: location,
                    risk: highRiskLocations.has(location) ? 'high' : 
                          locationCounts[location] > 50 ? 'medium' : 'low',
                    visits: locationCounts[location]
                };
            });
            
            const heatmap = document.querySelector('.heatmap-grid');
            if (!heatmap) return;
            
            heatmap.innerHTML = locations.map(loc => `
                <div class="heatmap-item ${loc.risk}">
                    <div class="location-name">${loc.name}</div>
                    <div class="visit-count">${loc.visits} visits</div>
                </div>
            `).join('');
        } catch (e) {
            console.error('Failed to render heatmap:', e);
        }
    }

    function renderAppointmentsTable() {
        try {
            const appointments = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY)) || [];
            const filterValue = document.getElementById('appointmentStatusFilter')?.value || 'all';
            
            const filteredAppointments = filterValue === 'all' 
                ? appointments 
                : appointments.filter(a => a.status === filterValue);
            
            const table = document.getElementById('adminAppointmentsTable');
            if (!table) return;
            
            table.innerHTML = filteredAppointments.map(appt => `
                <tr>
                    <td>${appt.studentName}</td>
                    <td>${formatPurpose(appt.purpose)}</td>
                    <td>${formatDate(appt.datetime)}</td>
                    <td><span class="status-badge ${appt.status}">${appt.status}</span></td>
                    <td>
                        ${appt.status === 'pending' ? `
                            <button class="btn btn-sm btn-success" onclick="updateAppointmentStatus('${appt.id}', 'confirmed')">✓ Confirm</button>
                            <button class="btn btn-sm btn-danger" onclick="updateAppointmentStatus('${appt.id}', 'cancelled')">✗ Cancel</button>
                        ` : ''}
                        <button class="btn btn-sm btn-outline" onclick="viewAppointmentDetails('${appt.id}')">Details</button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="5" class="text-muted">No appointments found</td></tr>';
        } catch (e) {
            console.error('Appointments table render failed:', e);
        }
    }

    function renderUsersTable() {
        try {
            const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
            const table = document.getElementById('usersTable');
            if (!table) return;
            
            table.innerHTML = users.map(user => `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td><span class="badge ${user.role === 'admin' ? 'badge-primary' : 'badge-secondary'}">${user.role}</span></td>
                    <td>${user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')" ${user.id === currentUser.id ? 'disabled' : ''}>
                            Delete
                        </button>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="5" class="text-muted">No users found</td></tr>';
        } catch (e) {
            console.error('Failed to render users table:', e);
        }
    }

    function filterAppointments() {
        renderAppointmentsTable();
    }

    function showCreateUserForm() {
        try {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay active';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Create New User</h3>
                    <form id="createUserForm">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="email" placeholder="user@university.edu" required>
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" name="password" required>
                        </div>
                        <div class="form-group">
                            <label>Confirm Password</label>
                            <input type="password" name="confirmPassword" required>
                        </div>
                        <div class="form-group">
                            <label>Role</label>
                            <select name="role" required>
                                <option value="student">Student</option>
                                <option value="admin">Administrator</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Create User</button>
                        </div>
                    </form>
                </div>
            `;
            
            modal.querySelector('#createUserForm').addEventListener('submit', (e) => {
                e.preventDefault();
                handleCreateUser(new FormData(e.target));
                modal.remove();
            });
            
            document.body.appendChild(modal);
        } catch (e) {
            console.error('Create user form failed:', e);
            showModal(
                'Error',
                'Failed to load user creation form. Please try again.',
                'error'
            );
        }
    }

    function handleCreateUser(formData) {
        try {
            const email = sanitizeInput(formData.get('email'));
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');
            const role = formData.get('role');
            
            // Validation
            if (!email.endsWith('@university.edu')) {
                throw new Error('Must use university email');
            }
            
            if (password.length < 8) {
                throw new Error('Password must be at least 8 characters');
            }
            
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }
            
            const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
            
            if (users.some(u => u.email === email)) {
                throw new Error('Email already registered');
            }
            
            const newUser = {
                id: 'user_' + Date.now().toString(36),
                email: email,
                passwordHash: hashPassword(password),
                role: role,
                name: email.split('@')[0].replace('.', ' '),
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true
            };
            
            localStorage.setItem(USERS_KEY, JSON.stringify([...users, newUser]));
            
            showModal(
                'User Created',
                `Successfully created ${role} account for ${email}`,
                'success'
            );
            
            renderUsersTable();
        } catch (e) {
            console.error('User creation failed:', e);
            showModal(
                'Creation Failed',
                e.message || 'Failed to create user. Please try again.',
                'error'
            );
        }
    }

    function generateReport() {
        try {
            // Simulate report generation
            showModal(
                'Report Generated',
                'A detailed report has been prepared and would be downloaded in a real implementation.',
                'info'
            );
        } catch (e) {
            console.error('Report generation failed:', e);
            showModal(
                'Error',
                'Failed to generate report. Please try again.',
                'error'
            );
        }
    }

    function refreshData() {
        try {
            // Show loading indicator
            const refreshBtn = document.getElementById('refreshDataBtn');
            if (refreshBtn) {
                refreshBtn.innerHTML = '<div class="spinner"></div>';
                refreshBtn.disabled = true;
            }
            
            // Simulate data refresh
            setTimeout(() => {
                try {
                    loadDashboardData(currentUser);
                    showModal(
                        'Data Refreshed',
                        'All data has been refreshed successfully.',
                        'success'
                    );
                } finally {
                    if (refreshBtn) {
                        refreshBtn.innerHTML = '🔄';
                        refreshBtn.disabled = false;
                    }
                }
            }, 1500);
        } catch (e) {
            console.error('Data refresh failed:', e);
            showModal(
                'Error',
                'Failed to refresh data. Please try again.',
                'error'
            );
        }
    }

    function handleNavClick(e) {
        try {
            e.preventDefault();
            const targetId = this.getAttribute('href')?.substring(1);
            if (!targetId) return;
            
            // Update active nav link
            document.querySelectorAll('.sidebar-nav li').forEach(li => {
                li.classList.remove('active');
            });
            this.parentElement.classList.add('active');
            
            // Show corresponding section
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
                if (section.id === targetId) {
                    section.classList.add('active');
                    const pageTitle = document.getElementById('pageTitle');
                    if (pageTitle) {
                        pageTitle.textContent = this.textContent.trim();
                    }
                    
                    // Load specific content for the section
                    if (targetId === 'users') {
                        renderUsersTable();
                    } else if (targetId === 'appointments') {
                        renderAppointmentsTable();
                    }
                }
            });
        } catch (e) {
            console.error('Navigation failed:', e);
        }
    }

    function formatDate(isoString) {
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } catch (e) {
            console.error('Date formatting failed:', e);
            return 'Unknown date';
        }
    }

    function formatPurpose(purposeKey) {
        const purposes = {
            'covid_test': 'COVID-19 Test',
            'vaccination': 'Vaccination',
            'consultation': 'Consultation'
        };
        return purposes[purposeKey] || purposeKey;
    }

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

    function sanitizeInput(input) {
        try {
            if (typeof input !== 'string') return '';
            return input.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
        } catch (e) {
            console.error('Input sanitization failed:', e);
            return '';
        }
    }

    function verifySession() {
        try {
            const sessionData = localStorage.getItem(SESSION_KEY);
            if (!sessionData) return false;
            
            const session = JSON.parse(sessionData);
            return new Date() < new Date(session.expiresAt);
        } catch (e) {
            console.error('Session verification failed:', e);
            return false;
        }
    }

    function getCurrentUser() {
        try {
            const userData = localStorage.getItem(USER_KEY);
            return userData ? JSON.parse(userData) : null;
        } catch (e) {
            console.error('Failed to get current user:', e);
            return null;
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

    function handleLogout() {
        try {
            showLogoutLoading();
            setTimeout(() => {
                clearAuthData();
                window.location.href = 'index.html';
            }, 800);
        } catch (e) {
            console.error('Logout failed:', e);
            window.location.href = 'index.html';
        }
    }

    function showLogoutLoading() {
        try {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'logout-loading';
            loadingDiv.innerHTML = `
                <div class="logout-spinner"></div>
                <p>Securing admin session...</p>
            `;
            document.body.appendChild(loadingDiv);
        } catch (e) {
            console.error('Failed to show logout loading:', e);
        }
    }

    function showModal(title, message, type = 'info') {
        try {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay active';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>${title}</h3>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } catch (e) {
            console.error('Modal creation failed:', e);
            alert(`${title}: ${message}`); // Fallback
        }
    }

    // Global functions for HTML onclick handlers
    window.updateAppointmentStatus = function(appointmentId, status) {
        try {
            const appointments = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY)) || [];
            const updatedAppointments = appointments.map(a => {
                if (a.id === appointmentId) {
                    return { ...a, status: status };
                }
                return a;
            });
            
            localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(updatedAppointments));
            
            showModal(
                'Status Updated',
                `Appointment has been ${status} successfully.`,
                'success'
            );
            
            renderAppointmentsTable();
        } catch (e) {
            console.error('Failed to update appointment status:', e);
            showModal(
                'Error',
                'Failed to update appointment. Please try again.',
                'error'
            );
        }
    };

    window.viewAppointmentDetails = function(appointmentId) {
        try {
            const appointments = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY)) || [];
            const appointment = appointments.find(a => a.id === appointmentId);
            
            if (!appointment) {
                throw new Error('Appointment not found');
            }
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay active';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Appointment Details</h3>
                    <div class="appointment-details">
                        <div class="detail-row">
                            <span class="detail-label">Student:</span>
                            <span class="detail-value">${appointment.studentName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Purpose:</span>
                            <span class="detail-value">${formatPurpose(appointment.purpose)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Scheduled:</span>
                            <span class="detail-value">${formatDate(appointment.datetime)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value status-badge ${appointment.status}">${appointment.status}</span>
                        </div>
                        ${appointment.notes ? `
                        <div class="detail-row">
                            <span class="detail-label">Notes:</span>
                            <span class="detail-value">${appointment.notes}</span>
                        </div>
                        ` : ''}
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        } catch (e) {
            console.error('Failed to show appointment details:', e);
            showModal(
                'Error',
                'Failed to load appointment details. Please try again.',
                'error'
            );
        }
    };

    window.deleteUser = function(userId) {
        try {
            if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
            
            const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
            const updatedUsers = users.filter(u => u.id !== userId);
            
            localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
            
            showModal(
                'User Deleted',
                'The user account has been successfully deleted.',
                'success'
            );
            
            renderUsersTable();
        } catch (e) {
            console.error('Failed to delete user:', e);
            showModal(
                'Error',
                'Failed to delete user. Please try again.',
                'error'
            );
        }
    };

    window.viewCaseDetails = function(userId) {
        try {
            const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
            const symptoms = JSON.parse(localStorage.getItem(SYMPTOMS_KEY)) || [];
            const checkIns = JSON.parse(localStorage.getItem(CHECKINS_KEY)) || [];
            
            const user = users.find(u => u.id === userId);
            if (!user) throw new Error('User not found');
            
            const userSymptoms = symptoms.filter(s => s.userId === userId);
            const userCheckIns = checkIns.filter(ci => ci.userId === userId);
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay active';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Case Details: ${user.name}</h3>
                    <div class="case-details">
                        <div class="detail-row">
                            <span class="detail-label">Email:</span>
                            <span class="detail-value">${user.email}</span>
                        </div>
                        
                        <h4>Symptoms Reported</h4>
                        ${userSymptoms.length ? `
                            <div class="symptoms-list">
                                ${userSymptoms.map(symptom => `
                                    <div class="symptom-report">
                                        <div class="report-date">${formatDate(symptom.date)}</div>
                                        <div class="symptoms">
                                            ${symptom.fever ? '<span class="badge badge-danger">Fever</span>' : ''}
                                            ${symptom.cough ? '<span class="badge badge-danger">Cough</span>' : ''}
                                            ${symptom.breath ? '<span class="badge badge-danger">Shortness of Breath</span>' : ''}
                                            ${symptom.fatigue ? '<span class="badge badge-warning">Fatigue</span>' : ''}
                                            ${symptom.ache ? '<span class="badge badge-warning">Muscle Aches</span>' : ''}
                                            ${symptom.taste ? '<span class="badge badge-danger">Loss of Taste/Smell</span>' : ''}
                                        </div>
                                        ${symptom.notes ? `
                                        <div class="notes">
                                            <strong>Notes:</strong> ${symptom.notes}
                                        </div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="text-muted">No symptoms reported</p>'}
                        
                        <h4>Recent Locations</h4>
                        ${userCheckIns.length ? `
                            <div class="location-history">
                                ${userCheckIns.slice(0, 5).map(checkIn => `
                                    <div class="location-item">
                                        <div class="location-info">
                                            <h5>${checkIn.location}</h5>
                                            <p>${formatDate(checkIn.timestamp)} • ${checkIn.duration} mins</p>
                                        </div>
                                        <div class="location-meta">
                                            <span class="badge ${checkIn.type === 'qr' ? 'badge-primary' : 'badge-secondary'}">
                                                ${checkIn.type === 'qr' ? 'QR Check-in' : 'Bluetooth'}
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="text-muted">No location history</p>'}
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        } catch (e) {
            console.error('Failed to show case details:', e);
            showModal(
                'Error',
                'Failed to load case details. Please try again.',
                'error'
            );
        }
    };

    window.initiateContactTrace = function(userId) {
        try {
            const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
            const checkIns = JSON.parse(localStorage.getItem(CHECKINS_KEY)) || [];
            
            const user = users.find(u => u.id === userId);
            if (!user) throw new Error('User not found');
            
            // Get all locations the user visited in the last 14 days
            const userLocations = checkIns
                .filter(ci => ci.userId === userId && new Date(ci.timestamp) > new Date(Date.now() - 1209600000))
                .map(ci => ci.location);
            
            // Find other users who visited the same locations
            const exposedUsers = new Set();
            checkIns.forEach(ci => {
                if (userLocations.includes(ci.location) && ci.userId !== userId) {
                    exposedUsers.add(ci.userId);
                }
            });
            
            showModal(
                'Contact Trace Initiated',
                `Found ${exposedUsers.size} potential exposures for ${user.name}.`,
                'success'
            );
        } catch (e) {
            console.error('Contact trace failed:', e);
            showModal(
                'Error',
                'Failed to initiate contact trace. Please try again.',
                'error'
            );
        }
    };
});