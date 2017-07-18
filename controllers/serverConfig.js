'use strict';
const fs = require('fs');
const http = require('http');

const config = require('../config/config');
const userAuth = require('./userAuth');
const utils = require('../helpers/utils');

const aServerProps = ['name', 'hostname', 'port', 'username'];

module.exports = {
  doAuthServerList,
  doAuthServerPost,
  doAuthServerDelete,
  doAuthSingleServerGet,
  doAuthSingleServerSet,
  doAuthSingleServerDelete
};

// EXPORTED FUNCTIONS
function doAuthServerList(oRequest, oResponse)
{
  doAuthenticatedAction(doServerList, oRequest, oResponse);
}

function doAuthServerPost(oRequest, oResponse)
{
  doAuthenticatedAction(doServerPost, oRequest, oResponse);
}

function doAuthServerDelete(oRequest, oResponse)
{
  doAuthenticatedAction(doServerDelete, oRequest, oResponse);
}

function doAuthSingleServerGet(oRequest, oResponse)
{
  doAuthenticatedAction(doSingleServerGet, oRequest, oResponse);
}

function doAuthSingleServerSet(oRequest, oResponse)
{
  doAuthenticatedAction(doSingleServerSet, oRequest, oResponse);
}

function doAuthSingleServerDelete(oRequest, oResponse)
{
  doAuthenticatedAction(doSingleServerDelete, oRequest, oResponse);
}

//  INTERNAL FUNCTIONS

function doAuthenticatedAction(actionFunc, oRequest, oResponse)
{
  // Check auth credentials
  let authStr = utils.getBasicAuthHeader(oRequest.headers);
  return userAuth.sessionValid(authStr,
                          getAuthCb(actionFunc, oRequest, oResponse));

}
// The auth function is asynchronous, so supply it with a callback
// function that performs the requested action on a valid auth, or
// sends back an UNAUTHORIZED response if the auth fails.
function getAuthCb(func, oRequest, oResponse)
{
  return function(err, validAuth) {

    if (err) {
      var respData = {'http_code' : 500,
                      'error' : 'Error validating session'};
      return utils.returnErrorResponse(oResponse, respData);
    }

    if (validAuth) {
      return func(oRequest, oResponse);
    }
    else {
      return utils.returnUnauthResponse(oResponse);
    }
  }
}

function doServerList(oRequest, oResponse)
{
  var responseCb = utils.getResponseCb(oResponse,
                                       utils.returnJsonResponse);

  // Parse the ServerList query params (sort and paging)
  var qparams = utils.getQueryParams(oRequest.url);
  var href = (oRequest.connection.encrypted ? 'https': 'http') + '://'
      + oRequest.headers.host + oRequest.url;

  var sortKey = null;
  if (qparams.hasOwnProperty('sort')) {
    sortKey = qparams['sort'];
  }

  var paging = null;
  if (qparams.hasOwnProperty('page') || qparams.hasOwnProperty('limit')) {
    let page = ('page' in qparams) ? qparams['page'] : 1;
    let limit = ('limit' in qparams) ?
        qparams['limit'] : config.default_page_size;
    paging = { 'page' : parseInt(page),
               'limit' : parseInt(limit) };
  }

  return getServerList(sortKey, paging, href, responseCb);
}

function doServerPost(oRequest, oResponse)
{
  var responseCb = utils.getResponseCb(oResponse,
                                       utils.returnJsonResponse);
  var serverCb = function(oData) {
    setServerList(oData, responseCb);
  };

  // Parse the JSON data in the request, and call the Server CB function
  // with the resulting data
  return utils.getJsonPostData(oRequest, serverCb);

}

function doServerDelete(oRequest, oResponse)
{
  return deleteServerList(utils.getResponseCb(oResponse,
                                              utils.returnJsonResponse));
}

function doSingleServerGet(oRequest, oResponse)
{
  var responseCb = utils.getResponseCb(oResponse,
                                   utils.returnJsonResponse);

  var sHost = utils.getPathPart(oRequest.url, 2);
  if (!sHost) {
    return utils.returnJsonResponse(null, oResponse,
                                    { 'http_code' : HTTP_BAD_REQUEST });
  }
  return getServer(sHost, responseCb);
}

function doSingleServerSet(oRequest, oResponse)
{
  var responseCb = utils.getResponseCb(oResponse,
                                       utils.returnJsonResponse);

  var sHost = utils.getPathPart(oRequest.url, 2);
  if (!sHost) {
    return utils.returnJsonResponse(null, oResponse,
                                    { 'http_code' : HTTP_BAD_REQUEST });
  }

  var serverCb = function(oData) {
    setServer(sHost, oData, responseCb);
  };
  // Parse the JSON data in the request, and call the Server CB function
  // with the resulting data
  return utils.getJsonPostData(oRequest, serverCb);

}

