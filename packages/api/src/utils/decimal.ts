import Decimal from 'decimal.js';

// Configure Decimal.js for financial calculations
Decimal.set({
	precision: 28,
	rounding: Decimal.ROUND_DOWN,
	toExpNeg: -18,
	toExpPos: 28,
});

export { Decimal };

// Helper to create Decimal from string/number
export function decimal(value: string | number): Decimal {
	return new Decimal(value);
}

// Helper to format decimal as string with 18 decimals
export function toDecimalString(value: Decimal | string | number): string {
	return new Decimal(value).toFixed(18);
}

// Helper to add multiple decimal values
export function sum(...values: (Decimal | string | number)[]): Decimal {
	return values.reduce((acc, val) => acc.plus(val), new Decimal(0));
}
