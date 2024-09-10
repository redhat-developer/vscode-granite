import * as fs from "fs/promises";
import os from "os";
import { env, ProgressLocation, Uri, window } from "vscode";
import {
  AiAssistantConfigurationRequest,
  AiAssistantConfigurator,
} from "../configureAssistant";
import { IModelServer } from "../modelServer";
import { terminalCommandRunner } from "../terminal/terminalCommandRunner";
import { executeCommand } from "../utils/cpUtils";

const PLATFORM = os.platform();

export class OllamaServer implements IModelServer {
  name!: "Ollama";

  async supportedInstallModes(): Promise<{ id: string; label: string }[]> {
    const modes = [];

    if (await isHomebrewAvailable()) {
      // homebrew is available
      modes.push({ id: "homebrew", label: "Install with Homebrew" });
    }
    if (await isLinux()) {
      // on linux
      modes.push({ id: "script", label: "Install with script" });
    }
    modes.push({ id: "manual", label: "Install manually" });
    return modes;
  }

  async isServerInstalled(): Promise<boolean> {
    //check if ollama is installed
    try {
      await executeCommand("ollama", ["-v"]);
      console.log("Ollama is installed");
      return true;
    } catch (error) {
      console.log("Ollama is NOT installed");
      console.log(error);
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
      console.log(error);
      return false;
    }
  }

  async startServer(): Promise<boolean> {
    // await terminalCommandRunner.runInTerminal("ollama list", {
    //   name: "Granite Code Setup",
    //   show: true,
    // });
    return true;
  }

  async installServer(mode: string): Promise<boolean> {
    switch (mode) {
      case "homebrew": {
        await terminalCommandRunner.runInTerminal(
          "clear && brew install --cask ollama && sleep 3 && ollama list", //run ollama list to trigger the ollama daemon
          {
            name: "Granite Code Setup",
            show: true,
          }
        );
        return true;
      }
      case "script":
        await terminalCommandRunner.runInTerminal(
          "clear && curl -fsSL https://ollama.com/install.sh | sh",
          {
            name: "Granite Code Setup",
            show: true,
          }
        );
        return true;
      case "manual":
      default:
        env.openExternal(Uri.parse("https://ollama.com/download"));
    }
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
      }
      // Some other error occurred
      console.error("Error checking file existence:", error);
      throw error;
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
    const models = rawModels ? rawModels.map((model: any) => model.id) : [];
    return models;
  }

  async installModel(modelName: string): Promise<any> {
    await pullModel(modelName);
    console.log(`${modelName} was pulled`);
  }

  async configureAssistant(
    chatModelName: string,
    tabModelName: string,
    embeddingsModelName: string
  ): Promise<void> {
    const request = {
      chatModelName,
      tabModelName,
      embeddingsModelName,
      provider: "ollama",
      inferenceEndpoint: "http://localhost:11434",
      contextLength: 20000,
      systemMessage:
        "You are Granite Chat, an AI language model developed by IBM. You are a cautious assistant. You carefully follow instructions. You are helpful and harmless and you follow ethical guidelines and promote positive behavior. You always respond to greetings (for example, hi, hello, g'day, morning, afternoon, evening, night, what's up, nice to meet you, sup, etc) with \"Hello! I am Granite Chat, created by IBM. How can I help you today?\". Please do not say anything else and do not start a conversation.",
    } as AiAssistantConfigurationRequest;
    const assistantConfigurator = new AiAssistantConfigurator(request);
    await assistantConfigurator.configureAssistant();
  }
}

const regex = /pulling\s+[a-f0-9]+\.\.\.\s+(\d+%)/g;

async function pullModel(modelName: string) {
  //TODO use ollama REST API instead of CLI
  return window.withProgress(
    {
      location: ProgressLocation.Notification,
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

async function isHomebrewAvailable(): Promise<boolean> {
  if (isWin()) {
    //TODO Would that be an issue on WSL2?
    return false;
  }
  const result = await executeCommand("which", ["brew"]);
  return "brew not found" !== result;
}

function isLinux(): boolean {
  return PLATFORM === "linux";
}

function isWin(): boolean {
  return PLATFORM.startsWith("win");
}
