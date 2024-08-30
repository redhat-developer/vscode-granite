import { commands, ExtensionContext } from "vscode";
import { SetupGranitePage } from "./panels/setupGranitePage";

export function activate(context: ExtensionContext) {
  // Create the show hello world command
  const setupGraniteCmd = commands.registerCommand("vscode-granite.setup", () => {
    SetupGranitePage.render(context.extensionUri);
  });
  context.subscriptions.push(setupGraniteCmd);
  // TODO check initial startup status
  return commands.executeCommand('vscode-granite.setup');
}