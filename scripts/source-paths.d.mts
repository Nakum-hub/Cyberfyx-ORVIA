export declare const EXCLUDED_PREFIXES: readonly string[];
export declare const LIVE_STATE_FILES: readonly string[];
export declare function isQualifiedSource(path: string | undefined): boolean;
export declare function qualifiedSourcePaths(lsFilesOutput: string): string[];
export declare function liveStatePaths(lsFilesOutput: string): string[];
export declare function statusPath(line: string): string | undefined;
export declare function qualifiedDirty(porcelainOutput: string): boolean;
