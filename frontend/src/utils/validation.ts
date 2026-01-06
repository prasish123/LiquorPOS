/**
 * UUID Validation Utilities
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID (v4)
 */
export function isValidUUID(value: string): boolean {
    return UUID_REGEX.test(value);
}

/**
 * Validates location and terminal IDs
 * Throws error if invalid to prevent bad API calls
 */
export function validateIds(locationId: string, terminalId: string): void {
    if (!isValidUUID(locationId)) {
        throw new Error(
            `Invalid Location ID: "${locationId}". Must be a valid UUID. ` +
            `Please run setup-env.ps1 to generate proper configuration.`
        );
    }

    if (!isValidUUID(terminalId)) {
        throw new Error(
            `Invalid Terminal ID: "${terminalId}". Must be a valid UUID. ` +
            `Please run setup-env.ps1 to generate proper configuration.`
        );
    }
}

/**
 * Gets and validates environment configuration
 */
export function getValidatedConfig() {
    const locationId = import.meta.env.VITE_LOCATION_ID;
    const terminalId = import.meta.env.VITE_TERMINAL_ID;

    if (!locationId || !terminalId) {
        throw new Error(
            'Missing required environment variables: VITE_LOCATION_ID and VITE_TERMINAL_ID. ' +
            'Please run setup-env.ps1 to configure the system.'
        );
    }

    validateIds(locationId, terminalId);

    return { locationId, terminalId };
}

