import * as path from "path";
import { createWriteStream } from "fs";
import * as fs from "fs/promises";
import { AiAssistantConfigurationRequest, AiAssistantConfigurator } from "../configureAssistant";
import { IModelServer } from "../modelServer";
import { executeCommand } from "../utils/cpUtils";
import * as os from "os";
import * as vscode from 'vscode';
import { Readable } from "stream";
import extract from "extract-zip";

export class OllamaServer implements IModelServer {
    name!: 'Ollama';

    async isServerInstalled(): Promise<boolean> {
        //check if ollama is installed
        try {
            await executeCommand('ollama', ['-v']);
            return true;
        } catch (error) {
            return false;
        }
    }

    async installServer(): Promise<boolean> {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Downloading Ollama`,
            cancellable: false
        }, async (progress, _token) => {
            await this.doInstallServer(progress);
        });
        return true;
    }

    async doInstallServer(progress: vscode.Progress<{ message?: string; increment?: number; }>): Promise<boolean> {
        //Check which os is being used
        const platform = os.platform();

        //if using mac, download from here
        if (platform === 'darwin') {
            const url = "https://ollama.com/download/Ollama-darwin.zip";
            const fileName = url.split("/").pop()!;
            const downloadDir = path.join(os.homedir(), 'Downloads', 'ollama-vscode-granites');
            const zipPath = path.join(downloadDir, fileName);

            if (!(await this.checkFileExists(zipPath))) {
                await fs.mkdir(downloadDir, { recursive: true });
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error('Failed to download Ollama');
                }
                const body = response.body;
                if (!body) {
                    throw new Error('Failed to download Ollama');
                }

                let writer = createWriteStream(zipPath);
                await new Promise((resolve, reject) => {
                    Readable.fromWeb(body).pipe(writer)
                        .on('finish', resolve)
                        .on('error', reject);
                });

                if (!(await this.checkFileExists(zipPath))) {
                    throw new Error(`${zipPath} doesn't exist`);
                }
            }
            const processWithNoAsar = process as typeof process & { noAsar: boolean };
            const noAsar = processWithNoAsar.noAsar;
            try {
                //Prevent Ollama.app unzipping failure as it contains an asar file. See https://stackoverflow.com/a/76633263
                processWithNoAsar.noAsar = true;
                progress.report({ message: `Unzipping Ollama.zip`});
                console.log('Unzipping ....');
                await extract(zipPath, { dir: downloadDir });

                if (!(await this.checkFileExists(`${downloadDir}/Ollama.app`))) {
                    throw new Error(`Ollama.app doesn't exist`);
                }
                progress.report({ message: `Unzipping ....'` });

                // const dest = `/Applications/Ollama.app`;
                // progress.report({ message: `Moving Ollama.app to /Applications`});

                // needs pnpm install mv
                // mv(`${downloadDir}/Ollama.app`, dest, function (err) { });
                // await sleep(2000);
                // if (!(await this.checkFileExists(`${dest}`))) {
                //     throw new Error(`Ollama.app was not installed to ${dest}`);
                // }

                // await sleep(2000);


            } finally {
                processWithNoAsar.noAsar = noAsar;
            }
            vscode.window.showInformationMessage(`${zipPath} was unzipped`);
            //TODO open finder and let user move Ollama.app to /Applications
        }
        return true;
    }

    async checkFileExists(filePath: string) {
        try {
            await fs.stat(filePath);
            console.log(`${filePath} exists`);
            return true;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                // File does not exist
                console.log(`${filePath} does not exist`);
                return false;
            } else {
                // Some other error occurred
                console.error('Error checking file existence:', error);
                throw error;
            }
        }
    }

    async isModelInstalled(modelName: string): Promise<boolean> {
        const models = await this.listModels();
        return models.includes(modelName);
    }

    async listModels(): Promise<string[]> {
        const output = await executeCommand('ollama', ['list']);
        const lines = output.split('\n');
        const modelNames: string[] = [];
        //Skip header line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            // Skip empty lines
            if (line === '') {
                continue;
            }
            const modelName = line.split(/\s+/)[0];
            modelNames.push(modelName);
        }
        return modelNames;
    }

    async installModel(modelName: string): Promise<any> {
        await pullModel(modelName);
        console.log(`${modelName} was pulled`);
    }

    async configureAssistant(modelName: string): Promise<void> {
        const request = {
            metadata: {
                name: modelName,
                provider: 'ollama',
                inferenceEndpoint: 'http://localhost:11434',
                contextLength: 20000,
                systemMessage: "You are Granite Chat, an AI language model developed by IBM. You are a cautious assistant. You carefully follow instructions. You are helpful and harmless and you follow ethical guidelines and promote positive behavior. You always respond to greetings (for example, hi, hello, g'day, morning, afternoon, evening, night, what's up, nice to meet you, sup, etc) with \"Hello! I am Granite Chat, created by IBM. How can I help you today?\". Please do not say anything else and do not start a conversation.",
            }
        } as AiAssistantConfigurationRequest;
        const assistantConfigurator = new AiAssistantConfigurator(request);
        await assistantConfigurator.configureAssistant();
    }
}

const regex = /pulling\s+[a-f0-9]+\.\.\.\s+(\d+%)/g;

// async function sleep(ms: number) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }


async function pullModel(modelName: string) {
    return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Installing model '${modelName}'`,
            cancellable: true
        },  async (progress, token) => {
            token.onCancellationRequested(() => {
                console.log(`Pulling ${modelName} model was cancelled`);
            });
            const cmd = `ollama pull ${modelName}`;
        try {
            let currentProgress = 0;
            await executeCommand(cmd, [], undefined, token, (data) => {
                // Update progress in the UI

                let match;
                let lastMatch = null;

                while ((match = regex.exec(data)) !== null) {
                    lastMatch = match;
                }
                if (lastMatch) {
                    const message = lastMatch[0];
                    const progressValue = parseInt(lastMatch[1], 10);
                    const increment = progressValue - currentProgress;
                    currentProgress = progressValue;
                    progress.report({ increment, message });
                }
            });
            } catch (error) {
                console.log(error);
            }
        }
    );
}