//Mock server for testing
import { CancellationError, env, Progress, ProgressLocation, Uri, window } from "vscode";
import { ProgressData } from "../commons/progressData";
import { IModelServer } from "../modelServer";
import { OllamaServer } from "./ollamaServer";
class MockModel {
  progress: number;
  layers: MockLayer[];
  constructor(public name: string, public size: number, public installed: boolean = false) {
    this.progress = 0;
    this.installed = false;
    const sizeInBytes = size * 1024 * 1024;
    this.layers = this.generateLayers(sizeInBytes);
  }

  private generateLayers(totalSize: number): MockLayer[] {
    const layerSizes = [0.90, 0.05, 0.03, 0.02];
    return layerSizes.map(percentage => ({
      name: this.generateHash(),
      size: percentage * totalSize,
      progress: 0
    }));
  }

  generateHash(): string {
    return Math.random().toString(36).substring(2, 14);
  }
};
interface MockLayer {
  name: string;
  size: number; // size in bytes
  progress: number; // progress in bytes
}
export class MockServer extends OllamaServer implements IModelServer {
  private isInstalled: boolean = false;
  private models: Map<string, MockModel> = new Map([
    ["granite-code:3b", new MockModel("granite-code:3b", 2600)],
    ["granite-code:8b", new MockModel("granite-code:8b", 4000)],
    ["granite-code:20b", new MockModel("granite-code:20b", 11000, true)],
    ["granite-code:34b", new MockModel("granite-code:34b", 20000)],
    ["nomic-embed-text:latest", new MockModel("nomic-embed-text:latest", 274)]
  ]);

  /**
   * Creates an instance of MockServer with a specified speed.
   *
   * @param speed - The speed of the server in MB/s. This speed
   *                determines how fast the mock server
   *                will simulate download operations.
   */
  constructor(private speed: number) {
    super("Mock Server");
    this.speed *= 1024 * 1024; // Convert speed to bytes per second
  }
  async startServer(): Promise<boolean> {
    return true;
  }
  async isServerInstalled(): Promise<boolean> {
    return this.isInstalled;
  }
  async installServer(mode: string): Promise<boolean> {
    switch (mode) {
      case "mock":
        return new Promise(async (resolve, reject) => {
          await window.withProgress(
            {
              location: ProgressLocation.Notification,
              title: `Pretending to install server`,
            },
            async (windowProgress, token) => {
              token.onCancellationRequested(() => {
                console.log("Installation cancelled");
                reject(new CancellationError());
              });

              const desiredDuration = 4000; // 4 seconds
              const interval = 200; // 200 milliseconds
              const totalSteps = desiredDuration / interval;
              const increment = 100 / totalSteps;

              let progress = 0;
              const updateProgress = async () => {
                if (progress < 100) {
                  progress += increment;
                  windowProgress.report({ increment });
                  await new Promise(resolve => setTimeout(resolve, interval));
                  await updateProgress();
                } else {
                  this.isInstalled = true;
                  resolve(this.isInstalled);
                }
              };

              await updateProgress();
            }
          );
        });
      case "manual":
      default:
        await env.openExternal(Uri.parse("https://ollama.com/download"));
        this.isInstalled = true;
        return this.isInstalled;
    }
  }
  private getModel(modelName: string): MockModel {
    const fullModelName = modelName.includes(":") ? modelName : `${modelName}:latest`;
    const model = this.models.get(fullModelName);
    if (!model) {
      throw new Error(`Model ${fullModelName} not found`);
    }
    return model;
  }

  async isModelInstalled(modelName: string): Promise<boolean> {
    return this.getModel(modelName).installed;
  }

  async cancellablePullModel(modelName: string, progressReporter: Progress<ProgressData>, token: any): Promise<void> {
    const model = this.getModel(modelName);
    if (model.installed) {
      return;
    }

    const steps = [
      { name: "Pulling manifest", duration: 1000 },
      ...model.layers.map(layer => ({ name: `Pulling ${layer.name}...`, layer })),
      { name: "Verifying sha256 digest", duration: 1000 },
      { name: "Writing manifest", duration: 1000 },
      { name: "Success", duration: 1000 }
    ];

    for (const step of steps) {
      if (token.isCancellationRequested) {
        return;
      }

      if ('layer' in step) {
        await this.simulateDownload(model.name, step.layer, progressReporter, token);
      } else {
        await this.simulateStep(model.name, step.name, step.duration, progressReporter);
      }
    }
    model.installed = true;
  }

  private async simulateStep(modelName: string, status: string, duration: number, progressReporter: Progress<ProgressData>): Promise<void> {
    return new Promise(resolve => {
      progressReporter.report({ key: modelName, status, increment: -100 });
      progressReporter.report({ key: modelName, status, increment: 1 });
      setTimeout(() => {
        progressReporter.report({ key: modelName, status, increment: 100 });
        resolve();
      }, duration);
    });
  }

  private async simulateDownload(modelName: string, layer: MockLayer, progressReporter: Progress<ProgressData>, token: any): Promise<void> {
    let lastUpdate = Date.now();
    const status = `Pulling ${layer.name}...`;
    progressReporter.report({ key: modelName, status, increment: -100 });

    return new Promise((resolve, reject) => {
      const updateProgress = () => {
        if (token.isCancellationRequested) {
          reject('Download Canceled');
          return;
        }

        const now = Date.now();
        const interval = now - lastUpdate;
        lastUpdate = now;

        const added = Math.min(this.speed * (interval / 1000), layer.size - layer.progress);
        layer.progress += added;
        //TODO, for granite-code:34b, throw an exception once we reach 10%
        const increment = Math.round(100 * added / layer.size);

        progressReporter.report({
          key: modelName,
          status,
          increment,
          completed: layer.progress,
          total: layer.size
        });

        if (layer.progress >= layer.size) {
          resolve();
        } else {
          setTimeout(updateProgress, 500);
        }
      };

      updateProgress();
    });
  }
  async supportedInstallModes(): Promise<{ id: string; label: string; }[]> {
    return Promise.resolve([{ id: 'mock', label: 'Install Magically' }, { id: 'manual', label: 'Install Manually' }]);
  }

  async listModels(): Promise<string[]> {
    if (!this.isInstalled) {
      throw new Error("Server is not installed");
    }
    return Array.from(this.models.values()).filter(model => model.installed).map(model => model.name);
  }

  async configureAssistant(
    chatModelName: string | null,
    tabModelName: string | null,
    embeddingsModelName: string | null
  ): Promise<void> {
    //TODO, if chatModelName=granite-code:3b and tabModelName=granite-code:20b, throw an exception
    super.configureAssistant(chatModelName, tabModelName, embeddingsModelName);
  }
}