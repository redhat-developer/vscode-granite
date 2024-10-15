import os from "os";
import { CancellationError, env, Progress, ProgressLocation, Uri, window } from "vscode";
import { DEFAULT_MODEL_INFO, ModelInfo } from "../commons/modelInfo";
import { getStandardName } from "../commons/naming";
import { ProgressData } from "../commons/progressData";
import { ModelStatus, ServerStatus } from "../commons/statuses";
import { AiAssistantConfigurationRequest, AiAssistantConfigurator } from "../configureAssistant";
import { IModelServer } from "../modelServer";
import { terminalCommandRunner } from "../terminal/terminalCommandRunner";
import { executeCommand } from "../utils/cpUtils";
import { getRemoteModelInfo } from "./ollamaLibrary";

const PLATFORM = os.platform();

export class OllamaServer implements IModelServer {

  private currentStatus = ServerStatus.unknown;
  protected installingModels = new Set<string>();
  constructor(private name: string = "Ollama", private serverUrl = "http://localhost:11434") { }

  getName(): string {
    return this.name;
  }

  async supportedInstallModes(): Promise<{ id: string; label: string }[]> {
    const modes = [];

    if (await isHomebrewAvailable()) {
      // homebrew is available
      modes.push({ id: "homebrew", label: "Install with Homebrew" });
    }
    if (isLinux()) {
      // on linux
      modes.push({ id: "script", label: "Install with script" });
    }
    modes.push({ id: "manual", label: "Install manually" });
    return modes;
  }

  async getStatus(): Promise<ServerStatus> {
    let isStarted = false;
    try {
      isStarted = await this.isServerStarted();
    } catch (e) {
    }
    if (isStarted) {
      this.currentStatus = ServerStatus.started;
    } else {
      const ollamaInstalled = await this.isServerInstalled();
      if (this.currentStatus !== ServerStatus.installing) {
        this.currentStatus = (ollamaInstalled) ? ServerStatus.stopped : ServerStatus.missing;
      }
    }
    return this.currentStatus;
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
      await this.getTags();
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
        this.currentStatus = ServerStatus.installing; //We need to detect the terminal output to know when installation stopped (successfully or not)
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
        this.currentStatus = ServerStatus.installing;
        await terminalCommandRunner.runInTerminal(//We need to detect the terminal output to know when installation stopped (successfully or not)
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

  async getModelStatus(modelName?: string): Promise<ModelStatus> {
    if (!modelName || this.currentStatus !== ServerStatus.started) {
      return ModelStatus.unknown;
    }
    // Check if the model is currently being installed
    if (this.installingModels.has(modelName)) {
      return ModelStatus.installing;
    }
    let status = ModelStatus.missing;
    //const start = Date.now();
    try {
      const models = await this.getTags();
      modelName = getStandardName(modelName);
      const model = models.find((tag: any) => {
        return (tag.name === modelName);
      });
      if (model) {
        status = ModelStatus.installed;
        //It's installed, but is it the most recent version?
        const modelInfo = await getRemoteModelInfo(modelName);
        if (modelInfo && modelInfo.digest !== model.digest) {
          // Since the digest differs, we assume a most recent version is available
          status = ModelStatus.stale;
        }
      }
    } catch (error) {
      console.log(`Error getting ${modelName} status:`, error);
      status = ModelStatus.unknown;
    }
    //const elapsed = Date.now() - start;
    //console.log(`Model ${modelName} status check took ${elapsed}ms`);
    return status;
  }

  private cachedTags?: { timestamp: number, tags: any[] };

  async getTags(): Promise<any[]> {
    if (!this.cachedTags || (Date.now() - this.cachedTags.timestamp) > 100) {//cache for 100ms
      this.cachedTags = {
        timestamp: Date.now(),
        tags: await this._getTags(),
      };
    }
    return this.cachedTags.tags;
  }

  async _getTags(): Promise<any[]> {
    const json = (
      await fetch(`${this.serverUrl}/api/tags`)
    ).json() as any;
    const rawModels = (await json)?.models || [];
    return rawModels;
  }

  async listModels(): Promise<string[]> {
    const json = (
      await fetch(`${this.serverUrl}/v1/models`)
    ).json() as any;
    const rawModels = (await json)?.data;
    const models = rawModels ? rawModels.map((model: any) => model.id) : [];
    return models;
  }

  async installModel(modelName: string, reportProgress: (progress: ProgressData) => void): Promise<any> {
    await this.pullModel(modelName, reportProgress);
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
      inferenceEndpoint: this.serverUrl,
      contextLength: 32000,
      systemMessage:
        "You are Granite Chat, an AI language model developed by IBM. You are a cautious assistant. You carefully follow instructions. You are helpful and harmless and you follow ethical guidelines and promote positive behavior. You always respond to greetings (for example, hi, hello, g'day, morning, afternoon, evening, night, what's up, nice to meet you, sup, etc) with \"Hello! I am Granite Chat, created by IBM. How can I help you today?\". Please do not say anything else and do not start a conversation.",
    } as AiAssistantConfigurationRequest;
    const assistantConfigurator = new AiAssistantConfigurator(request);
    await assistantConfigurator.configureAssistant();
  }

  async pullModel(modelName: string, reportProgress: (progress: ProgressData) => void): Promise<void> {
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
            }
            //report to vscode progress notification
            windowProgress.report({ increment: data.increment, message });
            //report to progress object
            reportProgress(data);
          },
        };

        try {
          this.installingModels.add(modelName);
          await this.cancellablePullModel(modelName, progressWrapper, token);
          if (isCancelled) {
            throw new CancellationError();
          }
        } catch (error) {
          if (isCancelled) {
            throw new CancellationError();
          }
          throw error; // Re-throw other errors
        } finally {
          // Remove from installingModels once installation completes (success or error)
          this.installingModels.delete(modelName);
        }
      }
    );
  }


  async cancellablePullModel(modelName: string, progress: Progress<ProgressData>, token: any) {
    const response = await fetch(`${this.serverUrl}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: modelName }),
    });

    const reader = response.body?.getReader();
    let currentProgress = 0;

    while (true) {
      const { done, value } = await reader?.read() || { done: true, value: undefined };
      if (done) {
        break;
      }

      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        const data = JSON.parse(line);
        //console.log(data);
        if (data.total) {
          const completed = data.completed ? data.completed : 0;
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

  async getModelInfo(modelName: string): Promise<ModelInfo | undefined> {
    let modelInfo: ModelInfo | undefined;
    try {
      modelInfo = await getRemoteModelInfo(modelName);
    } catch (error) {
      console.log(`Failed to retrieve remote model info for ${modelName} : ${error}`);
    }
    if (!modelInfo) {
      modelInfo = DEFAULT_MODEL_INFO.get(modelName);
    }
    return modelInfo;
  }
}

async function isHomebrewAvailable(): Promise<boolean> {
  if (isWin()) {
    //TODO Would that be an issue on WSL2?
    return false;
  }
  try {
    const result = await executeCommand("which", ["brew"]);
    return "brew not found" !== result;
  } catch (e) {
    return false;
  }
}

function isLinux(): boolean {
  return PLATFORM === "linux";
}

function isWin(): boolean {
  return PLATFORM.startsWith("win");
}
