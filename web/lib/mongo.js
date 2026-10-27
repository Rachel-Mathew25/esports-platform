import { MongoClient } from "mongodb";

const globalForMongo = globalThis;

const client =
  globalForMongo.mongoClient ?? new MongoClient(process.env.MONGODB_URI);

if (process.env.NODE_ENV !== "production") globalForMongo.mongoClient = client;

export async function getMongo() {
  await client.connect();
  return client.db(process.env.MONGODB_DB);
}
