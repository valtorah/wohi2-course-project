#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is missing. In Railway, open the app service -> Variables -> add DATABASE_URL from MySQL MYSQL_URL."
  exit 1
fi

if [ -z "$JWT_SECRET" ]; then
  echo "JWT_SECRET is missing. In Railway, open the app service -> Variables -> add JWT_SECRET (32+ characters)."
  exit 1
fi

npx prisma migrate deploy
exec npm start
