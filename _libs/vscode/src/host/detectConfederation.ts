export interface PackageManifest {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
}

// The extension stays dormant unless the workspace actually uses confederation: either a
// confederation.config.* file exists, or some package depends on an @confederation/* package.
export function usesConfederation(manifests: PackageManifest[], configFileIds: string[]): boolean {
    if (configFileIds.length > 0) {
        return true;
    }
    return manifests.some(hasConfederationDependency);
}

function hasConfederationDependency(manifest: PackageManifest): boolean {
    return [manifest.dependencies, manifest.devDependencies, manifest.peerDependencies].some(
        (deps) => deps !== undefined && Object.keys(deps).some((name) => name.startsWith("@confederation/")),
    );
}
