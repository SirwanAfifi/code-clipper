import * as cp from "child_process";
import * as path from "path";

export async function getGitBranch(
  filePath: string
): Promise<string | undefined> {
  return new Promise((resolve) => {
    cp.exec(
      "git branch --show-current",
      { cwd: path.dirname(filePath) },
      (err, stdout) => {
        if (err) {
          return resolve(undefined);
        }
        resolve(stdout.trim());
      }
    );
  });
}

export async function getGitBlameAuthor(
  filePath: string,
  start: number,
  end: number
): Promise<string | undefined> {
  return new Promise((resolve) => {
    cp.exec(
      `git blame -L ${start},${end} --porcelain -- ${filePath}`,
      { cwd: path.dirname(filePath) },
      (err, stdout) => {
        if (err) {
          return resolve(undefined);
        }
        const match = stdout.match(/author-mail <([^>]+)>/);
        if (match) {
          return resolve(match[1]);
        }
        resolve(undefined);
      }
    );
  });
}
