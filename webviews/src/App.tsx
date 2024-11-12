import { vscode } from "./utils/vscode";
import "./App.css";
import { useCallback, useEffect, useState } from "react";
import ModelList, { ModelOption } from "./ModelList";
import { ProgressData } from "../../src/commons/progressData";
import { getStandardName } from "../../src/commons/naming";
import { ModelStatus, ServerStatus } from "../../src/commons/statuses";
import { StatusCheck, StatusValue } from "./StatusCheck";

function App() {
  const modelOptions: ModelOption[] = [
    { label: 'granite-code:3b', value: 'granite-code:3b', info: '2.0 GB' },
    { label: 'granite-code:8b', value: 'granite-code:8b', info: '4.6 GB' },
    { label: 'granite-code:20b', value: 'granite-code:20b', info: '12 GB' },
    { label: 'granite-code:34b', value: 'granite-code:34b', info: '19 GB' },
    { label: 'Keep existing configuration', value: null, info: null }
  ];

  const tabOptions: ModelOption[] = [
    { label: 'granite-code:3b', value: 'granite-code:3b', info: '2.0 GB' },
    { label: 'granite-code:8b', value: 'granite-code:8b', info: '4.6 GB' },
    { label: 'Keep existing configuration', value: null, info: null }
  ];

  const embeddingsOptions: ModelOption[] = [
    { label: 'nomic-embed-text', value: 'nomic-embed-text:latest', info: '274 MB' },
    { label: 'Keep existing configuration', value: null, info: null }
  ];

  const [tabModel, setTabModel] = useState<string | null>(tabOptions[1].value); //use 8b by default
  const [chatModel, setChatModel] = useState<string | null>(modelOptions[1].value);//use 8b by default
  const [embeddingsModel, setEmbeddingsModel] = useState<string | null>(embeddingsOptions[0].value);

  const [modelPullProgress, setModelPullProgress] = useState<{
    [key: string]: ProgressData | undefined
  }>({});

  const [serverStatus, setServerStatus] = useState<ServerStatus>(ServerStatus.unknown);
  const [modelStatuses, setModelStatuses] = useState<Map<string, ModelStatus>>(new Map());
  const [installationModes, setInstallationModes] = useState<{ id: string, label: string, supportsRefresh: true }[]>([]);

  const [enabled, setEnabled] = useState<boolean>(true);

  const [isKeepExistingConfigSelected, setIsKeepExistingConfigSelected] = useState(false);

  const getModelStatus = useCallback((model: string | null): ModelStatus | null => {
    if (model === null) {
      return null;
    }
    const result = modelStatuses.get(getStandardName(model));
    return result ? result : ModelStatus.unknown;
  }, [modelStatuses]);

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
        console.log('received status ' + JSON.stringify(data));
        setServerStatus(data.serverStatus);
        setModelStatuses(new Map(Object.entries(data.modelStatuses)));
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
    if (serverStatus === ServerStatus.started && modelOptions.every(model => getModelStatus(model.value) === ModelStatus.installed)) {
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
  }, [serverStatus, modelStatuses]);

  const getServerIconType = useCallback((status: ServerStatus): StatusValue => {
    switch (status) {
      case ServerStatus.installing:
        return 'installing';
      case ServerStatus.stopped:
        return 'partial';
      case ServerStatus.started:
        return 'complete';
      case ServerStatus.missing:
      default:
        return 'missing';
    }
  }, [serverStatus]);

  const getServerStatusLabel = useCallback((status: ServerStatus): string => {
    switch (status) {
      case ServerStatus.unknown:
        return 'Checking...';
      case ServerStatus.installing:
        return 'Installing...';
      case ServerStatus.stopped:
        return 'Stopped';
      case ServerStatus.started:
        return 'Started';
      default:
        return 'Not Installed';
    }
  }, [serverStatus]);

  useEffect(() => {
    const checkKeepExistingConfig =
      chatModel === null &&
      tabModel === null &&
      embeddingsModel === null;

    setIsKeepExistingConfigSelected(checkKeepExistingConfig);
  }, [chatModel, tabModel, embeddingsModel]);

  return (
    <main className="main-wrapper">
      <h1 className="main-title">Setup IBM Granite Code as your code assistant with Continue</h1>

      <div className="main-description">
        <p className="m-0 mb-1">
          Run <a href="https://github.com/ibm-granite/granite-code-models" target="_blank" rel="noopener noreferrer">IBM Granite Code</a> models effortlessly with
          <a href="https://github.com/ollama/ollama" target="_blank" rel="noopener noreferrer"> Ollama</a> and <a href="https://github.com/continuedev/continue" target="_blank" rel="noopener noreferrer">Continue</a>.
          Granite will help you write, generate, explain or document code, while your data stays secure and private on your own machine.
        </p>
      </div>

      <div className="form-group-wrapper">
        <div className="form-group">
          <div className="ollama-status-wrapper">
            <label>
              <StatusCheck type={getServerIconType(serverStatus)} />
              <span>Ollama status:</span>
              <span>{getServerStatusLabel(serverStatus)}</span>
            </label>

            {/* New section for additional buttons */}
            {serverStatus === ServerStatus.missing && installationModes.length > 0 && (
              <div className="install-options">
                {installationModes.some(mode => mode.supportsRefresh === true) && (
                  <p><span>This page will refresh once Ollama is installed.</span></p>
                )}
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
        </div>

        <ModelList
          className="model-list"
          label="Chat model"
          value={chatModel}
          onChange={(e) => setChatModel(e?.value ?? null)}
          status={getModelStatus(chatModel)}
          options={modelOptions}
          progress={chatModel ? modelPullProgress[chatModel] : undefined}
          disabled={!enabled}
        />

        <ModelList
          className="model-list"
          label="Tab completion model"
          value={tabModel}
          onChange={(e) => setTabModel(e?.value ?? null)}
          status={getModelStatus(tabModel)}
          options={tabOptions}
          progress={tabModel ? modelPullProgress[tabModel] : undefined}
          disabled={!enabled}
        />

        <ModelList
          className="model-list"
          label="Embeddings model"
          value={embeddingsModel}
          onChange={(e) => setEmbeddingsModel(e?.value ?? null)}
          status={getModelStatus(embeddingsModel)}
          options={embeddingsOptions}
          progress={embeddingsModel ? modelPullProgress[embeddingsModel] : undefined}
          disabled={!enabled}
        />

        <div className="final-setup-group">
          <button className="install-button" onClick={handleSetupGraniteClick} disabled={serverStatus !== ServerStatus.started || !enabled || isKeepExistingConfigSelected}>
            Setup Granite Code
          </button>
        </div>
      </div>

      <div className="info-message">
        <p>
          To reopen this wizard, open the command palette and run:
          <p style={{ margin: 2, paddingLeft: 10 }}><strong>Paver: Setup Granite Code as code assistant</strong></p>.
        </p>
      </div>
    </main>
  );
}

export default App;