import { describe, expect, it } from "vitest";
import { z } from "zod";
import { cliArgs } from "./cliArgs.js";

describe("cliArgs source", () => {
    it("derives --kebab-case flags from camelCase schema paths", () => {
        const schema = z.object({ nodeEnv: z.string(), port: z.string() });
        const result = cliArgs({ argv: ["--node-env", "production", "--port=8080"] }).load({ schema });
        expect(result).toEqual({ nodeEnv: "production", port: "8080" });
    });

    it("joins nested paths with single dash", () => {
        const schema = z.object({ server: z.object({ httpsPort: z.string(), host: z.string() }) });
        const result = cliArgs({ argv: ["--server-https-port=8443", "--server-host", "0.0.0.0"] }).load({ schema });
        expect(result).toEqual({ server: { httpsPort: "8443", host: "0.0.0.0" } });
    });

    it("treats bare --flag as 'true'", () => {
        const schema = z.object({ enabled: z.string() });
        expect(cliArgs({ argv: ["--enabled"] }).load({ schema })).toEqual({ enabled: "true" });
    });

    it("ignores argv tokens that don't match any schema-derived flag", () => {
        const schema = z.object({ port: z.string() });
        expect(cliArgs({ argv: ["--unknown", "x", "--port", "8080"] }).load({ schema })).toEqual({ port: "8080" });
    });

    it("throws when two leaves derive the same cli flag", () => {
        const schema = z.object({
            nodeEnv: z.string(),
            node: z.object({ env: z.string() }),
        });
        expect(() => cliArgs({ argv: [] }).load({ schema })).toThrow(/ambiguous cli mapping: node-env/);
    });

    it("named 'cliArgs'", () => {
        expect(cliArgs().name).toBe("cliArgs");
    });
});
