import { vscode } from "./utilities/vscode";
import "./App.css";
import { useCallback, useEffect, useState } from "react";
import ModelList, { ModelOption } from "./ModelList";
import { FcCancel, FcCheckmark } from "react-icons/fc";
import { ProgressData } from "../../src/commons/progressData";


function App() {
  const modelOptions: ModelOption[] = [
    { label: 'granite-code:3b', value: 'granite-code:3b', info: '2.0 GB' },
    { label: 'granite-code:8b', value: 'granite-code:8b', info: '4.6 GB' },
    { label: 'granite-code:20b', value: 'granite-code:20b', info: '12 GB' },
    { label: 'granite-code:34b', value: 'granite-code:34b', info: '19 GB' }
  ];
  const embeddingsOptions: ModelOption[] = [
    { label: 'nomic-embed-text', value: 'nomic-embed-text', info: '274 MB' }
  ];
  const [tabModel, setTabModel] = useState<string | null>(modelOptions[0].value);
  const [chatModel, setChatModel] = useState<string | null>(modelOptions[2].value);
  const [embeddingsModel, setEmbeddingsModel] = useState<string | null>(embeddingsOptions[0].value);

  const [modelPullProgress, setModelPullProgress] = useState<{
    [key: string]: ProgressData | undefined
  }>({});

  const [status, setStatus] = useState<string>('Unknown');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [installationModes, setInstallationModes] = useState<{id:string, label:string}[]>([]);

  const [enabled, setEnabled] = useState<boolean>(true);

  const isModelAvailable = useCallback((model: string | null): boolean => {
    if (!model) {
      return false;
    }
    if (!model.includes(':')) {
      model = model + ':latest';
    }
    const result = availableModels && availableModels.length > 0 && availableModels.includes(model);
    return result;
  }, [availableModels]);

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

        break;
      }
      case 'pull-progress': {
        const progress = payload.data.progress as ProgressData;
        const pulledModelName = progress.key;
        setModelPullProgress(prevProgress => ({
          ...prevProgress,
          [pulledModelName]: progress
        }));
        break;
      }
      case 'page-update': {
        const disabled = payload.data.installing;
        console.log(`${disabled ? 'dis' : 'en'}abling components`);
        setEnabled(!disabled);
        break;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    init();
    requestStatus();

    return () => {
      if (ollamaStatusChecker) {
        clearTimeout(ollamaStatusChecker);
      }
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  useEffect(() => {
    if (status === "installed" && modelOptions.every(model => isModelAvailable(model.value))) {
      console.log("Clearing ollamaStatusChecker");
      if (ollamaStatusChecker) {
        clearTimeout(ollamaStatusChecker);
      }
    } else {
      ollamaStatusChecker = setTimeout(requestStatus, REFETCH_MODELS_INTERVAL_MS);
    }

    return () => {
      if (ollamaStatusChecker) {
        clearTimeout(ollamaStatusChecker);
      }
    };
  }, [status, availableModels]);

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
        onChange={(e) => setChatModel(e?.value ?? null)}
        status={isModelAvailable(chatModel)}
        options={modelOptions}
        progress={chatModel ? modelPullProgress[chatModel] : undefined}
        disabled={!enabled}
      />

      <ModelList
        label="Tab completion model"
        value={tabModel}
        onChange={(e) => setTabModel(e?.value ?? null)}
        status={isModelAvailable(tabModel)}
        options={modelOptions}
        progress={tabModel ? modelPullProgress[tabModel] : undefined}
        disabled={!enabled}
      />

      <ModelList
        label="Embeddings model"
        value={embeddingsModel}
        onChange={(e) => setEmbeddingsModel(e?.value ?? null)}
        status={isModelAvailable(embeddingsModel)}
        options={embeddingsOptions}
        progress={embeddingsModel ? modelPullProgress[embeddingsModel] : undefined}
        disabled={!enabled}
      />

      <div className="final-setup-group">
        <button className="install-button" onClick={handleSetupGraniteClick} disabled={status !== 'installed' || !enabled}>Setup Granite Code</button>
      </div>
    </main>
  );
}

export default App;
