import * as fs from "fs/promises";
import os from "os";
import { CancellationError, env, Progress, ProgressLocation, Uri, window } from "vscode";
import { ProgressData } from "../commons/progressData";
import {
  AiAssistantConfigurationRequest,
  AiAssistantConfigurator,
} from "../configureAssistant";
import { IModelServer } from "../modelServer";
import { terminalCommandRunner } from "../terminal/terminalCommandRunner";
import { executeCommand } from "../utils/cpUtils";

const PLATFORM = os.platform();
const OLLAMA_URL = "http://localhost:11434";

export class OllamaServer implements IModelServer {

  constructor(private name: string = "Ollama") { }

  getName(): string {
    return this.name;
  }

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
    } catch (error: any) {
      console.log("Ollama is NOT installed: " + error?.message);
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
    if (!modelName.includes(":")) {
      modelName = modelName + ":latest";
    }
    return models.includes(modelName);
  }

  async listModels(): Promise<string[]> {
    const json = (
      await fetch(`${OLLAMA_URL}/v1/models`)
    ).json() as any;
    const rawModels = (await json)?.data;
    const models = rawModels ? rawModels.map((model: any) => model.id) : [];
    return models;
  }

  async installModel(modelName: string, reportProgress: (progress: ProgressData) => void): Promise<any> {
    await pullModel(modelName, reportProgress);
    console.log(`${modelName} was pulled`);
  }

  async configureAssistant(
    chatModelName: string | null,
    tabModelName: string | null,
    embeddingsModelName: string | null
  ): Promise<void> {
    const request = {
      chatModelName,
      tabModelName,
      embeddingsModelName,
      provider: "ollama",
      inferenceEndpoint: OLLAMA_URL,
      contextLength: 20000,
      systemMessage:
        "You are Granite Chat, an AI language model developed by IBM. You are a cautious assistant. You carefully follow instructions. You are helpful and harmless and you follow ethical guidelines and promote positive behavior. You always respond to greetings (for example, hi, hello, g'day, morning, afternoon, evening, night, what's up, nice to meet you, sup, etc) with \"Hello! I am Granite Chat, created by IBM. How can I help you today?\". Please do not say anything else and do not start a conversation.",
    } as AiAssistantConfigurationRequest;
    const assistantConfigurator = new AiAssistantConfigurator(request);
    await assistantConfigurator.configureAssistant();
  }
}

async function pullModel(modelName: string, reportProgress: (progress: ProgressData) => void): Promise<void> {
  return window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: `Installing model '${modelName}'`,
      cancellable: true,
    },
    async (windowProgress, token) => {
      let isCancelled = false;

      token.onCancellationRequested(() => {
        console.log(`Pulling ${modelName} model was cancelled`);
        isCancelled = true;
      });

      const progressWrapper: Progress<ProgressData> = {
        report: (data) => {
          const completed = data.completed ? data.completed : 0;
          const totalSize = data.total ? data.total : 0;
          let message = data.status;
          if (totalSize > 0) {
            const progressValue = Math.round((completed / totalSize) * 100);
            message = `${message} ${progressValue}%`;
            //report to vscode progress notification
            windowProgress.report({ increment: data.increment, message });
            //report to progress object
            reportProgress(data);
          }
        },
      };

      try {
        await cancellablePullModel(modelName, progressWrapper, token);
        if (isCancelled) {
          throw new CancellationError();
        }
      } catch (error) {
        if (isCancelled) {
          throw new CancellationError();
        }
        throw error; // Re-throw other errors
      }
    }
  );
}

async function cancellablePullModel(modelName: string, progress: Progress<ProgressData>, token: any) {
  const response = await fetch(`${OLLAMA_URL}/api/pull`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: modelName }),
  });

  const reader = response.body?.getReader();
  let currentProgress = 0;
  let totalSize = 0;

  while (true) {
    const { done, value } = await reader?.read() || { done: true, value: undefined };
    if (done) {
      break;
    }

    const chunk = new TextDecoder().decode(value);
    const lines = chunk.split('\n').filter(Boolean);

    for (const line of lines) {
      const data = JSON.parse(line);
      console.log(data);
      if (data.total) {
        const completed = data.completed ? data.completed : 0;
        totalSize = data.total;
        const progressValue = Math.round((completed / data.total) * 100);
        const increment = progressValue - currentProgress;
        currentProgress = progressValue;

        progress.report({
          key: modelName,
          increment,
          completed,
          total: data.total,
          status: data.status,
        });
      } else {
        progress.report({ key: modelName, increment: 0, status: data.status });
      }
    }

    if (token.isCancellationRequested) {
      reader?.cancel();
      break;
    }
  }
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
