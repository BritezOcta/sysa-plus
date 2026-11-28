import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../../generated/prisma/client.js";
import { env } from "../config/env.js";

// Si DATABASE_URL ya trae connectionLimit, manda ese valor.
const url = /connectionLimit=/i.test(env.DATABASE_URL)
  ? env.DATABASE_URL
  : `${env.DATABASE_URL.replace(/;?$/, ";")}connectionLimit=${env.DB_POOL_MAX};`;

const adapter = new PrismaMssql(url);

// Single shared client for the whole process. Import it only from repositories.
export const prisma = new PrismaClient({
  adapter,
  // maxWait: cuánto espera una transacción a que se libere una conexión del pool (Prisma usa 2 s).
  transactionOptions: { maxWait: env.DB_TX_MAX_WAIT_MS },
});
