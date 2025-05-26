export interface FormatNoteOptions {
  frontmatter: string;
  description: string;
  vscodeLink: string;
  lang: string;
  selectedCode: string;
}

export interface SendNoteOptions {
  noteContent: string;
  placeholderContent: string;
  noteFile: string;
  vault: string;
}
