export interface IModelServer {
    name: string;
    isServerInstalled(): Promise<boolean>;
    installServer(): Promise<boolean>;
    isModelInstalled(modelName: string): Promise<boolean>;
    installModel(modelName: string): Promise<any>;
    configureAssistant(modelName: string): Promise<void>;
}