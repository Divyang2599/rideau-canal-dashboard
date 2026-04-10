const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cosmos DB client setup
// Why environment variables? Never hardcode credentials in source code.
// Azure App Service lets you set these as Application Settings.
const cosmosClient = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY
});

const database = cosmosClient.database(process.env.COSMOS_DATABASE);
const container = database.container(process.env.COSMOS_CONTAINER);

// GET /api/sensors - Returns latest aggregation per location
// Why this query? The dashboard needs the most recent safety status
// for each of the 3 locations. We order by windowEndTime descending
// and take 1 per location using OFFSET/LIMIT per partition.
app.get('/api/sensors', async (req, res) => {
    try {
        const locations = ['dows-lake', 'fifth-avenue', 'nac'];
        const results = [];

        for (const location of locations) {
            const querySpec = {
                query: `SELECT TOP 1 * FROM c 
                        WHERE c.location = @location 
                        ORDER BY c.windowEndTime DESC`,
                parameters: [{ name: '@location', value: location }]
            };

            const { resources } = await container.items
                .query(querySpec, { partitionKey: location })
                .fetchAll();

            if (resources.length > 0) {
                results.push(resources[0]);
            }
        }

        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Error fetching sensor data:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/history/:location - Returns last hour of data for charts
app.get('/api/history/:location', async (req, res) => {
    try {
        const { location } = req.params;
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const querySpec = {
            query: `SELECT * FROM c 
                    WHERE c.location = @location 
                    AND c.windowEndTime >= @oneHourAgo 
                    ORDER BY c.windowEndTime ASC`,
            parameters: [
                { name: '@location', value: location },
                { name: '@oneHourAgo', value: oneHourAgo }
            ]
        };

        const { resources } = await container.items
            .query(querySpec, { partitionKey: location })
            .fetchAll();

        res.json({ success: true, data: resources });
    } catch (error) {
        console.error('Error fetching history:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check endpoint — used by Azure App Service
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Rideau Canal Dashboard running on port ${PORT}`);
    console.log(`Open: http://localhost:${PORT}`);
});