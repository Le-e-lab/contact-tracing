document.addEventListener('DOMContentLoaded', function() {
    // Constants
    const SESSION_KEY = 'ct_session_v1';
    const USER_KEY = 'ct_user_v1';
    const CHECKINS_KEY = 'ct_checkins_v1';
    const APPOINTMENTS_KEY = 'ct_appointments_v1';
    const SYMPTOMS_KEY = 'ct_symptoms_v1';
    let currentUser = null;

    // Sample locations for QR simulation
    const SAMPLE_LOCATIONS = [
        "Main Library", 
        "Science Building", 
        "Student Center", 
        "Dining Hall", 
        "Gymnasium"
    ];

    try {
        // Verify authentication
        if (!verifySession()) {
            window.location.href = 'index.html';
            return;
        }

        // Get current user
        currentUser = getCurrentUser();
        if (!currentUser || currentUser.role !== 'student') {
            clearAuthData();
            window.location.href = 'index.html';
            return;
        }

        // Initialize
        setupEventListeners();
        initializeSampleData();
        loadDashboardData(currentUser);

    } catch (error) {
        console.error('Student dashboard initialization failed:', error);
        clearAuthData();
        window.location.href = 'index.html';
    }

    function initializeSampleData() {
        try {
            // Initialize check-ins if empty
            if (!localStorage.getItem(CHECKINS_KEY)) {
                const sampleCheckins = [
                    {
                        id: 'checkin_1',
                        userId: currentUser.id,
                        location: "Main Library",
                        timestamp: new Date(Date.now() - 86400000).toISOString(),
                        type: 'qr',
                        duration: 45
                    },
                    {
                        id: 'checkin_2',
                        userId: currentUser.id,
                        location: "Dining Hall",
                        timestamp: new Date(Date.now() - 43200000).toISOString(),
                        type: 'qr',
                        duration: 30
                    }
                ];
                localStorage.setItem(CHECKINS_KEY, JSON.stringify(sampleCheckins));
            }

            // Initialize appointments if empty
            if (!localStorage.getItem(APPOINTMENTS_KEY)) {
                const sampleAppointments = [
                    {
                        id: 'appt_1',
                        studentId: currentUser.id,
                        studentName: currentUser.name,
                        purpose: 'covid_test',
                        datetime: new Date(Date.now() + 86400000).toISOString(),
                        status: 'confirmed',
                        notes: 'Routine COVID-19 test',
                        createdAt: new Date(Date.now() - 172800000).toISOString()
                    },
                    {
                        id: 'appt_2',
                        studentId: currentUser.id,
                        studentName: currentUser.name,
                        purpose: 'consultation',
                        datetime: new Date(Date.now() + 259200000).toISOString(),
                        status: 'pending',
                        notes: 'General health consultation',
                        createdAt: new Date(Date.now() - 86400000).toISOString()
                    }
                ];
                localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(sampleAppointments));
            }

            // Initialize symptoms if empty
            if (!localStorage.getItem(SYMPTOMS_KEY)) {
                localStorage.setItem(SYMPTOMS_KEY, JSON.stringify([]));
            }
        } catch (e) {
            console.error('Sample data initialization failed:', e);
        }
    }

    function setupEventListeners() {
        try {
            document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
            document.getElementById('scanQRBtn')?.addEventListener('click', simulateQRScan);
            document.getElementById('reportSymptomsBtn')?.addEventListener('click', showSymptomForm);
            document.getElementById('bookAppointmentBtn')?.addEventListener('click', showAppointmentForm);
            document.getElementById('viewHistoryBtn')?.addEventListener('click', showHistory);
            document.getElementById('symptomForm')?.addEventListener('submit', handleSymptomReport);
            
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
            document.getElementById('lastSync').textContent = new Date().toLocaleString();

            // Load check-in history
            const checkIns = getCheckIns().filter(ci => ci.userId === user.id);
            renderLocationTimeline(checkIns.slice(0, 5));
            
            // Load other data
            renderStatusCards();
            renderQuickActions();
            
        } catch (e) {
            console.error('Failed to load dashboard data:', e);
        }
    }

    function simulateQRScan() {
        try {
            // Simulate scanning a random location
            const randomLocation = SAMPLE_LOCATIONS[Math.floor(Math.random() * SAMPLE_LOCATIONS.length)];
            
            const checkIns = getCheckIns();
            const newCheckIn = {
                id: 'checkin_' + Date.now(),
                userId: currentUser.id,
                location: randomLocation,
                timestamp: new Date().toISOString(),
                type: 'qr',
                duration: Math.floor(Math.random() * 60) + 15 // 15-75 minutes
            };
            
            saveCheckIns([...checkIns, newCheckIn]);
            
            // Show success message
            showModal(
                'Check-in Successful',
                `You have been checked in at ${randomLocation} for ${newCheckIn.duration} minutes.`,
                'success'
            );
            
            loadDashboardData(currentUser);
        } catch (e) {
            console.error('QR check-in failed:', e);
            showModal(
                'Check-in Failed',
                'Unable to complete check-in. Please try again.',
                'error'
            );
        }
    }

    function showAppointmentForm() {
        try {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay active';
            modal.innerHTML = `
                <div class="modal-content">
                    <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                    <h3>Book Appointment</h3>
                    <form id="appointmentForm">
                        <div class="form-group">
                            <label>Purpose</label>
                            <select name="purpose" required>
                                <option value="">Select purpose</option>
                                <option value="covid_test">COVID-19 Test</option>
                                <option value="vaccination">Vaccination</option>
                                <option value="consultation">Health Consultation</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Date & Time</label>
                            <input type="datetime-local" name="datetime" required min="${new Date().toISOString().slice(0, 16)}">
                        </div>
                        <div class="form-group">
                            <label>Additional Notes</label>
                            <textarea name="notes" rows="3"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Book Appointment</button>
                        </div>
                    </form>
                </div>
            `;
            
            modal.querySelector('#appointmentForm').addEventListener('submit', (e) => {
                e.preventDefault();
                handleAppointmentSubmission(new FormData(e.target));
                modal.remove();
            });
            
            document.body.appendChild(modal);
        } catch (e) {
            console.error('Appointment form failed:', e);
            showModal(
                'Error',
                'Failed to load appointment form. Please try again.',
                'error'
            );
        }
    }

    function handleAppointmentSubmission(formData) {
        try {
            const appointments = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY)) || [];
            const newAppointment = {
                id: 'appt_' + Date.now(),
                studentId: currentUser.id,
                studentName: currentUser.name,
                purpose: formData.get('purpose'),
                datetime: formData.get('datetime'),
                notes: formData.get('notes'),
                status: 'pending',
                createdAt: new Date().toISOString()
            };
            
            if (!newAppointment.purpose || !newAppointment.datetime) {
                throw new Error('Required fields missing');
            }
            
            localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify([...appointments, newAppointment]));
            
            // Show success message
            showModal(
                'Appointment Booked',
                `Your ${formatPurpose(newAppointment.purpose)} appointment has been scheduled.`,
                'success'
            );
            
            // Refresh appointments display
            if (document.getElementById('appointments')?.classList.contains('active')) {
                showAppointments();
            }
        } catch (e) {
            console.error('Appointment submission failed:', e);
            showModal(
                'Booking Failed',
                'Unable to book appointment. Please try again.',
                'error'
            );
        }
    }

    function showHistory() {
        try {
            const section = document.getElementById('locations');
            if (!section) return;
            
            const checkIns = getCheckIns().filter(ci => ci.userId === currentUser.id);
            
            section.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2>My Location History</h2>
                        <div class="date-filter">
                            <select id="locationFilter">
                                <option>Last 7 days</option>
                                <option>Last 30 days</option>
                                <option>All time</option>
                            </select>
                        </div>
                    </div>
                    <div class="card-body">
                        ${checkIns.length ? `
                            <div class="location-history">
                                ${checkIns.map(checkIn => `
                                    <div class="location-item">
                                        <div class="location-info">
                                            <h4>${checkIn.location}</h4>
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
                        ` : '<p class="text-muted">No location history found</p>'}
                    </div>
                </div>
            `;
            
            // Add filter functionality
            document.getElementById('locationFilter')?.addEventListener('change', function() {
                // In a real app, this would filter the check-ins by date
                showModal(
                    'Filter Applied',
                    `Now showing location history for ${this.value}`,
                    'info'
                );
            });
            
        } catch (e) {
            console.error('History load failed:', e);
            document.getElementById('locations').innerHTML = '<p class="text-error">Failed to load history</p>';
        }
    }

    function showAppointments() {
        try {
            const section = document.getElementById('appointments');
            if (!section) return;
            
            const appointments = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY)) || [];
            const userAppointments = appointments.filter(a => a.studentId === currentUser.id);
            
            section.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2>My Appointments</h2>
                        <button id="newAppointmentBtn" class="btn btn-primary">+ New Appointment</button>
                    </div>
                    <div class="card-body">
                        ${userAppointments.length ? `
                            <div class="appointments-list">
                                ${userAppointments.map(appt => `
                                    <div class="appointment-item ${appt.status}">
                                        <div class="appointment-time">
                                            <div class="date">${formatDate(appt.datetime).split(' ')[0]}</div>
                                            <div class="time">${formatDate(appt.datetime).split(' ')[1]}</div>
                                        </div>
                                        <div class="appointment-details">
                                            <h4>${formatPurpose(appt.purpose)}</h4>
                                            ${appt.notes ? `<p class="notes">${appt.notes}</p>` : ''}
                                        </div>
                                        <div class="appointment-status">
                                            <span class="status-badge ${appt.status}">${appt.status}</span>
                                        </div>
                                        <div class="appointment-actions">
                                            <button class="btn btn-sm btn-outline" onclick="viewAppointmentDetails('${appt.id}')">Details</button>
                                            ${appt.status === 'pending' ? `
                                                <button class="btn btn-sm btn-danger" onclick="cancelAppointment('${appt.id}')">Cancel</button>
                                            ` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="text-muted">No appointments found</p>'}
                    </div>
                </div>
            `;
            
            // Reattach event listener for new appointment button
            document.getElementById('newAppointmentBtn')?.addEventListener('click', showAppointmentForm);
            
        } catch (e) {
            console.error('Appointments load failed:', e);
            document.getElementById('appointments').innerHTML = '<p class="text-error">Failed to load appointments</p>';
        }
    }

    function showSymptomForm() {
        try {
            const section = document.getElementById('symptoms');
            if (!section) return;
            
            section.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h2>Symptom Check</h2>
                    </div>
                    <div class="card-body">
                        <form id="symptomForm">
                            <div class="form-group">
                                <label>Select Symptoms</label>
                                <div class="symptoms-checklist">
                                    <label><input type="checkbox" name="fever"> Fever</label>
                                    <label><input type="checkbox" name="cough"> Cough</label>
                                    <label><input type="checkbox" name="breath"> Shortness of Breath</label>
                                    <label><input type="checkbox" name="fatigue"> Fatigue</label>
                                    <label><input type="checkbox" name="ache"> Muscle Aches</label>
                                    <label><input type="checkbox" name="taste"> Loss of Taste/Smell</label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Additional Notes</label>
                                <textarea name="notes" rows="3" placeholder="Describe your symptoms..."></textarea>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Submit Report</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            // Reattach event listener
            document.getElementById('symptomForm')?.addEventListener('submit', handleSymptomReport);
        } catch (e) {
            console.error('Failed to show symptom form:', e);
            document.getElementById('symptoms').innerHTML = '<p class="text-error">Failed to load symptom form</p>';
        }
    }

    function handleSymptomReport(e) {
        e.preventDefault();
        try {
            const formData = new FormData(e.target);
            const symptoms = {
                fever: formData.get('fever') === 'on',
                cough: formData.get('cough') === 'on',
                breath: formData.get('breath') === 'on',
                fatigue: formData.get('fatigue') === 'on',
                ache: formData.get('ache') === 'on',
                taste: formData.get('taste') === 'on',
                notes: formData.get('notes'),
                date: new Date().toISOString(),
                userId: currentUser.id
            };
            
            const symptomReports = JSON.parse(localStorage.getItem(SYMPTOMS_KEY)) || [];
            localStorage.setItem(SYMPTOMS_KEY, JSON.stringify([...symptomReports, symptoms]));
            
            showModal(
                'Report Submitted',
                'Your symptom report has been submitted successfully.',
                'success'
            );
            
            // Update status card
            renderStatusCards();
        } catch (e) {
            console.error('Symptom report failed:', e);
            showModal(
                'Submission Failed',
                'Failed to submit symptom report. Please try again.',
                'error'
            );
        }
    }

    function renderLocationTimeline(checkIns) {
        try {
            const timeline = document.getElementById('locationTimeline');
            if (!timeline) return;
            
            timeline.innerHTML = checkIns.map(checkIn => `
                <div class="timeline-item">
                    <div class="timeline-marker ${checkIn.type}"></div>
                    <div class="timeline-content">
                        <h4>${checkIn.location}</h4>
                        <p>${formatDate(checkIn.timestamp)} • ${checkIn.duration} mins</p>
                        <span class="badge ${checkIn.type === 'qr' ? 'badge-primary' : 'badge-success'}">
                            ${checkIn.type === 'qr' ? 'QR Check-in' : 'Bluetooth'}
                        </span>
                    </div>
                </div>
            `).join('') || '<p class="text-muted">No recent check-ins found</p>';
        } catch (e) {
            console.error('Failed to render timeline:', e);
        }
    }

    function renderStatusCards() {
        try {
            const symptomReports = JSON.parse(localStorage.getItem(SYMPTOMS_KEY)) || [];
            const userSymptoms = symptomReports.filter(s => s.userId === currentUser.id);
            const hasRecentSymptoms = userSymptoms.some(s => new Date(s.date) > new Date(Date.now() - 604800000));
            
            const statusCard = document.querySelector('.status-card');
            if (statusCard) {
                if (hasRecentSymptoms) {
                    statusCard.className = 'status-card yellow';
                    statusCard.querySelector('.status-value').textContent = 'Potential symptoms reported';
                    statusCard.querySelector('.last-checked').textContent = 'Last updated: ' + new Date().toLocaleString();
                } else {
                    statusCard.className = 'status-card green';
                    statusCard.querySelector('.status-value').textContent = 'No known exposures';
                    statusCard.querySelector('.last-checked').textContent = 'Last updated: ' + new Date().toLocaleString();
                }
            }
        } catch (e) {
            console.error('Failed to render status cards:', e);
        }
    }

    function renderQuickActions() {
        try {
            // These would be populated with real data in a complete app
        } catch (e) {
            console.error('Failed to render quick actions:', e);
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
                    if (targetId === 'locations') {
                        showHistory();
                    } else if (targetId === 'appointments') {
                        showAppointments();
                    } else if (targetId === 'symptoms') {
                        showSymptomForm();
                    }
                }
            });
        } catch (e) {
            console.error('Navigation failed:', e);
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

    function getCheckIns() {
        try {
            return JSON.parse(localStorage.getItem(CHECKINS_KEY)) || [];
        } catch (e) {
            console.error('Failed to get check-ins:', e);
            return [];
        }
    }

    function saveCheckIns(checkIns) {
        try {
            localStorage.setItem(CHECKINS_KEY, JSON.stringify(checkIns));
        } catch (e) {
            console.error('Failed to save check-ins:', e);
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
                <p>Logging out securely...</p>
            `;
            document.body.appendChild(loadingDiv);
        } catch (e) {
            console.error('Failed to show logout loading:', e);
        }
    }

    // Make functions available globally for HTML onclick handlers
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

    window.cancelAppointment = function(appointmentId) {
        try {
            if (!confirm('Are you sure you want to cancel this appointment?')) return;
            
            const appointments = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY)) || [];
            const updatedAppointments = appointments.map(a => {
                if (a.id === appointmentId) {
                    return { ...a, status: 'cancelled' };
                }
                return a;
            });
            
            localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(updatedAppointments));
            
            // Show success message
            showModal(
                'Appointment Cancelled',
                'Your appointment has been cancelled successfully.',
                'success'
            );
            
            // Refresh appointments display
            if (document.getElementById('appointments')?.classList.contains('active')) {
                showAppointments();
            }
        } catch (e) {
            console.error('Failed to cancel appointment:', e);
            showModal(
                'Cancellation Failed',
                'Unable to cancel appointment. Please try again.',
                'error'
            );
        }
    };
});