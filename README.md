# 🏍️ HERORIDE — Personal Vehicle & Bike Maintenance Dashboard

A modern, responsive, all-in-one personal bike maintenance dashboard built with vanilla **HTML5**, **CSS3**, and **JavaScript**.

---

## 🎯 Purpose & Core Problem Solved

> **The Problem**: Bike owners often forget their service dates, insurance renewal, pollution certificate (PUC), oil changes, and maintenance, and don't have all this critical information organized in one place.

> **The Solution**: **HERORIDE** brings all vehicle telemetry, health scores, live expiry countdowns, interactive calculators, and service logs together into a single, intuitive dashboard.

---

## 🌟 Dashboard Features

### 1. Live Vehicle Telemetry Card
- **My Vehicle**: Hero Xtreme (`Hero Xtreme 160R` — `MH-12-AB-4509`)
- **Vehicle Health Score**: `92% 🟢` (Dynamic health meter)
- **Next Service**: `1,250 KM remaining` (with automated milestone calculation)
- **Fuel Efficiency**: `52 KM/L`
- **Total Distance**: `18,450 KM` (with quick one-click odometer updater)
- **Direct Action**: `[ Book Service ]` button

### 2. Maintenance Status Checklist
- ✓ **Engine Oil** (*Changed at 16,500 KM*)
- ✓ **Brake Check** (*Pads at 75% life*)
- ⚠ **Tyre Replacement** (*Attention: Rear tyre tread low*)
- ✓ **Battery** (*12.6V Optimal voltage*)
- ✓ **Chain Lubrication** (*Cleaned & Lubed 250 KM ago*)
- ✓ **Air Filter** (*Inspected clean*)

### 3. Expiry Countdowns & Compliance Tracker
- **Insurance Expiry Countdown**: Real-time live countdown timer (Days, Hours, Minutes) with direct policy renewal link.
- **PUC (Pollution Certificate) Countdown**: Live countdown clock alerting you before expiration.
- **24/7 Roadside Assistance**: Emergency breakdown helpline link.

### 4. Interactive Calculators & Tools
- **Fuel & Mileage Calculator**: Real-time calculation of Mileage (`KM/L`) and Running Cost (`₹/KM`).
- **Maintenance Cost Estimator**: Interactive checkbox estimator for engine oil, filters, chain lube, brake pads, and labor.

### 5. Service Booking Simulation & History
- **Book Service Modal**: Schedule service at authorized workshops, select packages, choose pickup/drop, and generate an instant **Service Booking Pass** with token ID (e.g. `#HERO-84920`).
- **Service History Log**: Full historical record table with date, odometer, workshop, work done, cost, and status.
- **Log Past Service**: Record previous bills directly into your vehicle log.

### 6. Multi-Vehicle Garage Support
- Pre-loaded with Hero Xtreme and Yamaha FZ-S.
- One-click **+ Add Vehicle** to track multiple bikes in your garage.
- Full `localStorage` persistence.

---

## 📁 File Structure

```
My Website/
├── index.html              # Complete vehicle dashboard HTML5 markup
├── css/
│   └── style.css           # Automotive dashboard design system & themes
├── js/
│   └── script.js           # Telemetry engine, calculations, countdowns & storage
├── images/
│   ├── favicon.svg         # Modern bike code favicon
│   ├── project-bikecare.svg # Dashboard vector preview
│   └── hero-tech.svg       # Telemetry visual graphic
└── README.md               # Documentation
```

---

## 🚀 How to Run Locally

Double-click `index.html` to open it in any browser, or run a local Python server:

```powershell
python -m http.server 8000
```
Then visit `http://localhost:8000`.
