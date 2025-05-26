import * as vscode from "vscode";
import { WorkItemTreeDataProvider } from "./tree/TechDebtTreeDataProvider";
import { registerCommands } from "./commands/registerCommands";

export function activate(context: vscode.ExtensionContext) {
  const workItemProvider = new WorkItemTreeDataProvider(context);
  vscode.window.createTreeView("codeclipper.workItemChecklist", {
    treeDataProvider: workItemProvider,
  });

  registerCommands(context, workItemProvider);

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("codeclipper.sortOrder")) {
      workItemProvider.refresh();
    }
  });
}

export function deactivate() {}
