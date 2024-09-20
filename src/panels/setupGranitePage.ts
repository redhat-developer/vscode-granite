import * as fs from 'fs';
import {
  CancellationError,
  commands,
  Disposable,
  ExtensionMode,
  Uri,
  ViewColumn,
  Webview,
  WebviewPanel,
  window,
} from "vscode";
import { ProgressData } from "../commons/progressData";
import { IModelServer } from "../modelServer";
import { OllamaServer } from "../ollama/ollamaServer";
import { getNonce } from "../utilities/getNonce";
import { getUri } from "../utilities/getUri";

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
export class SetupGranitePage {
  public static currentPanel: SetupGranitePage | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];
  private _fileWatcher: fs.FSWatcher | undefined;

  /**
   * The HelloWorldPanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
  private constructor(panel: WebviewPanel, extensionUri: Uri, extensionMode: ExtensionMode) {
    this._panel = panel;

    // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
    // the panel or when the panel is closed programmatically)
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Set the HTML content for the webview panel
    this._panel.webview.html = this._getWebviewContent(
      this._panel.webview,
      extensionUri
    );

    // Set an event listener to listen for messages passed from the webview context
    this._setWebviewMessageListener(this._panel.webview);

    if (extensionMode === ExtensionMode.Development) {
      this._setupFileWatcher(extensionUri);
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
  public static render(extensionUri: Uri, extensionMode: ExtensionMode) {
    if (SetupGranitePage.currentPanel) {
      // If the webview panel already exists reveal it
      SetupGranitePage.currentPanel._panel.reveal(ViewColumn.One);
    } else {
      // If a webview panel does not already exist create and show a new one
      const panel = window.createWebviewPanel(
        // Panel view type
        "modelSetup",
        // Panel title
        "Setup IBM Granite Code",
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

      SetupGranitePage.currentPanel = new SetupGranitePage(panel, extensionUri, extensionMode);
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
          <title>Granite Code</title>
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
    const server = new OllamaServer();

    webview.onDidReceiveMessage(
      async (message: any) => {
        const command = message.command;
        const data = message.data;
        let ollamaInstalled: boolean | undefined;
        switch (command) {
          case "init":
            webview.postMessage({
              command: "init",
              data: {
                installModes: await server.supportedInstallModes(),
              },
            });
            break;
          case "installOllama":
            await server.installServer(data.mode);
            break;
          case "fetchStatus":
            const now = new Date().getTime();
            // Careful here, we're receiving 2 messages in Dev mode on useEffect, because <App> is wrapped with <React.StrictMode>
            // see https://stackoverflow.com/questions/60618844/react-hooks-useeffect-is-called-twice-even-if-an-empty-array-is-used-as-an-ar

            if (this.debounceStatus > 0) {
              const elapsed = now - this.debounceStatus;
              if (elapsed < 1000) {
                console.log("Debouncing fetchStatus :" + elapsed);
                break;
              }
            }
            this.debounceStatus = now;

            // console.log("Received fetchStatus msg " + debounceStatus);
            let models: string[];
            try {
              models = await server.listModels();
              ollamaInstalled = true;
            } catch (e) {
              //TODO check error response code instead?
              models = [];
              if (!ollamaInstalled) {
                //fall back to checking CLI
                ollamaInstalled = await server.isServerInstalled();
                if (ollamaInstalled) {
                  try {
                    await server.startServer();
                    models = await server.listModels();
                  } catch (e) {}
                }
              }
            }
            //TODO check selected models statuses
            //Respond with configuration status when init command is received
            webview.postMessage({
              command: "status",
              data: {
                ollamaInstalled,
                models,
              },
            });
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
              await setupGranite(data as GraniteConfiguration, reportProgress);
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

}

type GraniteConfiguration = {
  tabModelId: string;
  chatModelId: string;
  embeddingsModelId: string;
};




async function setupGranite(
  graniteConfiguration: GraniteConfiguration, reportProgress: (progress: ProgressData) => void): Promise<void> {
  //TODO handle continue (conflicting) onboarding page

  console.log("Starting Granite Code AI-Assistant...");
  const modelServer: IModelServer = new OllamaServer();

  //collect all unique models to install, from graniteConfiguration
  const modelsToInstall = new Set([graniteConfiguration.chatModelId, graniteConfiguration.tabModelId, graniteConfiguration.embeddingsModelId]);

  try {
    for (const model of modelsToInstall) {
      if (await modelServer.isModelInstalled(model)) {
        console.log(`${model} is already installed`);
      } else {
        await modelServer.installModel(model, reportProgress);
      }
    }

    modelServer.configureAssistant(
      graniteConfiguration.chatModelId,
      graniteConfiguration.tabModelId,
      graniteConfiguration.embeddingsModelId
    );
  } catch (error) {
    //if error is CancellationError, then we can ignore it
    if (error instanceof CancellationError) {
      return;
    }
    throw error;
  }

  commands.executeCommand("continue.continueGUIView.focus");

}
