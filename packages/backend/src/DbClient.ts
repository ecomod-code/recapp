import { Auth, Db, MongoClient } from "mongodb";
import { Service } from "typedi";

export const createConnection = async (): Promise<MongoClient> => {
	const { MONGODB_PORT, MONGODB_USER, MONGODB_PW } = process.env;
	const client = new MongoClient(`mongodb://localhost:${MONGODB_PORT}/`, {
		auth: {
			username: MONGODB_USER,
			password: MONGODB_PW,
		} as Auth,
	});
	return await client.connect();
};

@Service()
export class DbClient {
	private connection!: MongoClient;

	async client(): Promise<MongoClient> {
		if (!this.connection) {
			this.connection = await createConnection();
			try {
				await this.connection.connect();
			} catch (e) {
				console.error(e);
				throw e;
			}
		}
		return this.connection;
	}

	async db(): Promise<Db> {
		const client = await this.client();
		return client.db("recapp");
	}

	shutdown(): Promise<void> {
		return this.client().then(c => c.close());
	}
}
