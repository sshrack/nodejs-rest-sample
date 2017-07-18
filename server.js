'use strict';
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');

const config = require('./config/config');
const controllers = require('./controllers');
const helpers = require('./helpers');
const routing = helpers.routing;
const utils = helpers.utils;
const userAuth = controllers.userAuth;
const serverConfig = controllers.serverConfig;

// Check that the required config parameters are defined
var aReqConfigVals = [ 'default_port',
                       'user_file',
                       'session_file',
                       'server_file',
                       'pwd_salt',
                       'default_page_size',
                       'use_https' ];

if (!utils.checkJsonProps(config, aReqConfigVals, false)) {
  console.log('Required config parameter missing.');
  console.log('Required parameters: ' + aReqConfigVals);
  process.exit(1);
}

// Add the supported REST service routes
routing.addRoute('POST',   '/login',     userAuth.doLogin);
routing.addRoute('POST',   '/logout',    userAuth.doLogout);
routing.addRoute('GET',    '/servers',   serverConfig.doAuthServerList);
routing.addRoute('POST',   '/servers',   serverConfig.doAuthServerPost);
routing.addRoute('DELETE', '/servers',   serverConfig.doAuthServerDelete);
routing.addRoute('GET',    '/servers/:X',serverConfig.doAuthSingleServerGet);
routing.addRoute('POST',   '/servers/:X',serverConfig.doAuthSingleServerSet);
routing.addRoute('PUT',    '/servers/:X',serverConfig.doAuthSingleServerSet);
routing.addRoute('DELETE', '/servers/:X',serverConfig.doAuthSingleServerDelete);

// If port is specified on input, use that, otherwise use default from config
const port = (process.argv.length < 3) ?
      config.default_port : parseInt(process.argv[2]);

// Create HTTP (or HTTPS) server and listen on specified (or default) port
if (config.use_https) {
  
  var options = {
    key: fs.readFileSync('./config/key.pem'),
    cert: fs.readFileSync('./config/cert.pem')
  };
  https.createServer(options, routing.handleRequest).listen(port);

}
else {
  http.createServer(routing.handleRequest).listen(port);
}
