const express = require('express');
//const router = express.Router();
const pool = require('../db/dbConfig');
const verify = require('../config/verifyToken');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const Router = require('express-promise-router');
const format = require('pg-format');
const router = new Router();
const pgp = require('pg-promise')();
pgp.pg.defaults.poolSize = 20;
pgp.pg.defaults.ssl = true;


const cn = {
    host: 'ec2-52-1-206-123.compute-1.amazonaws.com', // 'localhost' is the default;
    port: 5432, // 5432 is the default;
    database: 'd6q4fakr4q67pn',
    user: 'u6ida1nn56am2',
    password: 'p9f90e2fbde50f75cf4883b17ba8e9815d9cec2fb17b2b41530a9e90ee00567ff'
};
// You can check for all default values in:
// https://github.com/brianc/node-postgres/blob/master/packages/pg/lib/defaults.js


router.get('/getContacts',(request, response) => {
    const db = pgp(process.env.DATABASE_URL); // database instance;

   db.any('select sfid,name from salesforce.contact')
  .then(data => {
        console.log('DATA:', data); // print data;
        response.send(data);
   })
   .catch(error => {
        console.log('ERROR:', error); // print the error;
        response.send(error);
    })
    .finally(db.$pool.end);
})



module.exports = router;