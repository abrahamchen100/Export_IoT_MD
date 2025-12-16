import * as fs from "fs";
import * as Path from "path"
import { ConnectionPool, Request, IResult } from "mssql";
import { CONFIG, DownloadConfig } from "./config";

export interface WorkflowResult {
    DisplayName: string;
    Workflow: string;
}

export interface DownloadResult {
    success: boolean;
    message: string;
    workflowCount?: number;
    outputDir?: string;
    logs?: string[];
}

export async function downloadWorkflow(dbConfig: any, downloadConfig: DownloadConfig): Promise<DownloadResult> {
    let conn: ConnectionPool | null = null;
    const logs: string[] = [];

    try {
        logs.push(`[${new Date().toLocaleTimeString()}] Connecting to database: ${dbConfig.server}/${dbConfig.database}`);
        conn = new ConnectionPool(dbConfig);
        let req: Request = new Request(conn);
        await conn.connect();
        logs.push(`[${new Date().toLocaleTimeString()}] Connected successfully`);

        // Query controller id
        logs.push(`[${new Date().toLocaleTimeString()}] Querying controller: ${downloadConfig.controllerName} (v${downloadConfig.controllerVersion})`);
        let result: IResult<any> = await req.query(
            `SELECT * FROM `+
            `[CoreDataModel].[T_AutomationController] ` +
            `WHERE Name = \'${downloadConfig.controllerName}\' ` +
            `AND Version = ${downloadConfig.controllerVersion}`
        );

        if (!result.recordset || result.recordset.length === 0) {
            logs.push(`[${new Date().toLocaleTimeString()}] ERROR: Controller not found`);
            await conn.close();
            return {
                success: false,
                message: `AutomationController '${downloadConfig.controllerName}' version ${downloadConfig.controllerVersion} not found`,
                logs
            };
        }

        const AutomationControllerId: string = result.recordset[0].AutomationControllerId;
        logs.push(`[${new Date().toLocaleTimeString()}] Found controller ID: ${AutomationControllerId}`);

        // Query workflow
        logs.push(`[${new Date().toLocaleTimeString()}] Querying workflows for controller...`);
        result = await req.query(
            `SELECT * FROM `+
            `[CoreDataModel].[T_AutomationWorkflow] ` +
            `WHERE AutomationControllerId = \'${AutomationControllerId}\'`
        );

        const workflows: WorkflowResult[] = result.recordset;
        logs.push(`[${new Date().toLocaleTimeString()}] Found ${workflows.length} workflow(s)`);

        if (workflows.length === 0) {
            logs.push(`[${new Date().toLocaleTimeString()}] ERROR: No workflows found`);
            await conn.close();
            return {
                success: false,
                message: 'No workflows found for this controller',
                logs
            };
        }

        // make output directory with version folder
        let outputDir: string = Path.join(downloadConfig.outputPath, downloadConfig.controllerName, `v${downloadConfig.controllerVersion}`);
        logs.push(`[${new Date().toLocaleTimeString()}] Creating output directory: ${outputDir}`);
        if (!fs.existsSync(outputDir)){
            fs.mkdirSync(outputDir, { recursive: true });
        }
        logs.push(`[${new Date().toLocaleTimeString()}] Directory created successfully`);

        logs.push(`[${new Date().toLocaleTimeString()}] Saving workflows to disk...`);
        for (let workflow of workflows) {
            let outputPath: string = Path.join(outputDir, `${workflow.DisplayName}.json`);
            fs.writeFileSync(outputPath, workflow.Workflow);
            logs.push(`[${new Date().toLocaleTimeString()}]   ✓ Saved: ${workflow.DisplayName}.json`);
        }

        await conn.close();
        logs.push(`[${new Date().toLocaleTimeString()}] Database connection closed`);
        logs.push(`[${new Date().toLocaleTimeString()}] ✓ SUCCESS: All workflows downloaded successfully`);

        return {
            success: true,
            message: `Successfully downloaded ${workflows.length} workflow(s)`,
            workflowCount: workflows.length,
            outputDir: outputDir,
            logs
        };
    } catch (error: any) {
        logs.push(`[${new Date().toLocaleTimeString()}] ERROR: ${error.message}`);
        if (conn) {
            await conn.close();
        }
        return {
            success: false,
            message: `Error: ${error.message}`,
            logs
        };
    }
}