function doSingleServerDelete(oRequest, oResponse)
{
  var responseCb = utils.getResponseCb(oResponse,
                                       utils.returnJsonResponse);

  var sHost = utils.getPathPart(oRequest.url, 2);
  if (!sHost) {
    return utils.returnJsonResponse(null, oResponse,
                                    { 'http_code' : HTTP_BAD_REQUEST });
  }
  return deleteServer(sHost, responseCb);
}

// Server List functions
function getServerList(sortKey, paging, href, responseCallback)
{
  fs.readFile(config.server_file, 'utf8', function(err, data) {

    if (err) {
      var respData = {'http_code' : 500,
                      'error' : 'Error reading server data'};
      return responseCallback(null, respData);
    }

    if (!data) {
      var respData = {'http_code' : HTTP_NOT_FOUND,
                      'error' : 'No server data.'};
      return responseCallback(null, respData);
    }
    try {
      var servers = JSON.parse(data);
    }
    catch (err) {
      return responseCallback(err);
    }

    var aServ = servers.configurations;
    if (!aServ) {
      var respData = {'http_code' : HTTP_NOT_FOUND,
                      'error' : 'No server data.'};
      return responseCallback(null, respData);
    }

    var numServ = aServ.length;
    if (sortKey && numServ > 1) {
      sortServers(sortKey, aServ);
    }

    if (paging) {
      let offset = (paging.page-1) * paging.limit;
      let sliceEnd = offset + paging.limit;
      var aSubServ = aServ.slice(offset, sliceEnd);
      servers.configurations = aSubServ;

      var linkHdr = makeLinkHdr(href, paging.page, numServ, sliceEnd);
    }
    
    var respData = { 'data': servers,
                     'http_code': HTTP_OK };
    if (linkHdr) {
      respData['link'] = linkHdr;
    }
    return responseCallback(null, respData);
  });
}

function setServerList(oData, responseCallback)
{
  if (!oData) {
    // Generate an invalid request response
    var respData = { 'http_code': HTTP_BAD_REQUEST,
                     'error' : 'Invalid server definition' };
    return responseCallback(null, respData);
  }
  fs.writeFile(config.server_file, JSON.stringify(oData, null, 2),
               function(err, data) {
                 if (err) {
                   var respData = {'http_code' : 500,
                                   'error' : 'Error writing server data'};
                   return responseCallback(null, respData);
                 }
                 
                 var respData = { 'http_code': HTTP_CREATED };
                 return responseCallback(null, respData);
               });

}

function deleteServerList(responseCallback)
{
  var emptyServers = { configurations: [] };
  fs.writeFile(config.server_file, JSON.stringify(emptyServers, null, 2),
               function(err, data) {
                 if (err) {
                   var respData = {'http_code' : 500,
                                   'error' : 'Error writing server data'};
                   return responseCallback(null, respData);
                 }

                 var respData = { 'http_code': HTTP_OK };
                 return responseCallback(null, respData);
               });
}

// Single Server functions
function getServer(sHost, responseCallback)
{
  fs.readFile(config.server_file, 'utf8', function(err, data) {

    if (err) {
      var respData = {'http_code' : 500,
                      'error' : 'Error reading server data'};
      return responseCallback(null, respData);
    }

    if (!data) {
      var respData = {'http_code' : HTTP_NOT_FOUND,
                      'error' : 'No server data.'};
      return responseCallback(null, respData);
    }
    try {
      var servers = JSON.parse(data);
    }
    catch (err) {
      return responseCallback(err);
    }
    var aServers = servers.configurations;
    if (!aServers) {
      var respData = {'http_code' : HTTP_NOT_FOUND,
                      'error' : 'No server data.'};
      return responseCallback(null, respData);
    }
    for (var i=0; i < aServers.length; i++)
    {
      let server = aServers[i];
      if (server.name == sHost) {
        var respData = { 'data': server,
                         'http_code': HTTP_OK };
        return responseCallback(null, respData);
      }
    }

    var respData = { 'http_code': HTTP_NOT_FOUND,
                     'error' : 'Server not found.' };
    return responseCallback(null, respData);
  });
}

