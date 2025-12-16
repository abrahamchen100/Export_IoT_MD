# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based tool for downloading automation workflows from a SQL Server database. The application connects to an IoT/MES database and exports workflow JSON files for specified automation controllers.

**Node version required:** 20.4.0

## Setup and Configuration

1. Install dependencies: `npm install`
2. Configure database connection in `config.ts`:
   - Update `CONFIG` object with SQL Server credentials (user, password, server, database, port)
   - Update `DOWNLOAD_CONFIG` with controller details and output path

The `config.ts` file contains database credentials and is likely gitignored in production use - always verify credentials before committing.

## Running the Application

### Web UI (Recommended)

Start the web server:
```bash
npm start
```

Then open your browser to `http://localhost:3000` to access the web interface. The UI allows you to:
- Configure database connection settings
- Load existing controllers from the database with one click
- Select controller name from dropdown (auto-populated from database)
- Select version from dropdown (filtered by selected controller)
- Set output path for downloaded workflows
- View download results in real-time

### Command Line (Legacy)

For programmatic use, modify `config.ts` and call the `downloadWorkflow()` function directly from your code:
```typescript
import { downloadWorkflow } from './app';
import { CONFIG, DOWNLOAD_CONFIG } from './config';

const result = await downloadWorkflow(CONFIG, DOWNLOAD_CONFIG);
```

The application will:
1. Connect to the configured SQL Server database
2. Query the `CoreDataModel.T_AutomationController` table for the specified controller
3. Retrieve all workflows from `CoreDataModel.T_AutomationWorkflow` for that controller
4. Save each workflow as a JSON file in the configured output directory

## Architecture

### Main Files

- **server.ts** - Express web server providing REST API and serving the web UI
- **app.ts** - Core download logic with exported `downloadWorkflow()` function
- **config.ts** - Configuration file for database connection and download parameters (for legacy use)
- **public/** - Frontend web UI files
  - **index.html** - Main UI interface
  - **styles.css** - UI styling
  - **app.js** - Frontend JavaScript for API interaction

### API Endpoints

The Express server provides the following REST API endpoints:

- **POST /api/controllers** - Fetch all controllers from database
  - Request body: `{ dbConfig: {...} }`
  - Returns: `{ success: boolean, controllers: [{Name: string, Version: number}] }`

- **POST /api/download** - Download workflows
  - Request body: `{ dbConfig: {...}, downloadConfig: {...} }`
  - Returns: `{ success: boolean, message: string, workflowCount?: number, outputDir?: string }`

- **GET /api/health** - Health check endpoint
  - Returns: `{ status: 'ok', message: 'Server is running' }`

### Database Schema

The application interacts with two main tables in the `CoreDataModel` schema:

1. **T_AutomationController** - Stores controller metadata
   - Queried by `Name` and `Version` to get `AutomationControllerId`

2. **T_AutomationWorkflow** - Stores workflow definitions
   - Queried by `AutomationControllerId` to retrieve all workflows
   - Contains `DisplayName` (used as filename) and `Workflow` (JSON content)

### Output Structure

Workflows are saved to: `{outputPath}/{controllerName}/{DisplayName}.json`

The application creates the controller directory if it doesn't exist.

## Key Dependencies

- **mssql** (^10.0.1) - SQL Server client for Node.js
- **@types/mssql** (^9.1.4) - TypeScript type definitions
