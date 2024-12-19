import * as fs from 'fs';
import { env } from 'process';
import {
  CancellationError,
  commands,
  Disposable,
  ExtensionContext,
  Uri,
  ViewColumn,
  Webview,
  WebviewPanel,
  window
} from "vscode";
import { isDevMode } from '../commons/constants';
import { DOWNLOADABLE_MODELS } from '../commons/modelRequirements';
import { ProgressData } from "../commons/progressData";
import { ModelStatus, ServerStatus } from '../commons/statuses';
import { IModelServer } from '../modelServer';
import { MockServer } from '../ollama/mockServer';
import { OllamaServer } from "../ollama/ollamaServer";
import { Telemetry } from '../telemetry';
import { getNonce } from "../utils/getNonce";
import { getUri } from "../utils/getUri";
import { getSystemInfo } from "../utils/sysUtils";

/**
 * This class manages the state and behavior of HelloWorld webview panels.
 *
 * It contains all the data and methods for:
 *
 * - Creating and rendering HelloWorld webview panels
 * - Properly cleaning up and disposing of webview resources when the panel is closed
 * - Setting the HTML (and by proxy CSS/JavaScript) content of the webview panel
 * - Setting message listeners so data can be passed between the webview and extension
 */

type GraniteConfiguration = {
  tabModelId: string | null;
  chatModelId: string | null;
  embeddingsModelId: string | null;
};

const useMockServer = env['MOCK_OLLAMA'] === 'true';

