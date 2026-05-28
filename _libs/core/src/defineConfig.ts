import type { z } from "zod";
import { type ConfigDefinition, createConfig } from "./createConfig.js";

export function defineConfig<S extends z.ZodType>(definition: ConfigDefinition<S>): z.infer<S> {
    return createConfig(definition).load();
}
