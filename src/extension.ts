import { commands, ExtensionContext } from "vscode";
import { SetupGranitePage } from "./panels/setupGranitePage";
import { Telemetry } from "./telemetry";

export async function activate(context: ExtensionContext) {
  await Telemetry.initialize(context);
  const setupGraniteCmd = commands.registerCommand("vscode-granite.setup", async () => {
    await Telemetry.send("granite.commands.setup");
    SetupGranitePage.render(context.extensionUri, context.extensionMode);
  });
  context.subscriptions.push(setupGraniteCmd);
  // TODO check initial startup status
  return commands.executeCommand('vscode-granite.setup');
}