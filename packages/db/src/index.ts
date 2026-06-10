import { drizzle } from "drizzle-orm/d1";

import * as authSchema from "./schema/auth";
import * as domainSchema from "./schema/domain";

const schema = {
  ...authSchema,
  ...domainSchema,
};

export const createDb = (database: D1Database) => drizzle(database, { schema });
