import { vscode } from "./utilities/vscode";
import "./App.css";
import { useCallback, useEffect, useState } from "react";
import ModelList from "./ModelList";
import { FcCancel, FcCheckmark } from "react-icons/fc";
import { ProgressData } from "../../src/commons/progressData";


function App() {
  const modelOptions: string[] = ['granite-code:3b', 'granite-code:8b', 'granite-code:20b', 'granite-code:34b'];
  const embeddingsOptions: string[] = ['nomic-embed-text'];
  const [tabModel, setTabModel] = useState<string>(modelOptions[0]);
  const [chatModel, setChatModel] = useState<string>(modelOptions[2]);

  const [embeddingsModel, setEmbeddingsModel] = useState<string>(embeddingsOptions[0]);

  const [chatModelPullProgress, setChatModelPullProgress] = useState<ProgressData | undefined>();
  const [tabModelPullProgress, setTabModelPullProgress] = useState<ProgressData | undefined>();
  const [embeddingsModelPullProgress, setEmbeddingsModelPullProgress] = useState<ProgressData | undefined>();

  const [status, setStatus] = useState<string>('Unknown');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [installationModes, setInstallationModes] = useState<{id:string, label:string}[]>([]);

  const [enabled, setEnabled] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function isAvailable(model: string): boolean {
    if (!model.includes(':')) {
      model = model + ':latest';
    }
    let result = availableModels && availableModels.length > 0 && availableModels.includes(model);
    return result;
  }

  function requestStatus(): void {
    vscode.postMessage({
      command: 'fetchStatus'
    });
  }

  function init(): void {
    vscode.postMessage({
      command: 'init'
    });
  }

  function handleInstallOllama(mode: string) {
    vscode.postMessage({
      command: "installOllama",
      data: {
          mode,
      }
    });
  }

  function handleSetupGraniteClick() {
    vscode.postMessage({
      command: "setupGranite",
      data: {
        tabModelId: tabModel,
        chatModelId: chatModel,
        embeddingsModelId: embeddingsModel
      }
    });
  }
  const REFETCH_MODELS_INTERVAL_MS = 1500;
  let ollamaStatusChecker: NodeJS.Timeout | undefined;

  const handleMessage = useCallback((event: any) => {
    const payload = event.data;
    //console.log(`Received event ${JSON.stringify(payload)}`);
    const command: string | undefined = payload.command;
    if (!command) {
      return;
    }
    switch (command) {
      case 'init': {
        const data = payload.data;
        setInstallationModes(data.installModes);
        break;
      }
      case 'status': {
        const data = payload.data; // The JSON data our extension sent
        setStatus(data.ollamaInstalled ? "installed" : "Not installed");
        setAvailableModels(data.models);

        //If everything is installed, clear the ollamaStatusChecker
        if (status === "installed" && modelOptions.filter(isAvailable)?.length === modelOptions.length) {
          console.log("Clearing ollamaStatusChecker");
          ollamaStatusChecker = undefined;
        } else {
          ollamaStatusChecker = setTimeout(
            requestStatus,
            REFETCH_MODELS_INTERVAL_MS,
          );
        }
        break;
      }
      case 'pull-progress': {
        const progress = payload.data.progress as ProgressData;
        const pulledModelName = progress.key;
        const error = payload.data.error;
        //const progressData = data.progress as ProgressData;
        //find the ModelList component with the modelName value and update the progress
        //console.log(`Received pull-progress event ${pulledModelName} : ${progress}`);
        //console.log(`pulledModelName: ${pulledModelName} VS chatModel: ${chatModel}, tabModel: ${tabModel}, embeddingsModel: ${embeddingsModel}`);
        if (error) {
          setErrorMessage(`Error pulling model: ${error.message}`);
          return;
        }
        if (pulledModelName === chatModel) {
          //console.log(`Updating chat model progress to ${progress}`);
          setChatModelPullProgress(progress);
        }
        if (pulledModelName === tabModel) {
          //console.log(`Updating tab model progress to ${progress}`);
          setTabModelPullProgress(progress);
        }
        if (pulledModelName === embeddingsModel) {
          //console.log(`Updating embeddings model progress to ${progress}`);
          setEmbeddingsModelPullProgress(progress);
        }
        break;
      }
      case 'page-update': {
        const disabled = payload.data.installing;
        console.log(`${disabled ? 'dis' : 'en'}abling components`);
        setEnabled(!disabled);
        break;
      }
    }
  }, [chatModel, tabModel, embeddingsModel]);

  // Effect to send the init message when the component is mounted
  useEffect(() => {
  // Listener for receiving messages from vscode
    window.addEventListener('message', handleMessage);

    // Send init message to vscode
    init();
    requestStatus();

    return () => {
      // When the component is unmounted, clear the ollamaStatusChecker and remove the event listener
      if (ollamaStatusChecker) {
        clearTimeout(ollamaStatusChecker);
      }
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  return (
    <main>
      <h1>Setup IBM Granite Code as your code assistant with Continue</h1>

      <div className="form-group">
        {status === 'installed' ? <FcCheckmark /> : <FcCancel />}
        <label>Ollama status:</label>
        <span>{status}</span>
          {/* New section for additional buttons */}
          {status !== 'installed' && installationModes.length > 0 && (
          <div className="install-options">
            <p><span>This page will refresh once Ollama is installed.</span></p>
            {installationModes.map((mode) => (
              <button
                key={mode.id}
                className="install-button"
                onClick={() => handleInstallOllama(mode.id)}
                disabled={!enabled}
              >
                {mode.label}
              </button>
            ))}
            </div>
          )}
      </div>

      {/* FIXME align labels and selects */}
      <ModelList
        label="Chat model"
        value={chatModel}
        onChange={(e) => setChatModel(e.target.value)}
        status={isAvailable(chatModel)}
        options={modelOptions}
        progress={chatModelPullProgress}
        disabled={!enabled}
      />
      {/*TODO display embedded progress bar while model is being pulled? Add pull button? */}

      <ModelList
        label="Tab completion model"
        value={tabModel}
        onChange={(e) => setTabModel(e.target.value)}
        status={isAvailable(tabModel)}
        options={modelOptions}
        progress={tabModelPullProgress}
        disabled={!enabled}
      />
      {/*TODO display embedded progress bar while model is being pulled? Add pull button? */}

      <ModelList
        label="Embeddings model"
        value={embeddingsModel}
        onChange={(e) => setEmbeddingsModel(e.target.value)}
        status={isAvailable(embeddingsModel)}
        options={embeddingsOptions}
        progress={embeddingsModelPullProgress}
        disabled={!enabled}
      />
      {/*TODO display embedded progress bar while model is being pulled? Add pull button? */}

      <div className="form-group">
        <button className="install-button" onClick={handleSetupGraniteClick} disabled={status !== 'installed' || !enabled}>Install Granite Code</button>
      </div>
    </main>
  );
}

export default App;
