const http = require('http');
const url = require('url');

// HTTP Return Codes
//
// FIXME: See if there's a better way to do this than using
//  global namespace, that doesn't look really ugly.
//  (npm has an http-status-codes package.)

HTTP_OK           = 200;
HTTP_CREATED      = 201;
HTTP_NO_CONTENT   = 204;
HTTP_BAD_REQUEST  = 400;
HTTP_UNAUTHORIZED = 401;
HTTP_NOT_FOUND    = 404;
HTTP_NOT_ALLOWED  = 405;
HTTP_SERVER_ERR   = 500;

module.exports = {
  getJsonPostData,
  checkJsonProps,
  getPathPart,
  getQueryParams,
  getBasicAuthHeader,
  getResponseCb,
  returnUnauthResponse,
  returnErrorResponse,
  returnJsonResponse,
  returnEmptyResponse
};

// getJsonPostData
//
//   Pull the data from the HTTP request and convert it to JSON
//
//   Input:   HTTP request body and Callback function to handle
//            request.
//
function getJsonPostData(req, callback)
{
  var body = '';
  req.on('data', function (chunk) {
    body += chunk;
  });

  req.on('end', () => {
    try {
      var data = JSON.parse(body);
    }
    catch (er) {
      return callback(null);
    }
    return callback(data);
  });
}

// checkJsonProps
//
//   Simple utility function to check that the input JSON object has all the
//   fields specified in the input array of property names. If the 'bExact' flag
//   is TRUE, the JSON properties must exactly match the input array properties.
//
//   INPUT:  JSON object
//           Array of property names
//           Boolean exact match flag
//   RETURN: TRUE if all Properties are found; FALSE if not
function checkJsonProps(oJson, aProps, bExact)
{
  for (let i=0; i<aProps.length; i++) {
    if (!oJson.hasOwnProperty(aProps[i])) {
      return false;
    }
  }
  if (bExact) {
    if (Object.keys(oJson).length != aProps.length) {
      return false;
    }
  }

  return true;
}

// getPathPart
//
//   Utility function to retrieve the specified part number of the input URL,
//   as separated by '/'. For instance, for path '/abc/xyz', 'abc' would be
//   part 1, and 'xyz' would be part 2. Returns null if path has fewer parts
//   than input PartNum
//
//   INPUT:  URL
//           Part number <n>
//   RETURN: String containing nth '/'-separated part of URL, or null.
function getPathPart(inUrl, partNum)
{
  var oUrl = url.parse(inUrl, true);
  var path = oUrl.pathname;
  var pathParts = path.split('/');
  if (pathParts.length > partNum) {
    return pathParts[partNum];
  }
  else {
    return null;
  }
}

// getQueryParams
//
//   Utility function to retrieve the query parameters for the input URL
//   object. Returns array of 'key':value pairs for each specified parameter/
//   value.
//
//   INPUT:  URL object
//
//   RETURN: Array of key-value URL query parameters
function getQueryParams(oUrl)
{
  var u = url.parse(oUrl, true);
  var qparams = [];
  Object.keys(u.query).forEach(function(key) {
    qparams[key] = u.query[key];
  });

  return qparams;
}

// getBasicAuthHeader
//
//   Given an HTTP header object, looks for a 'BASIC' Authorization header, and
//   returns the base64-decoded string value of the header. Returns null if
//   the header is not present, or is not prefixed with the 'BASIC ' string.
//   
function getBasicAuthHeader(oHeaders)
{
  let authHdr = oHeaders['authorization'];
  if (!authHdr) {
    return null;
  }

  let tmp = authHdr.split(' ');
  if ((tmp[0] != 'BASIC') || (tmp.length < 2)) {
    return null;
  }

  let buffer = new Buffer(tmp[1], 'base64');
  return buffer.toString();
}

// getResponseCb
//
//  Wrapper function to return the specified Response callback, with
//  the oResponse parameter included. 
function getResponseCb(oResponse, callbackFunc)
{
  return function(err, data) { callbackFunc(err, oResponse, data); };
}

function returnUnauthResponse(oResponse)
{
  oResponse.writeHead(HTTP_UNAUTHORIZED, {'Content-Type': 'text/plain'});
  oResponse.write('Error: Request not authorized.');
  oResponse.end();
  return;
}

function returnErrorResponse(oResponse, oRespData)
{
  var errString = (oRespData.hasOwnProperty('error')) ?
      oRespData.error : 'Internal Server Error';
  var responseCode = (oRespData.hasOwnProperty('http_code')) ?
      oRespData.http_code : HTTP_SERVER_ERR;

  oResponse.writeHead(responseCode, {'Content-Type': 'text/plain'});
  oResponse.write(errString);
  oResponse.end();
  return;
}

// Response function that returns JSON data
function returnJsonResponse(err, oResponse, oRespData)
{
  if (err) {
    return returnErrorResponse(oResponse, oRespData);
  }
  
  // The http_code should always be set; if not, something unexpected
  // happened, so send back an error.
  if (!oRespData.hasOwnProperty('http_code')) {
    var responseCode = HTTP_SERVER_ERR;
  }
  else {
    var responseCode = oRespData.http_code;
  }

  if (responseCode > 299)
  {
    returnErrorResponse(oResponse, oRespData);
  }
  
  if ((responseCode == 204) || !oRespData.hasOwnProperty('data'))
  {
    returnEmptyResponse(null, oResponse, oRespData);
  }
  else
  {
    var oHdr = {'Content-Type': 'application/json',
		'Accept': 'application/json'};
    if (oRespData.hasOwnProperty('link')) {
      oHdr['Link'] = oRespData['link'];
    }

    oResponse.writeHead(responseCode, oHdr);
    oResponse.write(JSON.stringify(oRespData.data));
    oResponse.end();
    return;
  }
}

// Response function that just returns a response code and no body
function returnEmptyResponse(err, oResponse, oRespData)
{
  if (err) {
    oResponse.writeHead(HTTP_SERVER_ERR, {'Content-Type': 'text/plain'});
    oResponse.write('Internal Server Error.');
    oResponse.end();
    return;
  }

  // The http_code should always be set; if not, something unexpected
  // happened, so send back an error.
  if (!oRespData.hasOwnProperty('http_code')) {
    var responseCode = HTTP_SERVER_ERR;
  }
  else {
    var responseCode = oRespData.http_code;
  }
  
  oResponse.writeHead(responseCode, {'Content-Length': 0});
  oResponse.end();
}
