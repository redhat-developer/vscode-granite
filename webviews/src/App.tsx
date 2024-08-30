import { vscode } from "./utilities/vscode";
import "./App.css";
import { useEffect, useState } from "react";
import ModelList from "./ModelList";

function handleSetupGraniteClick() {
  vscode.postMessage({
    command: "setupGranite",
    data: {
        tabModelId: "granite-code:3b",
        chatModelId: "granite-code:20b"
    }
  });
}
function App() {

  const modelOptions: string[] = ['granite-code:3b', 'granite-code:8b', 'granite-code:20b'];
  const [tabModel, setTabModel] = useState<string>(modelOptions[0]);
  const [chatModel, setChatModel] = useState<string>(modelOptions[2]);
  const [status, setStatus] = useState<string>('Unknown');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  function getStatus(model: string): string {
    if (availableModels && availableModels.length > 0) {
      return availableModels.includes(model)? "Installed" : "Not Installed";
    }
    return "Unknown";
  }

  // Effect to send the init message when the component is mounted
  useEffect(() => {
    console.log("Component mounted");
    // Listener for receiving messages from vscode
    function handleMessage(event: any) {
      const payload = event.data;
      console.log(`Received event ${JSON.stringify(payload)}`);
      const command: string | undefined = payload.command;
      if (!command) {
        return;
      }
      if (command === 'status') {
        const data = payload.data; // The JSON data our extension sent
        setStatus(data.ollamaInstalled ? "installed" : "Not installed");
        setAvailableModels(data.models);
      }
    }

    // Add event listener
    window.addEventListener('message', handleMessage);

    // Send init message to vscode
    vscode.postMessage({
      command: 'init',
      data: { init: true }
    });

    return () => window.removeEventListener('message', handleMessage);
  }, []);


  return (
    <main>
      <h1>Setup IBM Granite Code as your code assistant with Continue</h1>

      <div className="form-group">
        <label>Ollama status:</label>
        <span>{status}</span>
      </div>

      <ModelList
        label="Chat model"
        value={chatModel}
        onChange={(e) => setChatModel(e.target.value)}
        status={getStatus(chatModel)}
        options={modelOptions}
      />

      <ModelList
        label="Tab model"
        value={tabModel}
        onChange={(e) => setTabModel(e.target.value)}
        status={getStatus(tabModel)}
        options={modelOptions}
      />

      <div className="form-group">
        <button onClick={handleSetupGraniteClick}>Install Granite Code</button>
      </div>
    </main>
  );
}

export default App;
