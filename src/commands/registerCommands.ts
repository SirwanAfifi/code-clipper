import * as vscode from "vscode";
import { WorkItemTreeDataProvider } from "../tree/TechDebtTreeDataProvider";
import { WorkItemTreeItem } from "../tree/TechDebtTreeItem";
import { WorkItem } from "../models/TechDebtItem";
import { ObsidianService } from "../services/ObsidianService";
import { CopilotService } from "../services/CopilotService";
import { getDateStr, getIsoStr } from "../utils/dateUtils";

const STORAGE_KEY = "codeclipper.workItems";

export function registerCommands(
  context: vscode.ExtensionContext,
  workItemProvider: WorkItemTreeDataProvider
) {
  const updateWorkItemResolvedState = async (
    item: WorkItemTreeItem,
    resolved: boolean
  ) => {
    if (!item?.workItem) {
      vscode.window.showWarningMessage("No work item selected.");
      return;
    }
    try {
      const workItems: WorkItem[] = context.globalState.get(STORAGE_KEY) || [];
      const updatedWorkItems = workItems.map((d) =>
        d.id === item.workItem.id ? { ...d, resolved } : d
      );
      await context.globalState.update(STORAGE_KEY, updatedWorkItems);
      workItemProvider.refresh();
    } catch (error) {
      vscode.window.showErrorMessage("Failed to update work item state.");
      console.error(error);
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "codeclipper.toggleResolved",
      async (item: WorkItemTreeItem) => {
        await updateWorkItemResolvedState(item, true);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "codeclipper.toggleUnresolved",
      async (item: WorkItemTreeItem) => {
        await updateWorkItemResolvedState(item, false);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codeclipper.searchWorkItem", async () => {
      const query = await vscode.window.showInputBox({
        prompt: "Search Work Item (by title, scope, priority, or file)",
        placeHolder: "Type to filter...",
      });
      workItemProvider.setSearchQuery(query || "");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codeclipper.clipForObsidian", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showErrorMessage("Please select some code to clip.");
        return;
      }

      const document = editor.document;
      const selectedCode = document.getText(selection);
      const filePath = document.uri.fsPath;
      const startLine = selection.start.line + 1;
      const endLine = selection.end.line + 1;

      const workItemName = await vscode.window.showInputBox({
        prompt: "Work Item Name / Title",
        placeHolder: "e.g. RefactorLoginModule",
        validateInput: (v) => (v.trim() ? undefined : "Title is required"),
      });

      if (!workItemName) {
        return;
      }

      let description = "";
      const suggestWithCopilot = "$(rocket) Suggest with Copilot";
      const userChoice = await vscode.window.showQuickPick(
        ["Type manually", suggestWithCopilot],
        { placeHolder: "How do you want to provide the description?" }
      );
      if (!userChoice) {
        return;
      }

      if (userChoice === suggestWithCopilot) {
        try {
          description = await CopilotService.suggestDescription(selectedCode);
        } catch {
          vscode.window.showWarningMessage("Copilot suggestion failed.");
        }
      }

      if (!description) {
        description =
          (await vscode.window.showInputBox({
            prompt: "Description (explain the issue, tech debt, or context)",
            placeHolder: "Describe the problem or context...",
            ignoreFocusOut: true,
            validateInput: (v) =>
              v.trim() ? undefined : "Description is required",
          })) || "";
        if (!description) {
          return;
        }
      }

      const priority = await vscode.window.showQuickPick(
        ["High", "Medium", "Low"],
        { placeHolder: "Priority" }
      );
      if (!priority) {
        return;
      }

      const scope = await vscode.window.showQuickPick(
        ["Frontend", "Backend", "FullStack", "DevOps", "Documentation"],
        { placeHolder: "Scope" }
      );
      if (!scope) {
        return;
      }

      const config = vscode.workspace.getConfiguration();
      let vault = config.get<string>("codeclipper.obsidianVault");
      if (!vault) {
        vault = await vscode.window.showInputBox({
          prompt: "Enter your Obsidian vault name",
          placeHolder: "MyVault",
          validateInput: (v) =>
            v.trim() ? undefined : "Vault name is required",
        });
        if (!vault) {
          return;
        }
        await config.update(
          "codeclipper.obsidianVault",
          vault,
          vscode.ConfigurationTarget.Global
        );
      }

      const folder =
        config.get<string>("codeclipper.defaultFolder") || "Technical Debt";
      const tags = config.get<string[]>("codeclipper.frontmatterTags") || [
        "techdebt",
        "clipped",
      ];

      const safeTitle =
        workItemName.replace(/[^a-zA-Z0-9-_]/g, "") || "Untitled";
      const noteFile = `${folder}/${getDateStr()}-${safeTitle}.md`;

      const vscodeLink = `vscode://file/${encodeURIComponent(
        filePath
      )}:${startLine}`;
      const lang = document.languageId || "";

      const frontmatter = [
        "---",
        `file_path: "${filePath}"`,
        `location: "lines ${startLine}-${endLine}"`,
        `priority: "${priority}"`,
        `scope: "${scope}"`,
        `clipped_at: "${getIsoStr()}"`,
        `tags: [${tags.join(", ")}]`,
        "---",
      ].join("\n");

      const noteContent = ObsidianService.formatNoteContent({
        frontmatter,
        description,
        vscodeLink,
        lang,
        selectedCode,
      });

      try {
        await vscode.env.clipboard.writeText(noteContent);
      } catch (e) {
        vscode.window.showErrorMessage(
          "Failed to copy note content to clipboard."
        );
        console.error(e);
      }

      const placeholderContent = `${frontmatter}\n\n${description}\n\n**If you are using Obsidian 1.7.2 or above, the full content will be pasted automatically. If not, please paste the clipboard content below.**\n\n[open the code](${vscodeLink})\n\n\`\`\`${lang}\n// Paste your code here\n\`\`\``;

      try {
        await ObsidianService.sendNoteToObsidian({
          noteContent,
          placeholderContent,
          noteFile,
          vault,
        });
      } catch (e) {
        vscode.window.showErrorMessage("Failed to send note to Obsidian.");
        console.error(e);
      }

      const storeWorkItems = config.get<boolean>(
        "codeclipper.storeWorkItems",
        true
      );
      if (storeWorkItems) {
        const workItem: WorkItem = {
          id: `${Math.random().toString(36).slice(2)}-${Date.now()}`,
          title: workItemName,
          filePath,
          date: getIsoStr(),
          priority,
          scope,
          resolved: false,
          startLine,
          endLine,
        };
        const existingWorkItems: WorkItem[] =
          context.globalState.get(STORAGE_KEY) || [];
        existingWorkItems.push(workItem);
        await context.globalState.update(STORAGE_KEY, existingWorkItems);
        workItemProvider.refresh();
      }

      vscode.window.showInformationMessage(
        `Clipped work item "${workItemName}" successfully.`
      );
    })
  );
}
