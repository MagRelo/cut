import { Agent } from "@cursor/sdk";
import { tmpdir } from "node:os";

export interface CommentaryTextGenerator {
  generate(prompt: string): Promise<string>;
}

export interface CursorCommentaryTextGeneratorOptions {
  apiKey: string;
  model?: string;
  cwd?: string;
}

export class CursorCommentaryTextGenerator
  implements CommentaryTextGenerator
{
  constructor(
    private readonly options: CursorCommentaryTextGeneratorOptions,
  ) {}

  async generate(prompt: string): Promise<string> {
    const result = await Agent.prompt(prompt, {
      apiKey: this.options.apiKey,
      model: { id: this.options.model ?? "auto" },
      local: {
        cwd: this.options.cwd ?? tmpdir(),
        settingSources: [],
      },
    });
    if (result.status !== "finished") {
      throw new Error(`Cursor commentary generation failed: ${result.status}`);
    }
    return result.result ?? "";
  }
}
