export type IntegrityManifest = Record<string, string>; // asset path -> sha256 hex digest

export async function sha256Hex(data: ArrayBuffer): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

export interface VerifyResult {
    ok: boolean;
    tracked: boolean;
    expectedHash?: string;
    actualHash: string;
}

/**
 * Checks a cached asset's actual bytes against the build-time integrity
 * manifest. An asset not present in the manifest is treated as untracked
 * (ok: true, tracked: false) rather than a failure - not every cached
 * response needs a tracked hash (see STATIC_INTEGRITY_ASSETS in sw.js).
 */
export async function verifyAgainstManifest(
    path: string,
    body: ArrayBuffer,
    manifest: IntegrityManifest
): Promise<VerifyResult> {
    const actualHash = await sha256Hex(body);
    const expectedHash = manifest[path];

    if (!expectedHash) {
        return { ok: true, tracked: false, actualHash };
    }

    return { ok: actualHash === expectedHash, tracked: true, expectedHash, actualHash };
}