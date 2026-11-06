import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(4000),
  WEB_URL: Joi.string().uri().default('http://localhost:3000'),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  SESSION_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().default('dev_secret_replace_in_production'),
  }),
  JWT_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().default('dev_jwt_secret_replace_in_production'),
  }),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(10),
  LOG_LEVEL: Joi.string().default('debug'),
  S3_ENDPOINT: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.allow('').default(''),
  }),
  S3_REGION: Joi.string().default('auto'),
  S3_BUCKET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.allow('').default(''),
  }),
  S3_ACCESS_KEY_ID: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.allow('').default(''),
  }),
  S3_SECRET_ACCESS_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.allow('').default(''),
  }),
  MEDIA_PUBLIC_BASE_URL: Joi.string().uri().allow('').default(''),
});
