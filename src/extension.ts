import * as vscode from 'vscode';
import { OllamaServer } from './ollamaServer';
import { IModelServer } from './modelServer';


//const MODEL_ID = 'qwen2:0.5b';
const MODEL_ID = 'granite-code:3b';

export async function activate(context: vscode.ExtensionContext) {

	const disposable = vscode.commands.registerCommand('vscode-granite.startup', startupGranite);
	const resp = await vscode.window.showInformationMessage(`Install ${MODEL_ID} as your code assistant`, 'Yes', 'No');
	if (resp === 'Yes') {
		vscode.commands.executeCommand('vscode-granite.startup');
	}
	context.subscriptions.push(disposable);
}


// This method is called when your extension is deactivated
export function deactivate() {}

async function startupGranite(): Promise<void> {

	//TODO use a setup wizard (webview)
	//TODO support installing ollama semi-automatically
	//TODO handle continue (conflicting) onboarding page

	console.log("Starting Granite Code AI-Assistant...");
	const modelServer: IModelServer = new OllamaServer();
	if (!(await modelServer.isServerInstalled())) {
		await modelServer.installServer();
	} else {
		// Start ollama if it's not running (ollama serve)
	}
	if (await modelServer.isModelInstalled(MODEL_ID)) {
		console.log(`${MODEL_ID} is already installed`);
	} else {
		await modelServer.installModel(MODEL_ID);
	}
	modelServer.configureAssistant(MODEL_ID);
}
