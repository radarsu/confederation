import type { CommandContext, StricliProcess } from "@stricli/core";

// Commands that set a process exit code need the full StricliProcess (the default CommandContext
// only exposes stdout/stderr).
export interface CliContext extends CommandContext {
    readonly process: StricliProcess;
}
