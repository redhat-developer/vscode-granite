import { ProgressData } from "./commons/progressData";

export interface IModelServer {
  getName(): string;
  isServerInstalled(): Promise<boolean>;
  startServer(): Promise<boolean>;
  installServer(mode: string): Promise<boolean>;
  isModelInstalled(modelName: string): Promise<boolean>;
  installModel(modelName: string, reportProgress: (progress: ProgressData) => void): Promise<any>;
  supportedInstallModes(): Promise<{ id: string; label: string }[]>; //manual, script, homebrew
  configureAssistant(
    chatModelName: string | null,
    tabModelName: string | null,
    embeddingsModel: string | null
  ): Promise<void>;
  listModels(): Promise<string[]>;
}
