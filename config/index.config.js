
require('dotenv').config()
const os                               = require('os');
const pjson                            = require('../package.json');
const utils                            = require('../libs/utils');
const SERVICE_NAME                     = (process.env.SERVICE_NAME)? utils.slugify(process.env.SERVICE_NAME):pjson.name;
const USER_PORT                        = process.env.USER_PORT || 5111;
const ADMIN_PORT                       = process.env.ADMIN_PORT || 5222;
const ADMIN_URL                        = process.env.ADMIN_URL || `http://localhost:${ADMIN_PORT}`;
const ENV                              = process.env.ENV || "development";
const REDIS_URI                        = process.env.REDIS_URI || "redis://127.0.0.1:6379";

const CORTEX_REDIS                     = process.env.CORTEX_REDIS || REDIS_URI;
const CORTEX_PREFIX                    = process.env.CORTEX_PREFIX || 'none';
const CORTEX_TYPE                      = process.env.CORTEX_TYPE || SERVICE_NAME;
const OYSTER_REDIS                     = process.env.OYSTER_REDIS || REDIS_URI;
const OYSTER_PREFIX                    = process.env.OYSTER_PREFIX || 'none';

const CACHE_REDIS                      = process.env.CACHE_REDIS || REDIS_URI;
const CACHE_PREFIX                     = process.env.CACHE_PREFIX || `${SERVICE_NAME}:ch`;

const MONGO_URI                        = process.env.MONGO_URI || `mongodb://localhost:27017/${SERVICE_NAME}`;
const config                           = require(`./envs/${ENV}.js`);
const LONG_TOKEN_SECRET                = process.env.LONG_TOKEN_SECRET || null;
const SHORT_TOKEN_SECRET               = process.env.SHORT_TOKEN_SECRET || null;
const REFRESH_TOKEN_SECRET             = process.env.REFRESH_TOKEN_SECRET || null;
const ACCESS_TOKEN_TTL                 = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL                = process.env.REFRESH_TOKEN_TTL || '30d';
const LONG_TOKEN_TTL                   = process.env.LONG_TOKEN_TTL || '30d';
const NACL_SECRET                      = process.env.NACL_SECRET || null;
const RATE_LIMIT_WINDOW_MS             = process.env.RATE_LIMIT_WINDOW_MS || 60000;
const RATE_LIMIT_MAX                   = process.env.RATE_LIMIT_MAX || 120;
const LOGIN_ATTEMPT_WINDOW_MS          = process.env.LOGIN_ATTEMPT_WINDOW_MS || (15 * 60 * 1000);
const LOGIN_ATTEMPT_MAX                = process.env.LOGIN_ATTEMPT_MAX || 5;
const LOGIN_LOCK_MS                    = process.env.LOGIN_LOCK_MS || (15 * 60 * 1000);
const CORS_ORIGINS                     = process.env.CORS_ORIGINS || '';

if(!LONG_TOKEN_SECRET || !SHORT_TOKEN_SECRET || !REFRESH_TOKEN_SECRET || !NACL_SECRET) {
    throw Error('missing .env variables check index.config');
}

config.dotEnv = {
    SERVICE_NAME,
    ENV,
    CORTEX_REDIS,
    CORTEX_PREFIX,
    CORTEX_TYPE,
    OYSTER_REDIS,
    OYSTER_PREFIX,
    CACHE_REDIS,
    CACHE_PREFIX,
    MONGO_URI,
    USER_PORT,
    ADMIN_PORT,
    ADMIN_URL,
    LONG_TOKEN_SECRET,
    SHORT_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET,
    ACCESS_TOKEN_TTL,
    REFRESH_TOKEN_TTL,
    LONG_TOKEN_TTL,
    RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX,
    LOGIN_ATTEMPT_WINDOW_MS,
    LOGIN_ATTEMPT_MAX,
    LOGIN_LOCK_MS,
    CORS_ORIGINS,
};



module.exports = config;
