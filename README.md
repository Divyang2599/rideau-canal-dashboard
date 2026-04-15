# Rideau Canal Dashboard

This is the web dashboard for the Rideau Canal Skateway monitoring project.

It shows live safety conditions at 3 locations along the canal. Data comes from Azure Cosmos DB, which is populated every 5 minutes by Azure Stream Analytics.

**Live URL:** https://rideau-canal-dashboard-dl-gxgcfdcjbtd0h5hz.canadacentral-01.azurewebsites.net

---

## What It Shows

- Current safety status (Safe / Caution / Unsafe) for each location
- Average ice thickness, surface temperature, snow accumulation, external temperature
- Number of sensor readings in the last 5-minute window
- Historical trend charts for the last hour (ice thickness and surface temperature)
- Overall system status badge (worst condition across all 3 locations)
- Auto-refreshes every 30 seconds automatically

---

## Technologies Used

- **Node.js + Express** — backend server that talks to Cosmos DB
- **@azure/cosmos** — official Azure SDK to query Cosmos DB
- **Chart.js** — draws the line charts
- **HTML/CSS/JavaScript** — frontend, no frameworks needed
- **Azure App Service** — hosts the app live on the internet
- **GitHub Actions** — automatically deploys when you push to main

---

## Prerequisites

- Node.js 18 or higher
- An Azure Cosmos DB account with data already in it (populated by Stream Analytics)

---

## Installation

```bash
git clone https://github.com/Divyang2599/rideau-canal-dashboard.git
cd rideau-canal-dashboard
npm install
```

---

## Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your real values:

```
COSMOS_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
COSMOS_KEY=your-primary-key
COSMOS_DATABASE=RideauCanalDB
COSMOS_CONTAINER=SensorAggregations
PORT=3000
```

Get these from: Azure Portal → Cosmos DB → Keys.

---

## Running Locally

```bash
node server.js
```

Open your browser at `http://localhost:3000`

---

## API Endpoints

### GET /api/sensors

Returns the latest 5-minute aggregation for all 3 locations.

**Example response:**

```json
{
  "success": true,
  "data": [
    {
      "location": "dows-lake",
      "avgIceThickness": 33.7,
      "avgSurfaceTemperature": -6.5,
      "maxSnowAccumulation": 29.3,
      "avgExternalTemperature": -9.6,
      "readingCount": 30,
      "safetyStatus": "Safe",
      "windowEndTime": "2026-04-10T00:30:00Z"
    }
  ]
}
```

### GET /api/history/:location

Returns all aggregations from the last hour for a specific location.

**Example:** `GET /api/history/dows-lake`

### GET /health

Returns server health status. Used by Azure App Service to check if the app is running.

---

## Deployment to Azure App Service

### Step 1 - Create App Service

- Runtime: Node 20 LTS
- OS: Linux
- Pricing: Free F1

### Step 2 - Set Environment Variables

In App Service → Environment variables, add:

- `COSMOS_ENDPOINT`
- `COSMOS_KEY`
- `COSMOS_DATABASE`
- `COSMOS_CONTAINER`

### Step 3 - Connect GitHub for Auto-Deploy

App Service → Deployment Center → GitHub → select your repo and main branch.

Every time you push to main, GitHub Actions automatically builds and deploys.

---

## Dashboard Features

**3 Location Cards** - one for each sensor location. Each card shows all 5 metrics and a color-coded safety badge.

**Overall Status Badge** - shows the worst condition across all 3 locations. If any one location is Unsafe, the whole system shows Unsafe.

**Auto-Refresh** - fetches new data from the API every 30 seconds without needing a page reload.

**Historical Charts** - two Chart.js line charts showing ice thickness and surface temperature trends over the last hour for all 3 locations.

---

## Troubleshooting

**Dashboard shows -- for all values**  
Either Cosmos DB has no data yet (wait for Stream Analytics to complete a 5-minute window) or the environment variables are wrong.

**Server crashes on startup**  
Check that all 4 environment variables are set. Missing `COSMOS_ENDPOINT` or `COSMOS_KEY` will cause immediate crash.

**Charts not showing**  
There needs to be at least 2 data points (two 5-minute windows) for a line to appear. Wait 10+ minutes with the simulator running.

**Deployed app shows -- but local works**  
Your Cosmos DB key was probably regenerated. Update `COSMOS_KEY` in App Service environment variables and restart the app.
