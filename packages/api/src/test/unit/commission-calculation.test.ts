import { describe, test, expect } from "bun:test";
import { calculateCommissionBreakdown, validateCommissionSum, COMMISSION_RATES } from "../../utils/commission";
import { decimal, sum } from "../../utils/decimal";

describe("Commission Calculation - Unit Tests", () => {
	describe("calculateCommissionBreakdown", () => {
		test("should correctly split $100 fee into all components", () => {
			const feeAmount = "100";
			const breakdown = calculateCommissionBreakdown(feeAmount);

			expect(breakdown.cashback.toString()).toBe("10"); // 10%
			expect(breakdown.level1.toString()).toBe("30"); // 30%
			expect(breakdown.level2.toString()).toBe("3"); // 3%
			expect(breakdown.level3.toString()).toBe("2"); // 2%
			expect(breakdown.treasury.toString()).toBe("55"); // 55%
		});

		test("should correctly split $1000 fee", () => {
			const feeAmount = "1000";
			const breakdown = calculateCommissionBreakdown(feeAmount);

			expect(breakdown.cashback.toString()).toBe("100");
			expect(breakdown.level1.toString()).toBe("300");
			expect(breakdown.level2.toString()).toBe("30");
			expect(breakdown.level3.toString()).toBe("20");
			expect(breakdown.treasury.toString()).toBe("550");
		});

		test("should handle decimal fee amounts correctly", () => {
			const feeAmount = "50.75";
			const breakdown = calculateCommissionBreakdown(feeAmount);

			// 10% of 50.75 = 5.075
			expect(parseFloat(breakdown.cashback.toString())).toBeCloseTo(5.075, 3);
			// 30% of 50.75 = 15.225
			expect(parseFloat(breakdown.level1.toString())).toBeCloseTo(15.225, 3);
			// 3% of 50.75 = 1.5225
			expect(parseFloat(breakdown.level2.toString())).toBeCloseTo(1.5225, 4);
			// 2% of 50.75 = 1.015
			expect(parseFloat(breakdown.level3.toString())).toBeCloseTo(1.015, 3);
			// 55% of 50.75 = 27.9125
			expect(parseFloat(breakdown.treasury.toString())).toBeCloseTo(27.9125, 4);
		});

		test("should handle very small amounts without losing precision", () => {
			const feeAmount = "0.01";
			const breakdown = calculateCommissionBreakdown(feeAmount);

			expect(parseFloat(breakdown.cashback.toString())).toBeCloseTo(0.001, 4);
			expect(parseFloat(breakdown.level1.toString())).toBeCloseTo(0.003, 4);
			expect(parseFloat(breakdown.level2.toString())).toBeCloseTo(0.0003, 5);
			expect(parseFloat(breakdown.level3.toString())).toBeCloseTo(0.0002, 5);
			expect(parseFloat(breakdown.treasury.toString())).toBeCloseTo(0.0055, 5);
		});

		test("should handle large amounts", () => {
			const feeAmount = "1000000"; // $1M
			const breakdown = calculateCommissionBreakdown(feeAmount);

			expect(breakdown.cashback.toString()).toBe("100000"); // $100k
			expect(breakdown.level1.toString()).toBe("300000"); // $300k
			expect(breakdown.level2.toString()).toBe("30000"); // $30k
			expect(breakdown.level3.toString()).toBe("20000"); // $20k
			expect(breakdown.treasury.toString()).toBe("550000"); // $550k
		});

		test("should maintain precision for repeating decimals", () => {
			const feeAmount = "33.33";
			const breakdown = calculateCommissionBreakdown(feeAmount);

			// Verify breakdown exists and has numeric values
			expect(parseFloat(breakdown.cashback.toString())).toBeCloseTo(3.333, 3);
			expect(parseFloat(breakdown.level1.toString())).toBeCloseTo(9.999, 3);
			expect(parseFloat(breakdown.level2.toString())).toBeCloseTo(0.9999, 4);
			expect(parseFloat(breakdown.level3.toString())).toBeCloseTo(0.6666, 4);
			expect(parseFloat(breakdown.treasury.toString())).toBeCloseTo(18.3315, 4);
		});
	});

	describe("validateCommissionSum", () => {
		test("should validate that breakdown sums to 100% for $100 fee", () => {
			const feeAmount = "100";
			const breakdown = calculateCommissionBreakdown(feeAmount);
			const isValid = validateCommissionSum(feeAmount, breakdown);

			expect(isValid).toBe(true);
		});

		test("should validate for various decimal amounts", () => {
			const testAmounts = ["123.456", "0.01", "999.99", "50.75", "1000000"];

			for (const amount of testAmounts) {
				const breakdown = calculateCommissionBreakdown(amount);
				const isValid = validateCommissionSum(amount, breakdown);
				expect(isValid).toBe(true);
			}
		});

		test("should return false for tampered breakdown", () => {
			const feeAmount = "100";
			const breakdown = calculateCommissionBreakdown(feeAmount);

			// Tamper with level1 commission
			breakdown.level1 = decimal("50"); // Changed from 30

			const isValid = validateCommissionSum(feeAmount, breakdown);
			expect(isValid).toBe(false);
		});

		test("should return false if treasury is reduced", () => {
			const feeAmount = "100";
			const breakdown = calculateCommissionBreakdown(feeAmount);

			// Reduce treasury
			breakdown.treasury = decimal("45"); // Changed from 55

			const isValid = validateCommissionSum(feeAmount, breakdown);
			expect(isValid).toBe(false);
		});

		test("should return false if cashback is inflated", () => {
			const feeAmount = "100";
			const breakdown = calculateCommissionBreakdown(feeAmount);

			// Inflate cashback
			breakdown.cashback = decimal("20"); // Changed from 10

			const isValid = validateCommissionSum(feeAmount, breakdown);
			expect(isValid).toBe(false);
		});
	});

	describe("COMMISSION_RATES", () => {
		test("should have all rates sum to exactly 100%", () => {
			const total = sum(
				COMMISSION_RATES.CASHBACK,
				COMMISSION_RATES.LEVEL_1,
				COMMISSION_RATES.LEVEL_2,
				COMMISSION_RATES.LEVEL_3,
				COMMISSION_RATES.TREASURY
			);

			expect(total.toString()).toBe("1"); // 100% = 1.0
		});

		test("should have correct individual rate values", () => {
			expect(COMMISSION_RATES.CASHBACK.toString()).toBe("0.1"); // 10%
			expect(COMMISSION_RATES.LEVEL_1.toString()).toBe("0.3"); // 30%
			expect(COMMISSION_RATES.LEVEL_2.toString()).toBe("0.03"); // 3%
			expect(COMMISSION_RATES.LEVEL_3.toString()).toBe("0.02"); // 2%
			expect(COMMISSION_RATES.TREASURY.toString()).toBe("0.55"); // 55%
		});

		test("should have rates in descending order (L1 > L2 > L3)", () => {
			expect(parseFloat(COMMISSION_RATES.LEVEL_1.toString())).toBeGreaterThan(
				parseFloat(COMMISSION_RATES.LEVEL_2.toString())
			);
			expect(parseFloat(COMMISSION_RATES.LEVEL_2.toString())).toBeGreaterThan(
				parseFloat(COMMISSION_RATES.LEVEL_3.toString())
			);
		});

		test("should have treasury as largest allocation", () => {
			const treasuryRate = parseFloat(COMMISSION_RATES.TREASURY.toString());
			const cashbackRate = parseFloat(COMMISSION_RATES.CASHBACK.toString());
			const level1Rate = parseFloat(COMMISSION_RATES.LEVEL_1.toString());
			const level2Rate = parseFloat(COMMISSION_RATES.LEVEL_2.toString());
			const level3Rate = parseFloat(COMMISSION_RATES.LEVEL_3.toString());

			expect(treasuryRate).toBeGreaterThan(cashbackRate);
			expect(treasuryRate).toBeGreaterThan(level1Rate);
			expect(treasuryRate).toBeGreaterThan(level2Rate);
			expect(treasuryRate).toBeGreaterThan(level3Rate);
		});
	});

	describe("Edge Cases", () => {
		test("should handle zero fee amount", () => {
			const feeAmount = "0";
			const breakdown = calculateCommissionBreakdown(feeAmount);

			expect(breakdown.cashback.toString()).toBe("0");
			expect(breakdown.level1.toString()).toBe("0");
			expect(breakdown.level2.toString()).toBe("0");
			expect(breakdown.level3.toString()).toBe("0");
			expect(breakdown.treasury.toString()).toBe("0");

			const isValid = validateCommissionSum(feeAmount, breakdown);
			expect(isValid).toBe(true);
		});

		test("should handle maximum precision (18 decimals)", () => {
			const feeAmount = "100.123456789012345678";
			const breakdown = calculateCommissionBreakdown(feeAmount);

			// Should not throw and should maintain precision
			expect(breakdown.cashback).toBeDefined();
			expect(breakdown.level1).toBeDefined();
			expect(breakdown.level2).toBeDefined();
			expect(breakdown.level3).toBeDefined();
			expect(breakdown.treasury).toBeDefined();

			const isValid = validateCommissionSum(feeAmount, breakdown);
			expect(isValid).toBe(true);
		});

		test("should handle string decimal input", () => {
			const feeAmount = "100.50";
			const breakdown = calculateCommissionBreakdown(feeAmount);

			expect(breakdown.cashback.toString()).toBe("10.05");
			expect(breakdown.level1.toString()).toBe("30.15");
			expect(breakdown.level2.toString()).toBe("3.015");
			expect(breakdown.level3.toString()).toBe("2.01");
			expect(breakdown.treasury.toString()).toBe("55.275");
		});
	});
});
