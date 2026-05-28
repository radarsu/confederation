import type { z } from "zod";

export interface SourceContext {
    schema: z.ZodType;
}

export interface Source {
    name: string;
    load: (context: SourceContext) => Record<string, unknown>;
}
