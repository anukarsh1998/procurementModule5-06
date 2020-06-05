var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const bodyParser = require('body-parser');
var expressLayout = require('express-ejs-layouts');
const dotenv = require('dotenv');
const flash = require('connect-flash');
const session = require('express-session');
dotenv.config();



var app = express();
app.use(expressLayout);
app.use(function(req, res, next) {  
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});  


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var timesheetsRouter = require('./routes/timesheets');
var expenseRouter = require('./routes/expense');
var procurementRouter = require('./routes/procurement');
var tourBillClaimRouter = require('./routes/tourBillClaim');
var approvalsRouter = require('./routes/approvals');
var testCodesRouter = require('./routes/testCodes');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));


// Express session
app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
  })
);

// Connect flash
app.use(flash());

// Global variables
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/timesheets',timesheetsRouter);
app.use('/expense',expenseRouter);
app.use('/procurement',procurementRouter);
app.use('/expense/tourBillClaim',tourBillClaimRouter);
app.use('/approvals',approvalsRouter);
app.use('/testCodes',testCodesRouter);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});


app.get('/*', function(req, res, next){ 
  res.setHeader('Last-Modified', (new Date()).toUTCString());
  next(); 
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
