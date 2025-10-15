// Generate a simple 8-character referral code from UUID
export function generateReferralCode(): string {
	return crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase();
}

// Validate referral code format
export function isValidReferralCodeFormat(code: string): boolean {
	return /^[A-Z0-9]{8}$/i.test(code);
}

// Normalize referral code (case-insensitive)
export function normalizeReferralCode(code: string): string {
	return code.toUpperCase();
}
