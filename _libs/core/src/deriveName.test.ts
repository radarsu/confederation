import { describe, expect, it } from "vitest";
import { buildCliNameMap, buildEnvNameMap, camelToKebab, camelToScreamingSnake } from "./deriveName.js";
import type { LeafDescriptor } from "./enumerateLeafPaths.js";

function leaf(path: string[], meta?: Record<string, unknown>): LeafDescriptor {
    return { path, schema: {} as never, meta };
}

describe("camelToScreamingSnake", () => {
    it("converts simple camelCase", () => {
        expect(camelToScreamingSnake("nodeEnv")).toBe("NODE_ENV");
        expect(camelToScreamingSnake("port")).toBe("PORT");
    });

    it("splits between lowercase/digit and uppercase", () => {
        expect(camelToScreamingSnake("poolSize2")).toBe("POOL_SIZE2");
        expect(camelToScreamingSnake("v2Endpoint")).toBe("V2_ENDPOINT");
    });

    it("keeps consecutive uppercase together and splits at trailing capitalized word", () => {
        expect(camelToScreamingSnake("httpsOptions")).toBe("HTTPS_OPTIONS");
        expect(camelToScreamingSnake("HTTPSOptions")).toBe("HTTPS_OPTIONS");
    });

    it("documents acronym caveat: oAuth2Token starts with single-letter token", () => {
        expect(camelToScreamingSnake("oAuth2Token")).toBe("O_AUTH2_TOKEN");
    });
});

describe("camelToKebab", () => {
    it("converts simple camelCase", () => {
        expect(camelToKebab("nodeEnv")).toBe("node-env");
        expect(camelToKebab("httpsOptions")).toBe("https-options");
    });

    it("HTTPSOptions splits between cluster and trailing word", () => {
        expect(camelToKebab("HTTPSOptions")).toBe("https-options");
    });
});

describe("buildEnvNameMap", () => {
    it("derives names joined with underscore and prefixed", () => {
        const result = buildEnvNameMap([leaf(["nodeEnv"]), leaf(["server", "httpsPort"])], "APP_");
        expect(result).toEqual([
            { path: ["nodeEnv"], envName: "APP_NODE_ENV" },
            { path: ["server", "httpsPort"], envName: "APP_SERVER_HTTPS_PORT" },
        ]);
    });

    it("override via meta is absolute (skips prefix)", () => {
        const result = buildEnvNameMap([leaf(["port"], { env: "PORT" })], "APP_");
        expect(result).toEqual([{ path: ["port"], envName: "PORT" }]);
    });

    it("throws when two paths derive the same name", () => {
        expect(() => buildEnvNameMap([leaf(["databaseUrl"]), leaf(["database", "url"])])).toThrow(/ambiguous env mapping: DATABASE_URL/);
    });

    it("does not collide when override resolves the conflict", () => {
        const result = buildEnvNameMap([leaf(["databaseUrl"]), leaf(["database", "url"], { env: "DB_URL" })]);
        expect(result.map((r) => r.envName)).toEqual(["DATABASE_URL", "DB_URL"]);
    });
});

describe("buildCliNameMap", () => {
    it("derives kebab-case names joined with dash", () => {
        const result = buildCliNameMap([leaf(["nodeEnv"]), leaf(["server", "httpsPort"])]);
        expect(result).toEqual([
            { path: ["nodeEnv"], cliName: "node-env" },
            { path: ["server", "httpsPort"], cliName: "server-https-port" },
        ]);
    });

    it("override via meta.cli replaces the whole flag name", () => {
        const result = buildCliNameMap([leaf(["verboseLogging"], { cli: "v" })]);
        expect(result).toEqual([{ path: ["verboseLogging"], cliName: "v" }]);
    });

    it("throws on collision", () => {
        expect(() => buildCliNameMap([leaf(["nodeEnv"]), leaf(["node", "env"])])).toThrow(/ambiguous cli mapping: node-env/);
    });
});
