import mysql from "mysql2/promise";

const globalForMysql = globalThis;

export const pool =
  globalForMysql.mysqlPool ??
  mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    connectionLimit: 10,
  });

if (process.env.NODE_ENV !== "production") globalForMysql.mysqlPool = pool;
