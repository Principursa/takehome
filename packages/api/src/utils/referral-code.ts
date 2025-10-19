// Generate a simple 8-character referral code from UUID
export function generateReferralCode(): string {
	return crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
}

// Validate referral code format (alphanumeric with optional dashes, 4-20 chars)
export function isValidReferralCodeFormat(code: string): boolean {
	return /^[A-Z0-9-]{4,20}$/i.test(code);
}

// Normalize referral code (trim whitespace and uppercase)
export function normalizeReferralCode(code: string): string {
	return code.trim().toUpperCase();
}
