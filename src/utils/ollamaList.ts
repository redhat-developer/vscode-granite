import { Readable } from "stream";
import { exec } from "child_process";

export class OllamaServer {

    async isServerStarted(): Promise<boolean> {
        //check if ollama is installed
        try {
            await this.listModels();
            console.log("Ollama server is started");
            return true;
        } catch (error) {
            //TODO Check error
            console.log("Ollama server is NOT started");
            return false;
        }
    }

    async startServer(): Promise<boolean> {
        //ollama list starts the server in the background. No need to run ollama serve manually and deal with it;
        try {
            //const output = await executeCommand('ollama list',[]);
            //console.log("Ollama server was just started \n" + output);
            await this.runOllamaList();
            console.log("Ollama server is started");
            return true;
        } catch (error) {
            console.log("Ollama server could not be started");
            console.log(error);
            return false;
        }
    }

    async runOllamaList(): Promise<void> {
        const result = await this.execSimpleCommand('ollama list');
    }

    async execSimpleCommand(command: string): Promise<{ stdout: string; stderr: string }> {
        return new Promise((resolve, reject) => {
          exec(command, (error, stdout, stderr) => {
            if (error) {
              reject(error);
            } else {
              resolve({ stdout, stderr });
            }
          });
        });
      }

    async isModelInstalled(modelName: string): Promise<boolean> {
        const models = await this.listModels();
        return models.includes(modelName);
    }

    async listModels(): Promise<string[]> {
        const json = (await fetch("http://localhost:11434/v1/models")).json() as any;
        const rawModels = (await json)?.data;
        const models = rawModels.map((model: any) => model.id);
        return models;
    }

}


new OllamaServer().startServer();