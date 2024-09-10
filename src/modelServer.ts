export interface IModelServer {
  name: string;
  isServerInstalled(): Promise<boolean>;
  installServer(mode: string): Promise<boolean>;
  isModelInstalled(modelName: string): Promise<boolean>;
  installModel(modelName: string): Promise<any>;
  supportedInstallModes(): Promise<{ id: string; label: string }[]>; //manual, script, homebrew
  configureAssistant(
    chatModelName: string,
    tabModelName: string,
    embeddingsModel: string
  ): Promise<void>;
  listModels(): Promise<string[]>;
}
