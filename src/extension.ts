import { commands, ExtensionContext } from "vscode";
import { isDevMode } from "./commons/constants";
import { SetupGranitePage } from "./panels/setupGranitePage";
import { Telemetry } from "./telemetry";

export async function activate(context: ExtensionContext) {
  await Telemetry.initialize(context);
  const setupGraniteCmd = commands.registerCommand("paver.setup", async () => {
    await Telemetry.send("paver.commands.setup");
    SetupGranitePage.render(context);
  });
  context.subscriptions.push(setupGraniteCmd);
  const hasRunBefore = context.globalState.get('hasRunSetup', false);

  if (!hasRunBefore || isDevMode) {
    await context.globalState.update('hasRunSetup', true);
    return commands.executeCommand('paver.setup');
  }
}