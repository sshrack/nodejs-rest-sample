'use strict';
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');

const config = require('../config/config');
const utils = require('../helpers/utils');

module.exports = {
  doLogin,
  doLogout,
  sessionValid
};

function doLogin(oRequest, oResponse)
{
  var responseCb = utils.getResponseCb(oResponse,
				       utils.returnJsonResponse);
  var loginCb = function(oData) {
    checkLoginCreds(oData, responseCb);
  };

  // Parse the JSON data in the request, and call the Login CB function
  // with the resulting data
  return utils.getJsonPostData(oRequest, loginCb);
}

function doLogout(oRequest, oResponse)
{
  var responseCb = utils.getResponseCb(oResponse,
				       utils.returnJsonResponse);
  var logoutCb = function(oData) {
    removeUserSession(oData, responseCb);
  };
  
  // Parse the JSON data in the request, and call the Logout CB function
  // with the resulting data
  return utils.getJsonPostData(oRequest, logoutCb);
}

function sessionValid(authStr, callback)
{
  if (!authStr) {
    return callback(false);
  }
  
  var sessionId = authStr.replace('session:', '');
  
  // Look up session ID in session file
  fs.readFile(config.session_file, 'utf8', function(err, data) {

    if (err) {
      return callback(err, false);
    }

    var goodSession = false;

    // Strip out \r and split on newline
    data = data.replace(/\r/g,'');
    var aSessions = data.split('\n');

    // Loop on sessions to see if the specified
    // session exists, and the password matches.
    for (var i=0; i < aSessions.length; i++)
    {
      let sess = aSessions[i];

      // Skip comment lines
      if (sess.indexOf('//') == 0) continue;
      
      let aTmp = sess.split(' ');
      if (aTmp.length > 1)
      {
	var cur_sess = aTmp[1];
	if (cur_sess == sessionId) {
	  goodSession = true;
	  break;
	}
      }
    }
    return callback(null, goodSession);
  });
}
//----------------------------------------------------------------------

function passwordsMatch(clearPwd, encPwd)
{
  // The passwords stored in the users.txt file should be
  // encrypted with the pwd_salt key.

  // Hash encrypt the input clear-text password
  //  using the 'pwd_salt' key from the config file.
  const hash = crypto.createHash('sha256');
  hash.update(clearPwd + config.pwd_salt);
  var hashPwd = hash.digest('hex');
  var pwdMatch = (hashPwd == encPwd)
  
  return pwdMatch;
}

function generateSessionKey(userid, responseCallback)
{
  var sessionKey = crypto.randomBytes(16).toString('hex');
  var sessionRecord = userid + ' ' + sessionKey + '\r\n';
  
  // Open session key file for append, and add sessionRecord

  fs.appendFile(config.session_file, sessionRecord,
                function(err, data) {
                  if (err) {
                    var respData = {'http_code' : 500,
                                    'error' : 'Error writing session data'};
                    return responseCallback(null, respData);
                  }
                  
                  var oRespData = {};
                  oRespData['session'] = sessionKey;
                  var respData = { 'http_code': HTTP_OK,
		                   'data': oRespData };
                  return responseCallback(null, respData);
                });
}	

function removeUserSession(oData, responseCallback)
{
  if (!oData) {
    // Generate an invalid request response
    var respData = { 'http_code': HTTP_BAD_REQUEST,
                     'error' : 'Invalid post data' };
    return responseCallback(null, respData);
  }
    
  if (!oData.hasOwnProperty('userid')) {
    var respData = { 'http_code': HTTP_BAD_REQUEST,
		     'error': 'Logout requires userid attribute' };
    return responseCallback(null, respData);
  }

  // Remove all instances of this user from session file
  fs.readFile(config.session_file, 'utf8', function(err, data) {

    if (err) {
      var respData = {'http_code' : 500,
                      'error' : 'Error removing session.'};
      return responseCallback(null, respData);
    }

    var newData = extractSessions(data, oData.userid);
    fs.writeFile(config.session_file, newData, function(err, data) {

      if (err) {
        var respData = {'http_code' : 500,
                        'error' : 'Error removing session.'};
        return responseCallback(null, respData);
      }

      var respData = { 'http_code': HTTP_NO_CONTENT };
      return responseCallback(null, respData);
    });
  });
}

function checkLoginCreds(oData, responseCallback)
{
  if (!oData) {
    // Generate an invalid request response
    var respData = { 'http_code': HTTP_BAD_REQUEST,
                     'error' : 'Invalid post data' };
    return responseCallback(null, respData);
  }
    
  if (!oData.hasOwnProperty('userid') ||
      !oData.hasOwnProperty('password'))
  {
    var respData = { 'http_code': HTTP_BAD_REQUEST,
		     'error': 'Login requires userid and password attributes' };
    return responseCallback(null, respData);
  }

  // Look up user ID in user ID file
  fs.readFile(config.user_file, 'utf8', function(err, data) {

    if (err) {
      var respData = {'http_code' : 500,
                      'error' : 'Error validating user.'};
      return responseCallback(null, respData);
    }

    var goodLogin = false;
    // Strip out \r and split on newline
    data = data.replace(/\r/g,'');
    var aUsers = data.split('\n');

    // Loop on users in user ID file to see if the specified
    // user exists, and the password matches.
    // Design Note: Use 'for' instead of 'forEach', so I can break
    //              out if the userid is found.
    for (var i=0; i < aUsers.length; i++)
    {
      let user = aUsers[i];
      // Skip comment lines
      if (user.indexOf('//') == 0)
	continue;

      let aTmp = user.split(' ');
      if (aTmp.length > 1)
      {
	var userid = aTmp[0];
	var password = aTmp[1];
	if (userid == oData.userid) {
	  if (passwordsMatch(oData.password, password))
	  {
	    goodLogin = true;
	  }
	  break;
	}
      }
    }

    if (goodLogin) {
      return generateSessionKey(oData.userid, responseCallback);
    }
    else {
      var respData = { 'http_code': HTTP_UNAUTHORIZED,
		       'error': 'Invalid Username or Password' };
      return responseCallback(null, respData);
    }	    

  });
  
}

// Remove session lines from input file data that match the input userId.
function extractSessions(data, userId)
{
  var aSessions = data.split('\n');
  var newData = '';
  aSessions.forEach( (session) => {
    if (session.length)
    {
      let aTmp = session.split(' ');
      if (aTmp[0] != userId)
	newData += session + '\n';
    }
  });

  return newData;
}  