function setServer(sHost, oData, responseCallback)
{
  // Validate oData here; make sure it is a valid server definition.
  // Also, don't allow 'host' property to be changed.
  if (!utils.checkJsonProps(oData, aServerProps, true) ||
      oData.name != sHost)
  {
    // Generate an invalid request response
    var respData = { 'http_code': HTTP_BAD_REQUEST,
                     'error' : 'Invalid server definition' };
    return responseCallback(null, respData);
  }
  
  fs.readFile(config.server_file, 'utf8', function(err, data) {

    if (err) {
      var respData = {'http_code' : 500,
                      'error' : 'Error reading server data'};
      return responseCallback(null, respData);
    }

    if (data) {
      try {
        var servers = JSON.parse(data);
      }
      catch (err) {
        return responseCallback(err);
      }
    }
    else {
      var servers = {};
    }
    var exists = false;
    var returnCode = HTTP_OK; // Default to OK (for successful update)
    
    var aServers = servers.configurations;
    if (!aServers) {
      aServers = [];
      servers.configurations = aServers;
    }
    for (var i=0; i < aServers.length; i++)
    {
      let server = aServers[i];
      if (server.name == sHost) {
        exists = true;
        aServers[i] = oData;
        break;
      }
    }
    if (!exists) // If we didn't find the server, we'll add it
    {
      aServers.push(oData);
      returnCode = HTTP_CREATED;
    }

    fs.writeFile(config.server_file, JSON.stringify(servers, null, 2),
                 function(err, data) {

                   if (err) {
                     var respData = {'http_code' : 500,
                                     'error' : 'Error writing server data'};
                     return responseCallback(null, respData);
                   }

                   var respData = { 'http_code': returnCode };
                   return responseCallback(null, respData);
                 });
  });
}

function deleteServer(sHost, responseCallback)
{
  fs.readFile(config.server_file, 'utf8', function(err, data) {

    if (err) {
      var respData = {'http_code' : 500,
                      'error' : 'Error reading server data'};
      return responseCallback(null, respData);
    }

    if (!data) {
      var respData = {'http_code' : HTTP_NOT_FOUND,
                      'error' : 'No server data.'};
      return responseCallback(null, respData);
    }
    try {
      var servers = JSON.parse(data);
    }
    catch (err) {
      return responseCallback(err);
    }
    var exists = false;
    
    var oServers = servers.configurations;
    for (let i=0; i < oServers.length; i++)
    {
      let server = oServers[i];
      if (server.name == sHost)
      {
        oServers.splice(i, 1);
        exists = true;
        break;
      }
    }
    var returnCode = (exists) ? HTTP_OK : HTTP_NOT_FOUND;
    fs.writeFile(config.server_file, JSON.stringify(servers, null, 2),
                 function(err, data) {
                   if (err) {
                     var respData = {'http_code' : 500,
                                     'error' : 'Error writing server data'};
                     return responseCallback(null, respData);
                   }

                   var respData = { 'http_code': returnCode };
                   if (!exists) respData.error = 'Server not found.';
                   return responseCallback(err, respData);
                 });
  });
}

// Construct prev & next page URLs for Link header when returning
// paged list of servers.
function makeLinkHdr(href, currPage, numServ, endServ)
{
  let pageStr = 'page=' + currPage;
  var prevHref = null;
  var nextHref = null;
  if (currPage > 1) {
    let prevPage = 'page=' + (currPage-1);
    prevHref = href.replace(pageStr, prevPage);
  }
  if (endServ < numServ) {
    let nextPage = 'page=' + (currPage+1);
    nextHref = href.replace(pageStr, nextPage);
  }

  var linkHdr = null;
  if (prevHref || nextHref) {
    var links = [];
    if (prevHref) {
      links.push('<' + prevHref + '>; rel="prev"');
    }
    if (nextHref) {
      links.push('<' + nextHref + '>; rel="next"');
    }
    linkHdr = links.join(', ');
  }
  return linkHdr;
}

// Sort the input array of aServers by the specified sortKey
// sortKey can optionally have an 'asc' or 'desc' qualifier
// to specify sort order (in format <key>,<order>, e.g. port,desc).
// Default sort order is 'asc' (ascending).
function sortServers(sortKey, aServers)
{
  // Look for 'asc' or 'desc' qualifier
  let reverse = false;
  let aSortInfo = sortKey.split(',');
  if (aSortInfo.length == 2) {
    sortKey = aSortInfo[0];
    if (aSortInfo[1] == 'desc') {
      reverse = true;
    }
  }
  if (aServers[0].hasOwnProperty(sortKey)) // Make sure sortKey is valid
  {
    aServers.sort(function(a, b) {
      let retVal = (a[sortKey] < b[sortKey]) ?
          -1 :
          (a[sortKey] > b[sortKey]) ? 1 : 0;

      if (reverse) {
        retVal *= -1;
      }
      return retVal;
    });
  }
}
