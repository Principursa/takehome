import { db } from '@takehome/db';

// Transaction wrapper with SERIALIZABLE isolation and retry logic
export async function withSerializableTransaction<T>(
	fn: (tx: typeof db) => Promise<T>,
	maxRetries = 3
): Promise<T> {
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await db.transaction(fn, {
				isolationLevel: 'serializable',
			});
		} catch (error: any) {
			// PostgreSQL serialization failure error code
			if (error.code === '40001' && attempt < maxRetries - 1) {
				// Exponential backoff: 10ms, 20ms, 40ms
				await new Promise(resolve => setTimeout(resolve, 10 * Math.pow(2, attempt)));
				continue;
			}
			throw error;
		}
	}
	throw new Error('Transaction failed after retries');
}
