export interface WorkItem {
  id: string;
  title: string;
  filePath: string;
  date: string;
  priority: string;
  scope: string;
  resolved: boolean;
  startLine: number;
  endLine: number;
}
