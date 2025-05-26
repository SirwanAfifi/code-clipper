import * as vscode from "vscode";
import { WorkItem } from "../models/TechDebtItem";

export class WorkItemTreeItem extends vscode.TreeItem {
  constructor(public readonly workItem: WorkItem) {
    super(workItem.title, vscode.TreeItemCollapsibleState.None);

    this.tooltip = WorkItemTreeItem.createTooltip(workItem);
    this.description = `${workItem.scope} • ${workItem.priority}`;
    this.contextValue = workItem.resolved ? "resolved" : "unresolved";

    // Use accessible icons with VS Code theming support
    const iconId = workItem.resolved ? "check" : "circle-large-outline";
    const themeColor = new vscode.ThemeColor(
      workItem.resolved ? "testing.iconPassed" : "testing.iconUnset"
    );
    this.iconPath = new vscode.ThemeIcon(iconId, themeColor);

    this.resourceUri = vscode.Uri.file(workItem.filePath);

    // Clicking the item opens the file at the correct line
    this.command = {
      title: "Open File at Line",
      command: "vscode.open",
      arguments: [
        vscode.Uri.file(workItem.filePath).with({
          fragment: `L${workItem.startLine}`,
        }),
      ],
    };
  }

  private static createTooltip(workItem: WorkItem): vscode.MarkdownString {
    const fileName = workItem.filePath.split(/[\\/]/).pop() ?? "unknown";
    const fileUri = vscode.Uri.file(workItem.filePath).with({
      fragment: `L${workItem.startLine}`,
    });

    const markdown = new vscode.MarkdownString(
      [
        `**${workItem.title}**`,
        `---`,
        `|  |  |`,
        `|---|---|`,
        `| $(file) **File:** | [${fileName}:${workItem.startLine}-${
          workItem.endLine
        }](${fileUri.toString()}) |`,
        `| $(calendar) **Date:** | ${new Date(
          workItem.date
        ).toLocaleString()} |`,
        `| $(tag) **Scope:** | \`${workItem.scope}\` |`,
        `| $(star-full) **Priority:** | ${workItem.priority} |`,
        `| $(check) **Resolved:** | ${workItem.resolved ? "Yes" : "No"} |`,
        `---`,
        `$(info) _Right-click for more actions. Hover for details._`,
      ].join("\n"),
      true
    );

    markdown.supportHtml = false;
    markdown.isTrusted = true;

    return markdown;
  }
}
