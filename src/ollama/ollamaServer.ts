import * as fs from "fs/promises";
import {
  AiAssistantConfigurationRequest,
  AiAssistantConfigurator,
} from "../configureAssistant";
import { IModelServer } from "../modelServer";
import { executeCommand } from "../utils/cpUtils";
import * as vscode from "vscode";
import { terminalCommandRunner } from "../terminal/terminalCommandRunner";

export class OllamaServer implements IModelServer {
  name!: "Ollama";

  async isServerInstalled(): Promise<boolean> {
    //check if ollama is installed
    try {
      await executeCommand("ollama", ["-v"]);
      console.log("Ollama is installed");
      return true;
    } catch (error) {
      console.log("Ollama is NOT installed");
      return false;
    }
  }

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
    await terminalCommandRunner.runInTerminal("ollama list", {
      name: "Granite Code Setup",
      show: true,
    });
    return true;
  }

  async installServer(): Promise<boolean> {
    await terminalCommandRunner.runInTerminal(
      "clear && brew install --cask ollama",
      {
        name: "Granite Code Setup",
        show: true,
      }
    );
    return true;
  }

  async checkFileExists(filePath: string) {
    try {
      await fs.stat(filePath);
      console.log(`${filePath} exists`);
      return true;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        // File does not exist
        console.log(`${filePath} does not exist`);
        return false;
      } else {
        // Some other error occurred
        console.error("Error checking file existence:", error);
        throw error;
      }
    }
  }

  async isModelInstalled(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.includes(modelName);
  }

  async listModels(): Promise<string[]> {
    const json = (
      await fetch("http://localhost:11434/v1/models")
    ).json() as any;
    const rawModels = (await json)?.data;
    const models = rawModels.map((model: any) => model.id);
    return models;
  }

  async installModel(modelName: string): Promise<any> {
    await pullModel(modelName);
    console.log(`${modelName} was pulled`);
  }

  async configureAssistant(
    chatModelName: string,
    tabModelName: string
  ): Promise<void> {
    const request = {
      metadata: {
        chatModelName,
        tabModelName,
        provider: "ollama",
        inferenceEndpoint: "http://localhost:11434",
        contextLength: 20000,
        systemMessage:
          "You are Granite Chat, an AI language model developed by IBM. You are a cautious assistant. You carefully follow instructions. You are helpful and harmless and you follow ethical guidelines and promote positive behavior. You always respond to greetings (for example, hi, hello, g'day, morning, afternoon, evening, night, what's up, nice to meet you, sup, etc) with \"Hello! I am Granite Chat, created by IBM. How can I help you today?\". Please do not say anything else and do not start a conversation.",
      },
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
  //TODO use ollama REST API instead of CLI
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Installing model '${modelName}'`,
      cancellable: true,
    },
    async (progress, token) => {
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
        //TODO handle Error: pull model manifest: Get "https://registry.ollama.ai/v2/library/granite-code/manifests/3b": read tcp 192.168.0.159:50487->104.21.75.227:443: read: operation timed out
        console.log(error);
      }
    }
  );
}