export class SetupGranitePage {
  public static currentPanel: SetupGranitePage | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];
  private _fileWatcher: fs.FSWatcher | undefined;
  private server: IModelServer;
  /**
   * The HelloWorldPanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
  private constructor(panel: WebviewPanel, context: ExtensionContext) {
    this._panel = panel;
    this.server = useMockServer ?
      new MockServer(300) :
      new OllamaServer(context);
    // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
    // the panel or when the panel is closed programmatically)
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Set the HTML content for the webview panel
    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      context.extensionUri
    );

    // Set an event listener to listen for messages passed from the webview context
    this._setWebviewMessageListener(this._panel.webview);

    if (isDevMode) {
      this._setupFileWatcher(context.extensionUri);
    }
  }

  private _setupFileWatcher(extensionUri: Uri) {
    const webviewsBuildPath = Uri.joinPath(extensionUri, "webviews", "build", "assets");
    const webviewsBuildFsPath = webviewsBuildPath.fsPath;
    console.log("Watching " + webviewsBuildFsPath);

    let debounceTimer: NodeJS.Timeout | null = null;
    const debounceDelay = 100; //100 ms

    this._fileWatcher = fs.watch(webviewsBuildFsPath, (_event, filename) => {
      if (filename) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
          console.log("File changed: " + filename + ", reloading webview");
          this.debounceStatus = 0;
          this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);
          debounceTimer = null;
        }, debounceDelay);
      }
    });

    // Add the file watcher to disposables
    this._disposables.push(new Disposable(() => {
      if (this._fileWatcher) {
        this._fileWatcher.close();
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    }));
  }

  /**
   * Renders the current webview panel if it exists otherwise a new webview panel
   * will be created and displayed.
   *
   * @param extensionUri The URI of the directory containing the extension.
   */
  public static render(context: ExtensionContext) {
    if (SetupGranitePage.currentPanel) {
      // If the webview panel already exists reveal it
      SetupGranitePage.currentPanel._panel.reveal(ViewColumn.One);
    } else {
      // If a webview panel does not already exist create and show a new one
      const extensionUri = context.extensionUri;
      const panel = window.createWebviewPanel(
        // Panel view type
        "modelSetup",
        // Panel title
        "Setup IBM Granite Models",
        // The editor column the panel should be displayed in
        ViewColumn.One,
        // Extra panel configurations
        {
          // Enable JavaScript in the webview
          enableScripts: true,
          // Restrict the webview to only load resources from the `out` and `webviews/build` directories
          localResourceRoots: [
            Uri.joinPath(extensionUri, "out"),
            Uri.joinPath(extensionUri, "webviews/build"),
          ],
        }
      );

      SetupGranitePage.currentPanel = new SetupGranitePage(panel, context);
    }
  }

  /**
   * Cleans up and disposes of webview resources when the webview panel is closed.
   */
  public dispose() {
    SetupGranitePage.currentPanel = undefined;

    // Dispose of the current webview panel
    this._panel.dispose();

    // Dispose of all disposables (including the file watcher)
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Defines and returns the HTML that should be rendered within the webview panel.
   *
   * @remarks This is also the place where references to the React webview build files
   * are created and inserted into the webview HTML.
   *
   * @param webview A reference to the extension webview
   * @param extensionUri The URI of the directory containing the extension
   * @returns A template string literal containing the HTML that should be
   * rendered within the webview panel
   */
  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    // The CSS file from the React build output
    const stylesUri = getUri(webview, extensionUri, [
      "webviews",
      "build",
      "assets",
      "index.css",
    ]);
    // The JS file from the React build output
    const scriptUri = getUri(webview, extensionUri, [
      "webviews",
      "build",
      "assets",
      "index.js",
    ]);

    const nonce = getNonce();

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />

          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src http://localhost">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>Granite Models</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  /**
   * Sets up an event listener to listen for messages passed from the webview context and
   * executes code based on the message that is recieved.
   *
   * @param webview A reference to the extension webview
   * @param context A reference to the extension context
   */
  private debounceStatus = 0;

  private _setWebviewMessageListener(webview: Webview) {

    webview.onDidReceiveMessage(
      async (message: any) => {
        const command = message.command;
        const data = message.data;

        switch (command) {
          case "init":
            webview.postMessage({
              command: "init",
              data: {
                installModes: await this.server.supportedInstallModes(),
                systemInfo: await getSystemInfo()
              },
            });
            break;
          case "installOllama":
            await this.server.installServer(data.mode);
            break;
          case "fetchStatus":
            const now = new Date().getTime();
            // Careful here, we're receiving 2 messages in Dev mode on useEffect, because <App> is wrapped with <React.StrictMode>
            // see https://stackoverflow.com/questions/60618844/react-hooks-useeffect-is-called-twice-even-if-an-empty-array-is-used-as-an-ar

            if (this.debounceStatus > 0) {
              const elapsed = now - this.debounceStatus;
              if (elapsed < 50) {
                console.log("Debouncing fetchStatus :" + elapsed);
                break;
              }
            }
            this.debounceStatus = now;

            this.publishStatus(webview);
            break;
          case "setupGranite":
            async function reportProgress(progress: ProgressData) {
              webview.postMessage({
                command: "pull-progress",
                data: {
                  progress,
                },
              });
            }
            webview.postMessage({
              command: "page-update",
              data: {
                installing: true
              },
            });
            try {
              await this.setupGranite(data as GraniteConfiguration, reportProgress, webview);
            } finally {
              webview.postMessage({
                command: "page-update",
                data: {
                  installing: false
                },
              });
            }
            return;
        }
      },
      undefined,
      this._disposables
    );
  }

  async getModelStatuses(): Promise<Map<string, ModelStatus>> {
    const modelStatuses: Map<string, ModelStatus> = new Map();
    await Promise.all(DOWNLOADABLE_MODELS.map(async (id) => {
      const status = await this.server.getModelStatus(id);
      modelStatuses.set(id, status);
    }));
    return modelStatuses;
  }

  async publishStatus(webview: Webview) {
    // console.log("Received fetchStatus msg " + debounceStatus);
    const serverStatus = await this.server.getStatus();
    if (serverStatus === ServerStatus.stopped) {
      // TODO Try starting the server automatically or let the user start it manually?
      // await this.server.startServer();
      // serverStatus = await this.server.getStatus();
    }
    const modelStatuses = await this.getModelStatuses();
    const modelStatusesObject = Object.fromEntries(modelStatuses); // Convert Map to Object
    webview.postMessage({
      command: "status",
      data: {
        serverStatus,
        modelStatuses: modelStatusesObject
      },
    });
  }

  async setupGranite(
    graniteConfiguration: GraniteConfiguration, reportProgress: (progress: ProgressData) => void, webview: Webview): Promise<void> {
    //TODO handle continue (conflicting) onboarding page

    console.log("Starting Granite AI-Assistant configuration...");
    const chatModel = graniteConfiguration.chatModelId;

    const tabModel = graniteConfiguration.tabModelId;
    const embeddingsModel = graniteConfiguration.embeddingsModelId;
    // Collect all unique models to install from graniteConfiguration
    const modelsToInstall: string[] = []; //I'd prefer using a sorted set but there's no such thing in vanilla typescript
    if (chatModel !== null && !modelsToInstall.includes(chatModel)) {
      modelsToInstall.push(chatModel);
    }
    if (tabModel !== null && !modelsToInstall.includes(tabModel)) {
      modelsToInstall.push(tabModel);
    }
    if (embeddingsModel !== null && !modelsToInstall.includes(embeddingsModel)) {
      modelsToInstall.push(embeddingsModel);
    }

    try {
      // Attempt to install the required models
      for (const model of modelsToInstall) {
        const modelStatus = await this.server.getModelStatus(model);
        if (modelStatus !== ModelStatus.installed) {
          if (modelStatus === ModelStatus.stale) {
            console.log(`${model} is already installed, it will be updated`);
          } else {
            console.log(`Installing ${model}`);
          }
          await this.server.installModel(model, reportProgress);
          this.publishStatus(webview);
          await Telemetry.send("paver.setup.model.install", { model });
        }
      }

      // After installing models, configure the assistant
      await this.server.configureAssistant(
        chatModel,
        tabModel,
        embeddingsModel
      );
      console.log("Granite AI-Assistant setup complete");
      await Telemetry.send("paver.setup.success", {
        chatModelId: chatModel ?? 'none',
        tabModelId: tabModel ?? 'none',
        embeddingsModelId: embeddingsModel ?? 'none',
      });
    } catch (error: any) {
      //if error is CancellationError, then we can ignore it
      if (error instanceof CancellationError || error?.name === "Canceled") {
        return;
      }
      // Generic error handling for all errors
      await Telemetry.send("paver.setup.error", {
        error: error?.message ?? 'unknown error',
        chatModelId: chatModel ?? 'none',
        tabModelId: tabModel ?? 'none',
        embeddingsModelId: embeddingsModel ?? 'none',
      });

      // Show a generic error message to the user
      window.showErrorMessage(`An error occurred during model setup: ${error.message ?? 'Unknown error'}`);

      // Rethrow the error after handling
      throw error;
    }

    // Display Continue Chat UI next
    commands.executeCommand("continue.continueGUIView.focus");
  }

}

