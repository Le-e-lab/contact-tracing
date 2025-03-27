<section id="dashboard" class="content-section active">
<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-icon danger">
            <i>🦠</i>
        </div>
        <div class="stat-value" id="activeCases">0</div>
        <div class="stat-label">Active Cases</div>
    </div>
    <div class="stat-card">
        <div class="stat-icon warning">
            <i>⚠️</i>
        </div>
        <div class="stat-value" id="potentialExposures">0</div>
        <div class="stat-label">Potential Exposures</div>
    </div>
    <div class="stat-card">
        <div class="stat-icon primary">
            <i>🏥</i>
        </div>
        <div class="stat-value" id="todaysAppointments">0</div>
        <div class="stat-label">Today's Appointments</div>
    </div>
    <div class="stat-card">
        <div class="stat-icon secondary">
            <i>⏳</i>
        </div>
        <div class="stat-value" id="pendingAppointments">0</div>
        <div class="stat-label">Pending Appointments</div>
    </div>
</div>

<div class="admin-grid">
    <div class="recent-cases card">
        <div class="card-header">
            <h3>Recent Positive Cases</h3>
            <button class="btn btn-sm btn-primary">View All</button>
        </div>
        <div class="card-body">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Date</th>
                        <th>Exposures</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="recentCasesTable">
                    <!-- Filled by JavaScript -->
                </tbody>
            </table>
        </div>
    </div>
    
    <div class="heatmap-card card">
        <div class="card-header">
            <h3>High Risk Locations</h3>
        </div>
        <div class="card-body">
            <div class="heatmap-grid" id="heatmapGrid">
                <!-- Filled by JavaScript -->
            </div>
        </div>
    </div>
</div>

<div class="appointments-card card">
    <div class="card-header">
        <h3>Recent Appointments</h3>
        <select id="appointmentStatusFilter">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
        </select>
    </div>
    <div class="card-body">
        <table class="data-table">
            <thead>
                <tr>
                    <th>Student</th>
                    <th>Date/Time</th>
                    <th>Purpose</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="adminAppointmentsTable">
                <!-- Filled by JavaScript -->
            </tbody>
        </table>
    </div>
</div>
</section>
