import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../../generated/prisma/client.js";
import { env } from "../config/env.js";

const adapter = new PrismaMssql(env.DATABASE_URL);

// Single shared client for the whole process. Import it only from repositories.
export const prisma = new PrismaClient({ adapter });
