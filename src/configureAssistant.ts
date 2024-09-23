/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

export interface AiAssistantConfigurationRequest {
  chatModelName: string | null;
  tabModelName: string | null;
  embeddingsModelName: string | null;
  inferenceEndpoint?: string;
  provider?: string;
  systemMessage?: string;
  contextLength?: number;
}

interface Model {
  title: string;
  model: string;
  apiBase: string;
  provider: string;
  completionOptions: any;
}

interface TabAutocompleteModel {
  title: string;
  model: string;
  provider?: string;
}

export class AiAssistantConfigurator {
  constructor(private request: AiAssistantConfigurationRequest) {}

  public async openWizard() {
    if (isContinueInstalled()) {
      await this.configureAssistant();
    } else {
      return; //await recommendContinue();
    }
  }

  async configureAssistant() {
    const model = {
      title: this.request.chatModelName,
      model: this.request.chatModelName,
      completionOptions: {},
      apiBase: this.request.inferenceEndpoint,
      provider: this.request.provider,
      contextLength: this.request.contextLength || 8192,
      systemMessage:
        this.request.systemMessage ||
        "You are a helpful AI assistant. You are a cautious assistant. You carefully follow instructions. You are helpful and harmless and you follow ethical guidelines and promote positive behavior.",
    } as Model;
    const configFile = path.join(os.homedir(), ".continue/config.json");
    const config = await readConfig(configFile);
    if (!config) {
      return vscode.window.showErrorMessage("No ~/.continue/config.json found");
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const models: Model[] = config.models === undefined ? [] : config.models;
    // check if model object is already in the config json
    let updateConfig = false;
    if (this.request.chatModelName) {
      const existing = models.find(
        (m) => model.provider === m.provider && model.apiBase === m.apiBase
      );
      if (existing) {
        if (existing.model !== model.model || existing.title !== model.title) {
          existing.model = model.model;
          existing.title = model.title;
          updateConfig = true;
        }
      } else {
        models.push(model);
        updateConfig = true;
      }
      config.models = models;
    }
    // Configure tab autocomplete model if it exists
    if (this.request.tabModelName) {
      const tabAutocompleteModel: TabAutocompleteModel = {
        title: this.request.tabModelName,
        model: this.request.tabModelName,
        provider: this.request.provider,
      };
      if (config.tabAutocompleteModel !== tabAutocompleteModel) {
        config.tabAutocompleteModel = tabAutocompleteModel;
        updateConfig = true;
      }
    }

    // Configure embeddings model if it exists
    if (this.request.embeddingsModelName) {
      const embeddingsProvider = {
        provider: 'ollama',
        model: this.request.embeddingsModelName,
      };
      if (config.embeddingsProvider !== embeddingsProvider) {
        config.embeddingsProvider = embeddingsProvider;
        updateConfig = true;
      }
    }
    if (updateConfig) {
      await writeConfig(configFile, config);
      vscode.window.showInformationMessage(
        `${model.model} added to ${configFile}`
      );
    }
  }
}

export const CONTINUE_EXTENSION_ID = "Continue.continue";

function isContinueInstalled(): boolean {
  const continueExt = vscode.extensions.getExtension(CONTINUE_EXTENSION_ID);
  return continueExt !== undefined;
}

async function readConfig(configFile: string): Promise<any> {
  try {
    await fs.access(configFile, fs.constants.R_OK);
  } catch (error) {
    throw new Error(`Config file ${configFile} not found.`);
  }
  const configContent = await fs.readFile(configFile, "utf8");
  if (!configContent) {
    return {};
  }
  const configData = JSON.parse(configContent);
  return configData;
}

async function writeConfig(configFile: string, config: any): Promise<void> {
  try {
    //const insertSpaces = vscode.workspace.getConfiguration().get<boolean>('editor.insertSpaces');
    const tabSize = vscode.workspace
      .getConfiguration()
      .get<number>("editor.tabSize");
    const configContent = JSON.stringify(config, null, tabSize);
    return fs.writeFile(configFile, configContent, "utf8");
  } catch (error) {
    throw new Error(`Config file ${configFile} not found.`);
  }
}
