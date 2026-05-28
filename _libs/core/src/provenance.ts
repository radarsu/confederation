export interface ProvenanceShadow {
    source: string;
    raw: unknown;
}

export interface ProvenanceEntry {
    source: string;
    raw: unknown;
    shadowed: ProvenanceShadow[];
}

export type ProvenanceMap = Map<string, ProvenanceEntry>;

export interface ProvenanceRecord {
    provenance: ProvenanceMap;
    secrets: Set<string>;
}

export const provenanceStore = new WeakMap<object, ProvenanceRecord>();
