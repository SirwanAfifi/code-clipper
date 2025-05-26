import * as vscode from "vscode";

export class CopilotService {
  private static readonly TIMEOUT_MS = 10000;

  static async suggestDescription(code: string): Promise<string> {
    let suggestion = "";

    const controller = new vscode.CancellationTokenSource();
    const timeout = setTimeout(() => controller.cancel(), this.TIMEOUT_MS);

    try {
      const [model] = await vscode.lm.selectChatModels({
        vendor: "copilot",
        family: "gpt-4o",
      });

      if (!model) {
        return "Copilot unavailable.";
      }

      const messages = [
        vscode.LanguageModelChatMessage.User(
          `Suggest a concise, clear work item description for the following code. Respond with just the description, no markdown or code block:\n\n${code}`
        ),
      ];

      const chatResponse = await model.sendRequest(
        messages,
        {},
        controller.token
      );

      for await (const message of chatResponse.text) {
        suggestion += message;
      }

      suggestion = suggestion.trim();

      if (!suggestion) {
        return "No suggestion received from Copilot.";
      }

      return suggestion;
    } catch (error) {
      if (controller.token.isCancellationRequested) {
        return "Copilot request timed out.";
      }

      console.error("Copilot suggestion error:", error);
      return "Copilot unavailable or error occurred.";
    } finally {
      clearTimeout(timeout);
    }
  }
}
