import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as path from 'path';
import { ConnectionPool, Request as SqlRequest } from 'mssql';
import { downloadWorkflow } from './app';
import { DownloadConfig } from './config';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to download workflows
app.post('/api/download', async (req: Request, res: Response) => {
    try {
        const { dbConfig, downloadConfig } = req.body;

        // Validate required fields
        if (!dbConfig || !downloadConfig) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: dbConfig and downloadConfig'
            });
        }

        // Validate dbConfig fields
        if (!dbConfig.user || !dbConfig.password || !dbConfig.server || !dbConfig.database) {
            return res.status(400).json({
                success: false,
                message: 'Missing required database configuration fields'
            });
        }

        // Validate downloadConfig fields
        if (!downloadConfig.controllerName || !downloadConfig.controllerVersion || !downloadConfig.outputPath) {
            return res.status(400).json({
                success: false,
                message: 'Missing required download configuration fields'
            });
        }

        const result = await downloadWorkflow(dbConfig, downloadConfig);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: `Server error: ${error.message}`
        });
    }
});

// API endpoint to fetch controller names
app.post('/api/controllers', async (req: Request, res: Response) => {
    let conn: ConnectionPool | null = null;
    try {
        const { dbConfig } = req.body;

        // Validate required fields
        if (!dbConfig) {
            return res.status(400).json({
                success: false,
                message: 'Missing required field: dbConfig'
            });
        }

        // Validate dbConfig fields
        if (!dbConfig.user || !dbConfig.password || !dbConfig.server || !dbConfig.database) {
            return res.status(400).json({
                success: false,
                message: 'Missing required database configuration fields'
            });
        }

        conn = new ConnectionPool(dbConfig);
        await conn.connect();

        const sqlReq = new SqlRequest(conn);
        const result = await sqlReq.query(
            `SELECT DISTINCT Name, Version FROM [CoreDataModel].[T_AutomationController] ORDER BY Name, Version DESC`
        );

        await conn.close();

        res.json({
            success: true,
            controllers: result.recordset
        });
    } catch (error: any) {
        if (conn) {
            try {
                await conn.close();
            } catch (e) {}
        }
        res.status(500).json({
            success: false,
            message: `Error fetching controllers: ${error.message}`
        });
    }
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Serve the UI
app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
