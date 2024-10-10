import { ProgressData } from "./commons/progressData";
import { ModelStatus, ServerStatus } from "./commons/statuses";

export interface IModelServer {
  getName(): string;
  getStatus(): Promise<ServerStatus>;
  startServer(): Promise<boolean>;
  installServer(mode: string): Promise<boolean>;
  getModelStatus(modelName?: string): Promise<ModelStatus>
  installModel(modelName: string, reportProgress: (progress: ProgressData) => void): Promise<any>;
  supportedInstallModes(): Promise<{ id: string; label: string }[]>; //manual, script, homebrew
  configureAssistant(
    chatModelName: string | null,
    tabModelName: string | null,
    embeddingsModel: string | null
  ): Promise<void>;
  listModels(): Promise<string[]>;
  //getModelInfo(modelName: string): Promise<ModelInfo | undefined>;
}
