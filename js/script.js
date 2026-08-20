/**
 * ==========================================================================
 * HERORIDE & BIKECARE — VEHICLE DASHBOARD JAVASCRIPT ENGINE
 * Comprehensive Telemetry, Service Tracking, Countdowns & Calculators
 * ==========================================================================
 */

'use strict';

// --- Default Initial Vehicle State ---
const DEFAULT_VEHICLES = [
  {
    id: 'hero-xtreme',
    name: 'Hero Xtreme 160R',
    regNo: 'MH-12-AB-4509',
    totalDistance: 18450,
    fuelEfficiency: 52,
    serviceIntervalKm: 3000,
    lastServiceKm: 16500,
    nextServiceKm: 19700, // 18450 + 1250 = 19700 -> 1,250 KM remaining
    insuranceExpiry: '2026-09-10T00:00:00', // ~25 days from now
    pucExpiry: '2026-08-28T00:00:00',       // ~12 days from now
    healthScore: 92,
    checklist: [
      { name: 'Engine Oil', status: 'ok', detail: 'Changed at 16,500 KM' },
      { name: 'Brake Check', status: 'ok', detail: 'Pads at 75% life' },
      { name: 'Tyre Replacement', status: 'warn', detail: 'Rear tyre tread low (due at 19,000 KM)' },
      { name: 'Battery', status: 'ok', detail: '12.6V Optimal voltage' },
      { name: 'Chain Lubrication', status: 'ok', detail: 'Cleaned & Lubed 250 KM ago' },
      { name: 'Air Filter', status: 'ok', detail: 'Inspected clean' }
    ],
    serviceHistory: [
      { id: 'SRV-101', date: '2026-06-15', odometer: '16,500 KM', center: 'Hero MotoCorp Authorized Hub', work: 'Periodic 5th Service, Oil & Filter Change', cost: '₹1,450', status: 'Completed' },
      { id: 'SRV-100', date: '2026-03-10', odometer: '13,200 KM', center: 'Speedy Bike Care', work: 'Brake Pad Replacement & Chain Tightening', cost: '₹850', status: 'Completed' },
      { id: 'SRV-099', date: '2025-11-20', odometer: '10,000 KM', center: 'Hero MotoCorp Authorized Hub', work: 'General Overhaul & Spark Plug Cleaning', cost: '₹1,200', status: 'Completed' }
    ]
  },
  {
    id: 'yamaha-fzs',
    name: 'Yamaha FZ-S V3',
    regNo: 'DL-04-CX-8812',
    totalDistance: 24200,
    fuelEfficiency: 46,
    serviceIntervalKm: 4000,
    lastServiceKm: 21000,
    nextServiceKm: 25000,
    insuranceExpiry: '2026-11-15T00:00:00',
    pucExpiry: '2026-10-05T00:00:00',
    healthScore: 88,
    checklist: [
      { name: 'Engine Oil', status: 'ok', detail: 'Motul 7100 10W40' },
      { name: 'Brake Check', status: 'ok', detail: 'Brake fluid flushed' },
      { name: 'Tyre Replacement', status: 'ok', detail: 'MRF Zapper (Good)' },
      { name: 'Battery', status: 'warn', detail: '3 Years old - check recharge' }
    ],
    serviceHistory: [
      { id: 'SRV-201', date: '2026-05-02', odometer: '21,000 KM', center: 'Yamaha Blue Square Care', work: 'Regular Oil & Spark Service', cost: '₹1,600', status: 'Completed' }
    ]
  }
];

// --- App State Store ---
const AppState = {
  vehicles: [],
  activeVehicleId: 'hero-xtreme',

  init() {
    const saved = localStorage.getItem('heroride_vehicles_store');
    if (saved) {
      try {
        this.vehicles = JSON.parse(saved);
      } catch (e) {
        this.vehicles = DEFAULT_VEHICLES;
      }
    } else {
      this.vehicles = DEFAULT_VEHICLES;
      this.save();
    }

    const savedActiveId = localStorage.getItem('heroride_active_vehicle_id');
    if (savedActiveId && this.vehicles.some(v => v.id === savedActiveId)) {
      this.activeVehicleId = savedActiveId;
    } else {
      this.activeVehicleId = this.vehicles[0].id;
    }
  },

  getActiveVehicle() {
    return this.vehicles.find(v => v.id === this.activeVehicleId) || this.vehicles[0];
  },

  setActiveVehicle(id) {
    this.activeVehicleId = id;
    localStorage.setItem('heroride_active_vehicle_id', id);
    DashboardView.renderAll();
  },

  addVehicle(newVehicle) {
    this.vehicles.push(newVehicle);
    this.activeVehicleId = newVehicle.id;
    this.save();
    DashboardView.renderAll();
    Toast.show(`Added ${newVehicle.name} to your garage!`);
  },

  save() {
    localStorage.setItem('heroride_vehicles_store', JSON.stringify(this.vehicles));
  }
};

