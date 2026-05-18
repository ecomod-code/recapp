import { Db, DeleteResult, InsertOneResult, UpdateResult } from "mongodb";

type AnyDoc = Record<string, any>;

function getNestedValue(obj: AnyDoc, path: string): any {
	return path.split(".").reduce((cur: any, key) => (cur != null ? cur[key] : undefined), obj);
}

function matchesFilter(doc: AnyDoc, filter: AnyDoc): boolean {
	for (const [key, value] of Object.entries(filter)) {
		if (value !== null && typeof value === "object" && !Array.isArray(value)) {
			if ("$lt" in value) {
				if (!(getNestedValue(doc, key) < value.$lt)) return false;
			} else if ("$lte" in value) {
				if (!(getNestedValue(doc, key) <= value.$lte)) return false;
			} else if ("$gt" in value) {
				if (!(getNestedValue(doc, key) > value.$gt)) return false;
			} else if ("$gte" in value) {
				if (!(getNestedValue(doc, key) >= value.$gte)) return false;
			} else if ("$in" in value) {
				if (!(value.$in as any[]).includes(getNestedValue(doc, key))) return false;
			} else if ("$ne" in value) {
				if (getNestedValue(doc, key) === value.$ne) return false;
			} else if ("$exists" in value) {
				const exists = getNestedValue(doc, key) !== undefined;
				if (exists !== value.$exists) return false;
			} else {
				if (JSON.stringify(getNestedValue(doc, key)) !== JSON.stringify(value)) return false;
			}
		} else {
			if (getNestedValue(doc, key) !== value) return false;
		}
	}
	return true;
}

function applySet(doc: AnyDoc, $set: AnyDoc): void {
	for (const [key, value] of Object.entries($set)) {
		const parts = key.split(".");
		let cur = doc;
		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i]!;
			if (cur[part] == null) cur[part] = {};
			cur = cur[part] as AnyDoc;
		}
		cur[parts[parts.length - 1]!] = value;
	}
}

class MockCollection<T extends AnyDoc> {
	private docs: T[] = [];

	async findOne(filter: AnyDoc): Promise<T | null> {
		return this.docs.find(doc => matchesFilter(doc, filter)) ?? null;
	}

	find(filter: AnyDoc = {}) {
		const self = this;
		return {
			async toArray(): Promise<T[]> {
				return self.docs.filter(doc => matchesFilter(doc, filter));
			},
		};
	}

	async insertOne(doc: T): Promise<InsertOneResult> {
		this.docs.push({ ...doc });
		return { acknowledged: true, insertedId: (doc as any)._id ?? (doc as any).uid } as InsertOneResult;
	}

	async updateOne(
		filter: AnyDoc,
		update: { $set: AnyDoc },
		options?: { upsert?: boolean }
	): Promise<UpdateResult> {
		const idx = this.docs.findIndex(doc => matchesFilter(doc, filter));
		if (idx >= 0) {
			applySet(this.docs[idx] as AnyDoc, update.$set);
			return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null } as UpdateResult;
		}
		if (options?.upsert) {
			const newDoc = { ...update.$set } as T;
			this.docs.push(newDoc);
			return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: (newDoc as any).uid ?? null } as UpdateResult;
		}
		return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0, upsertedId: null } as UpdateResult;
	}

	async updateMany(filter: AnyDoc, update: { $set: AnyDoc }): Promise<UpdateResult> {
		let count = 0;
		for (const doc of this.docs) {
			if (matchesFilter(doc as AnyDoc, filter)) {
				applySet(doc as AnyDoc, update.$set);
				count++;
			}
		}
		return { acknowledged: true, matchedCount: count, modifiedCount: count, upsertedCount: 0, upsertedId: null } as UpdateResult;
	}

	async deleteOne(filter: AnyDoc): Promise<DeleteResult> {
		const idx = this.docs.findIndex(doc => matchesFilter(doc, filter));
		if (idx >= 0) {
			this.docs.splice(idx, 1);
			return { acknowledged: true, deletedCount: 1 };
		}
		return { acknowledged: true, deletedCount: 0 };
	}

	async deleteMany(filter: AnyDoc): Promise<DeleteResult> {
		const before = this.docs.length;
		this.docs = this.docs.filter(doc => !matchesFilter(doc, filter));
		return { acknowledged: true, deletedCount: before - this.docs.length };
	}
}

export class MockDb {
	private collections = new Map<string, MockCollection<any>>();

	collection<T extends AnyDoc = AnyDoc>(name: string): MockCollection<T> {
		if (!this.collections.has(name)) {
			this.collections.set(name, new MockCollection<T>());
		}
		return this.collections.get(name)!;
	}

	reset(): void {
		this.collections.clear();
	}
}

export const mockDbInstance = new MockDb();

export function getMockDb(): Db {
	return mockDbInstance as unknown as Db;
}
