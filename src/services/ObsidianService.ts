import * as vscode from "vscode";
import { FormatNoteOptions, SendNoteOptions } from "../models/Obsidian";

export class ObsidianService {
  static formatNoteContent({
    frontmatter,
    description,
    vscodeLink,
    lang,
    selectedCode,
  }: FormatNoteOptions): string {
    return `${frontmatter.trim()}

${description.trim()}

[open the code](${vscodeLink})

\`\`\`${lang}
${selectedCode}
\`\`\``;
  }

  static async sendNoteToObsidian({
    noteContent,
    placeholderContent,
    noteFile,
    vault,
  }: SendNoteOptions): Promise<void> {
    try {
      await vscode.env.clipboard.writeText(noteContent);

      const obsidianUri = vscode.Uri.parse(
        `obsidian://new` +
          `?vault=${encodeURIComponent(vault)}` +
          `&file=${encodeURIComponent(noteFile)}` +
          `&content=${encodeURIComponent(placeholderContent)}` +
          `&clipboard`
      );

      const success = await vscode.env.openExternal(obsidianUri);
      if (!success) {
        vscode.window.showWarningMessage(
          "Failed to open Obsidian. The note is still copied to your clipboard."
        );
      } else {
        vscode.window.showInformationMessage(
          "Note sent to Obsidian. If you're using Obsidian 1.7.2 or above, the content will auto-paste. Otherwise, manually paste from your clipboard."
        );
      }
    } catch (error) {
      console.error("ObsidianService.sendNoteToObsidian error:", error);
      vscode.window.showErrorMessage(
        "Failed to send the note to Obsidian. Please try again or paste manually from the clipboard."
      );
    }
  }
}