// --- Toast System ---
const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-notice');
  },

  show(message, duration = 3000) {
    if (!this.container) return;
    this.container.textContent = message;
    this.container.classList.add('show');
    setTimeout(() => {
      this.container.classList.remove('show');
    }, duration);
  }
};

// --- Main Dashboard Renderer ---
const DashboardView = {
  init() {
    this.bindEvents();
    this.renderAll();
    this.startCountdownTimer();
  },

  bindEvents() {
    // Vehicle selector change
    const selector = document.getElementById('vehicle-switcher');
    if (selector) {
      selector.addEventListener('change', (e) => {
        if (e.target.value === '__add_new__') {
          ModalManager.open('add-bike-modal');
          selector.value = AppState.activeVehicleId; // reset select value
        } else {
          AppState.setActiveVehicle(e.target.value);
        }
      });
    }

    // Quick Odometer Update Button
    const updateOdoBtn = document.getElementById('update-odometer-btn');
    if (updateOdoBtn) {
      updateOdoBtn.addEventListener('click', () => {
        const vehicle = AppState.getActiveVehicle();
        const input = prompt(`Update Current Odometer for ${vehicle.name} (in KM):`, vehicle.totalDistance);
        if (input !== null) {
          const newOdo = parseInt(input.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(newOdo) && newOdo >= vehicle.totalDistance) {
            vehicle.totalDistance = newOdo;
            AppState.save();
            this.renderAll();
            Toast.show(`Odometer updated to ${newOdo.toLocaleString()} KM!`);
          } else if (newOdo < vehicle.totalDistance) {
            alert('New odometer reading cannot be less than current reading.');
          }
        }
      });
    }
  },

  renderAll() {
    const v = AppState.getActiveVehicle();
    if (!v) return;

    // 1. Render Selector Options
    const selector = document.getElementById('vehicle-switcher');
    if (selector) {
      selector.innerHTML = AppState.vehicles.map(bike => 
        `<option value="${bike.id}" ${bike.id === v.id ? 'selected' : ''}>🏍️ ${bike.name}</option>`
      ).join('') + `<option value="__add_new__">+ Add New Vehicle...</option>`;
    }

    // 2. Telemetry Header
    document.getElementById('display-bike-name').textContent = v.name;
    document.getElementById('display-bike-reg').textContent = v.regNo;

    // 3. Telemetry 4 Core Metrics
    // A. Vehicle Health
    document.getElementById('metric-health-val').textContent = `${v.healthScore}% 🟢`;
    
    // B. Next Service
    const remainingServiceKm = Math.max(0, v.nextServiceKm - v.totalDistance);
    document.getElementById('metric-service-val').textContent = `${remainingServiceKm.toLocaleString()} KM`;
    document.getElementById('metric-service-meta').textContent = remainingServiceKm <= 500 ? '⚠ Service due soon!' : 'Remaining until next check';

    // C. Fuel Efficiency
    document.getElementById('metric-mileage-val').textContent = `${v.fuelEfficiency} KM/L`;
    
    // D. Total Distance
    document.getElementById('metric-distance-val').textContent = `${v.totalDistance.toLocaleString()} KM`;

    // 4. Render Checklist
    const checklistContainer = document.getElementById('maintenance-checklist-list');
    if (checklistContainer) {
      checklistContainer.innerHTML = v.checklist.map(item => `
        <div class="checklist-item">
          <div class="checklist-left">
            <div class="check-badge ${item.status === 'ok' ? 'ok' : 'warn'}">
              ${item.status === 'ok' ? '✓' : '⚠'}
            </div>
            <div class="checklist-info">
              <h5>${item.name}</h5>
              <p>${item.detail}</p>
            </div>
          </div>
          <span class="checklist-status-pill ${item.status === 'ok' ? 'ok' : 'warn'}">
            ${item.status === 'ok' ? 'Good' : 'Attention'}
          </span>
        </div>
      `).join('');
    }

    // 5. Render Service History Table
    const tableBody = document.getElementById('service-history-tbody');
    if (tableBody) {
      if (v.serviceHistory && v.serviceHistory.length > 0) {
        tableBody.innerHTML = v.serviceHistory.map(row => `
          <tr>
            <td><strong>${row.date}</strong></td>
            <td>${row.odometer}</td>
            <td>${row.center}</td>
            <td>${row.work}</td>
            <td class="cost-cell">${row.cost}</td>
            <td><span class="status-tag">${row.status}</span></td>
          </tr>
        `).join('');
      } else {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 1.5rem; color:var(--text-muted);">No service records logged yet.</td></tr>`;
      }
    }

    // 6. Update Static Expiry Subtitles
    const insDate = new Date(v.insuranceExpiry);
    const pucDate = new Date(v.pucExpiry);
    document.getElementById('ins-expiry-date').textContent = `Expires on ${insDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    document.getElementById('puc-expiry-date').textContent = `Expires on ${pucDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  },

  startCountdownTimer() {
    const updateCountdowns = () => {
      const v = AppState.getActiveVehicle();
      if (!v) return;

      const now = new Date().getTime();

      // Insurance Countdown
      const insTarget = new Date(v.insuranceExpiry).getTime();
      const insDiff = insTarget - now;
      const insClockEl = document.getElementById('ins-countdown-clock');
      if (insClockEl) {
        if (insDiff > 0) {
          const days = Math.floor(insDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((insDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((insDiff % (1000 * 60 * 60)) / (1000 * 60));
          insClockEl.textContent = `${days}d ${hours}h ${mins}m`;
        } else {
          insClockEl.textContent = 'EXPIRED - RENEW NOW';
          insClockEl.style.color = 'var(--health-danger)';
        }
      }

      // PUC Countdown
      const pucTarget = new Date(v.pucExpiry).getTime();
      const pucDiff = pucTarget - now;
      const pucClockEl = document.getElementById('puc-countdown-clock');
      if (pucClockEl) {
        if (pucDiff > 0) {
          const days = Math.floor(pucDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((pucDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((pucDiff % (1000 * 60 * 60)) / (1000 * 60));
          pucClockEl.textContent = `${days}d ${hours}h ${mins}m`;
        } else {
          pucClockEl.textContent = 'EXPIRED - RENEW NOW';
          pucClockEl.style.color = 'var(--health-danger)';
        }
      }
    };

    updateCountdowns();
    setInterval(updateCountdowns, 60000); // update every minute
  }
};

// --- Calculators Manager ---
const CalculatorsManager = {
  init() {
    this.initMileageCalculator();
    this.initCostCalculator();
  },

  initMileageCalculator() {
    const distInput = document.getElementById('calc-trip-distance');
    const fuelInput = document.getElementById('calc-fuel-liters');
    const priceInput = document.getElementById('calc-fuel-price');

    const compute = () => {
      const dist = parseFloat(distInput.value) || 0;
      const fuel = parseFloat(fuelInput.value) || 0;
      const price = parseFloat(priceInput.value) || 100;

      if (dist > 0 && fuel > 0) {
        const mileage = (dist / fuel).toFixed(1);
        const costPerKm = ((fuel * price) / dist).toFixed(2);
        
        document.getElementById('res-mileage').textContent = `${mileage} KM/L`;
        document.getElementById('res-cost-per-km').textContent = `₹${costPerKm}/KM`;
      } else {
        document.getElementById('res-mileage').textContent = `-- KM/L`;
        document.getElementById('res-cost-per-km').textContent = `₹-- /KM`;
      }
    };

    if (distInput && fuelInput && priceInput) {
      [distInput, fuelInput, priceInput].forEach(inp => inp.addEventListener('input', compute));
    }
  },

  initCostCalculator() {
    const checkboxes = document.querySelectorAll('.service-estimate-item');
    const totalEl = document.getElementById('estimated-service-cost');

    const calculateEstimate = () => {
      let sum = 0;
      checkboxes.forEach(cb => {
        if (cb.checked) {
          sum += parseInt(cb.dataset.price, 10) || 0;
        }
      });
      if (totalEl) {
        totalEl.textContent = `₹${sum.toLocaleString()}`;
      }
    };

    checkboxes.forEach(cb => cb.addEventListener('change', calculateEstimate));
  }
};

// --- Modals Manager ---
const ModalManager = {
  init() {
    // Close buttons on all modals
    document.querySelectorAll('.modal-close-btn, .btn-modal-cancel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-backdrop');
        if (modal) modal.classList.remove('open');
      });
    });

    // Backdrop click to close
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });
    });

    // Book Service Trigger
    document.querySelectorAll('.trigger-book-service').forEach(btn => {
      btn.addEventListener('click', () => this.open('book-service-modal'));
    });

    // Add Vehicle Trigger
    const addBikeBtn = document.getElementById('trigger-add-bike');
    if (addBikeBtn) {
      addBikeBtn.addEventListener('click', () => this.open('add-bike-modal'));
    }

    // Log Past Service Trigger
    const logServiceBtn = document.getElementById('trigger-log-service');
    if (logServiceBtn) {
      logServiceBtn.addEventListener('click', () => this.open('log-service-modal'));
    }

    this.bindFormSubmissions();
  },

  open(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
      const v = AppState.getActiveVehicle();
      // Pre-fill bike name in service modal
      const bikeField = modal.querySelector('.modal-auto-bike-name');
      if (bikeField && v) bikeField.value = `${v.name} (${v.regNo})`;
    }
  },

  close(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  },

  bindFormSubmissions() {
    // 1. Service Booking Simulation Form
    const bookServiceForm = document.getElementById('book-service-form');
    if (bookServiceForm) {
      bookServiceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const center = document.getElementById('booking-center').value;
        const srvType = document.getElementById('booking-service-type').value;
        const date = document.getElementById('booking-date').value || 'Tomorrow at 10:00 AM';

        // Generate Token
        const token = 'HERO-' + Math.floor(10000 + Math.random() * 90000);
        
        // Show confirmation pass
        const passContainer = document.getElementById('booking-pass-container');
        passContainer.innerHTML = `
          <div class="booking-pass-card">
            <h4 style="color:var(--health-good);">✓ Service Slot Reserved!</h4>
            <div class="booking-token-number">${token}</div>
            <p><strong>Workshop:</strong> ${center}</p>
            <p><strong>Package:</strong> ${srvType}</p>
            <p><strong>Scheduled Time:</strong> ${date}</p>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem;">Present this token at the service desk upon arrival.</p>
          </div>
        `;
        passContainer.style.display = 'block';
        bookServiceForm.style.display = 'none';

        // Also append to history as Scheduled
        const v = AppState.getActiveVehicle();
        v.serviceHistory.unshift({
          id: token,
          date: date.substring(0, 10) || 'Scheduled',
          odometer: `${v.totalDistance.toLocaleString()} KM`,
          center: center,
          work: srvType,
          cost: 'Est. ₹1,200',
          status: 'Scheduled'
        });
        AppState.save();
        DashboardView.renderAll();
        Toast.show(`Service appointment booked with token ${token}!`);
      });
    }

    // 2. Add Vehicle Form
    const addBikeForm = document.getElementById('add-bike-form');
    if (addBikeForm) {
      addBikeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('add-bike-name').value.trim();
        const regNo = document.getElementById('add-bike-reg').value.trim();
        const odo = parseInt(document.getElementById('add-bike-odo').value, 10) || 0;
        const mileage = parseInt(document.getElementById('add-bike-mileage').value, 10) || 45;
        const insDate = document.getElementById('add-bike-ins').value || '2027-01-01';
        const pucDate = document.getElementById('add-bike-puc').value || '2026-12-01';

        const newId = 'bike-' + Date.now();
        const newVehicle = {
          id: newId,
          name: name,
          regNo: regNo,
          totalDistance: odo,
          fuelEfficiency: mileage,
          serviceIntervalKm: 3000,
          lastServiceKm: odo,
          nextServiceKm: odo + 3000,
          insuranceExpiry: `${insDate}T00:00:00`,
          pucExpiry: `${pucDate}T00:00:00`,
          healthScore: 95,
          checklist: [
            { name: 'Engine Oil', status: 'ok', detail: 'Brand new / Optimal' },
            { name: 'Brake Check', status: 'ok', detail: 'Inspected' },
            { name: 'Tyres', status: 'ok', detail: 'Good condition' },
            { name: 'Battery', status: 'ok', detail: 'Charged' }
          ],
          serviceHistory: []
        };

        AppState.addVehicle(newVehicle);
        addBikeForm.reset();
        this.close('add-bike-modal');
      });
    }

    // 3. Log Past Service Form
    const logServiceForm = document.getElementById('log-service-form');
    if (logServiceForm) {
      logServiceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = AppState.getActiveVehicle();
        const date = document.getElementById('log-date').value;
        const odo = document.getElementById('log-odo').value;
        const center = document.getElementById('log-center').value;
        const work = document.getElementById('log-work').value;
        const cost = document.getElementById('log-cost').value;

        v.serviceHistory.unshift({
          id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
          date: date,
          odometer: `${odo} KM`,
          center: center,
          work: work,
          cost: `₹${cost}`,
          status: 'Completed'
        });

        AppState.save();
        DashboardView.renderAll();
        logServiceForm.reset();
        this.close('log-service-modal');
        Toast.show('Service record logged successfully!');
      });
    }
  }
};

// --- Theme Toggle ---
const ThemeManager = {
  themeBtn: document.getElementById('theme-toggle'),
  htmlEl: document.documentElement,

  init() {
    const saved = localStorage.getItem('heroride_theme') || 'light';
    this.apply(saved);

    if (this.themeBtn) {
      this.themeBtn.addEventListener('click', () => {
        const current = this.htmlEl.getAttribute('data-theme') || 'light';
        const target = current === 'dark' ? 'light' : 'dark';
        this.apply(target);
      });
    }
  },

  apply(theme) {
    this.htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem('heroride_theme', theme);
  }
};

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  AppState.init();
  Toast.init();
  ThemeManager.init();
  DashboardView.init();
  CalculatorsManager.init();
  ModalManager.init();
});
