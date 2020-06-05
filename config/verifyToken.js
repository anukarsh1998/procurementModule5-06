const jwt = require('jsonwebtoken');

module.exports = (request, response, next) => {
    //const token = request.header('auth-token');
    const token = request.cookies.jwt;
    console.log('request.cookies :'+JSON.stringify(request.cookies));
    if(!token){
        request.flash('error_msg', 'Please log in to view that resource');
        response.redirect('/users/login');
        //return response.status(401).send('Access Denied');
    }
    try
    {
        const verified = jwt.verify(token, process.env.TOKEN_SECRET);
        console.log('verified  : '+JSON.stringify(verified));
        request.user = verified.user;
        next();
    }
    catch(err)
    {   
        response.status(400).send('Invalid Token');
    }
}