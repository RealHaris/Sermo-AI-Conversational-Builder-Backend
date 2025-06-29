const express = require('express');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
// const swaggerUi = require('swagger-ui-express');
// const swaggerSpec = require('./config/swagger');
const routes = require('./route');
// const { jwtStrategy } = require('./config/passport');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./helper/ApiError');

process.env.PWD = process.cwd();

const app = express();

// enable cors
app.use(cors());
app.options('*', cors());

app.use(express.static(`${process.env.PWD}/public`));

// Increase payload size limit to 10MB
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// jwt authentication
app.use(passport.initialize());
// passport.use('jwt', jwtStrategy);

// Swagger documentation
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// // Route to serve the OpenAPI JSON
// app.get('/api-docs.json', (req, res) => {
//     res.setHeader('Content-Type', 'application/json');
//     res.send(swaggerSpec);
// });

app.get('/', async (req, res) => {
    res.status(200).send('Congratulations! API is working!');
});
app.use('/api', routes);

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
    next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);
const db = require('./models');

// Only sync database in development environment
// NOTE: For production use, it's recommended to use migrations instead of sync
// Use: npm run db:makemigrations -- --name migration-name
// and: npm run db:migrate
if (process.env.NODE_ENV === 'development') {
    // db.sequelize.sync({ alter: true });
    console.log('Database synced in development mode');
}

module.exports = app;
