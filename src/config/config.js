const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envValidation = Joi.object()
    .keys({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
        SERVER_PORT: Joi.number().default(3000),
        DB_HOST: Joi.string().default('localhost'),
        PORT: Joi.number().default(3306),
        DB_USER: Joi.string().required(),
        DB_PASS: Joi.string().required(),
        DB_NAME: Joi.string().required(),
        JWT_SECRET: Joi.string().required().description('JWT secret key'),
        JWT_ACCESS_EXPIRATION_MINUTES: Joi.number()
            .default(30)
            .description('minutes after which access tokens expire'),
        JWT_REFRESH_EXPIRATION_DAYS: Joi.number()
            .default(30)
            .description('days after which refresh tokens expire'),
        JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
            .default(10)
            .description('minutes after which reset password token expires'),
        JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
            .default(10)
            .description('minutes after which verify email token expires'),
        LOG_FOLDER: Joi.string().required(),
        LOG_FILE: Joi.string().required(),
        LOG_LEVEL: Joi.string().required(),
        REDIS_HOST: Joi.string().default('127.0.0.1'),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_USE_PASSWORD: Joi.string().default('no'),
        REDIS_PASSWORD: Joi.string(),
        CNIC_ENCRYPTION_KEY: Joi.string().required().description('Secret key for CNIC encryption'),
        VAPI_PRIVATE_KEY: Joi.string().required().description('Vapi API key'),
        VAPI_PUBLIC_KEY: Joi.string().required().description('Vapi public key'),
        VAPI_BASE_URL: Joi.string().description('Optional custom Vapi API base URL'),
        VAPI_DEFAULT_MODEL: Joi.string().default('gpt-4').description('Default LLM model to use'),
        VAPI_DEFAULT_VOICE_PROVIDER: Joi.string().default('eleven_labs').description('Default voice provider'),
        VAPI_DEFAULT_VOICE_ID: Joi.string().default('rachel').description('Default voice ID to use'),
        VAPI_TEMPERATURE: Joi.number().default(0.7).description('Temperature for LLM responses'),
        VAPI_WEBHOOK_SECRET: Joi.string().description('Vapi webhook secret'),
        CLOUDINARY_CLOUD_NAME: Joi.string().required().description('Cloudinary cloud name'),
        CLOUDINARY_API_KEY: Joi.string().required().description('Cloudinary API key'),
        CLOUDINARY_API_SECRET: Joi.string().required().description('Cloudinary API secret'),
        STORE_CALL_RECORDINGS: Joi.boolean().default(false).description('Whether to store call recordings'),
    })
    .unknown();

const { value: envVar, error } = envValidation
    .prefs({ errors: { label: 'key' } })
    .validate(process.env);

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
    nodeEnv: envVar.NODE_ENV,
    serverPort: envVar.SERVER_PORT,
    dbHost: envVar.DB_HOST,
    port: envVar.PORT,
    dbUser: envVar.DB_USER,
    dbPass: envVar.DB_PASS,
    dbName: envVar.DB_NAME,
    jwt: {
        secret: envVar.JWT_SECRET,
        accessExpirationMinutes: envVar.JWT_ACCESS_EXPIRATION_MINUTES,
        refreshExpirationDays: envVar.JWT_REFRESH_EXPIRATION_DAYS,
        resetPasswordExpirationMinutes: envVar.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
        verifyEmailExpirationMinutes: envVar.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
    },
    logConfig: {
        logFolder: envVar.LOG_FOLDER,
        logFile: envVar.LOG_FILE,
        logLevel: envVar.LOG_LEVEL,
    },
    redis: {
        host: envVar.REDIS_HOST,
        port: envVar.REDIS_PORT,
        usePassword: envVar.REDIS_USE_PASSWORD,
        password: envVar.REDIS_PASSWORD,
    },
    encryption: {
        cnicKey: envVar.CNIC_ENCRYPTION_KEY,
    },
    vapi: {
        privateKey: envVar.VAPI_PRIVATE_KEY,
        publicKey: envVar.VAPI_PUBLIC_KEY,
        baseUrl: envVar.VAPI_BASE_URL,
        defaultModel: envVar.VAPI_DEFAULT_MODEL,
        defaultVoiceProvider: envVar.VAPI_DEFAULT_VOICE_PROVIDER,
        defaultVoiceId: envVar.VAPI_DEFAULT_VOICE_ID,
        temperature: envVar.VAPI_TEMPERATURE,
        webhookSecret: envVar.VAPI_WEBHOOK_SECRET
    },
    cloudinary: {
        cloudName: envVar.CLOUDINARY_CLOUD_NAME,
        apiKey: envVar.CLOUDINARY_API_KEY,
        apiSecret: envVar.CLOUDINARY_API_SECRET,
        storeCallRecordings: envVar.STORE_CALL_RECORDINGS
    },
};
