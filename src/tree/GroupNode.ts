import * as vscode from "vscode";

export type GroupType = "resolved" | "unresolved";

export class GroupNode extends vscode.TreeItem {
  constructor(label: string, public readonly group: GroupType) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);

    this.contextValue = group;

    const themeColor =
      group === "resolved"
        ? new vscode.ThemeColor("testing.iconPassed")
        : new vscode.ThemeColor("testing.iconUnset");

    const iconId = group === "resolved" ? "check" : "circle-large-outline";

    this.iconPath = new vscode.ThemeIcon(iconId, themeColor);

    this.tooltip = group === "resolved" ? "Resolved Items" : "Unresolved Items";
    this.description = group.charAt(0).toUpperCase() + group.slice(1);
  }
}
