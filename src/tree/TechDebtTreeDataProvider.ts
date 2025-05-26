import * as vscode from "vscode";
import { WorkItem } from "../models/TechDebtItem";
import { WorkItemTreeItem } from "./TechDebtTreeItem";
import { GroupNode } from "./GroupNode";

const STORAGE_KEY = "codeclipper.workItems";
const SORT_ORDER_KEY = "codeclipper.sortOrder";

type SortOrder = "priority" | "date" | "title" | "scope";

export class WorkItemTreeDataProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    vscode.TreeItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private searchQuery = "";

  constructor(private readonly context: vscode.ExtensionContext) {}

  setSearchQuery(query: string) {
    this.searchQuery = query.trim().toLowerCase();
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    const allWorkItems: WorkItem[] =
      this.context.globalState.get(STORAGE_KEY) || [];

    // Filter by search query
    const filtered = this.searchQuery
      ? allWorkItems.filter((item) => {
          const q = this.searchQuery;
          return (
            item.title.toLowerCase().includes(q) ||
            item.scope.toLowerCase().includes(q) ||
            item.priority.toLowerCase().includes(q) ||
            item.filePath.toLowerCase().includes(q)
          );
        })
      : allWorkItems;

    // Sort order
    const config = vscode.workspace.getConfiguration();
    const sortOrder = config.get<string>(
      SORT_ORDER_KEY,
      "priority"
    ) as SortOrder;

    const sortItems = (a: WorkItem, b: WorkItem): number => {
      const priorityOrder: Record<string, number> = {
        High: 0,
        Medium: 1,
        Low: 2,
      };

      switch (sortOrder) {
        case "priority":
          if (a.priority !== b.priority) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          return new Date(b.date).getTime() - new Date(a.date).getTime();

        case "date":
          return new Date(b.date).getTime() - new Date(a.date).getTime();

        case "title":
          return a.title.localeCompare(b.title);

        case "scope":
          if (a.scope !== b.scope) {
            return a.scope.localeCompare(b.scope);
          }
          return new Date(b.date).getTime() - new Date(a.date).getTime();

        default:
          return 0;
      }
    };

    // Grouping
    if (!element) {
      const unresolvedCount = filtered.filter((w) => !w.resolved).length;
      const resolvedCount = filtered.length - unresolvedCount;

      return [
        new GroupNode(`Unresolved (${unresolvedCount})`, "unresolved"),
        new GroupNode(`Resolved (${resolvedCount})`, "resolved"),
      ];
    }

    if (element instanceof GroupNode) {
      const group = element.group;
      const grouped = filtered.filter((item) =>
        group === "resolved" ? item.resolved : !item.resolved
      );
      return grouped.sort(sortItems).map((item) => new WorkItemTreeItem(item));
    }

    return [];
  }
}
