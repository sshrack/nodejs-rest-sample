'use strict';

// A simple router to support Express-like syntax for simple
//  paths like '/path/:param'.

const url = require('url');

const utils = require('./utils');

module.exports = { addRoute,
                   handleRequest };

var currRoutes = [];

function addRoute(method, path, func)
{
  currRoutes.push(new RouteHolder(method, path, func));
}

function handleRequest(req, res)
{
  var path = trimSlash(url.parse(req.url).pathname);

  for (let i = 0; i < currRoutes.length; i++) {
    var aRoute = currRoutes[i];

    if (aRoute.method === req.method) {

      if (matchPath(req, path, aRoute)) {
        return aRoute.func(req, res);
      }

    }
  }

  var respData = {'http_code' : 500,
                  'error' : 'No match for ' + req.method + " '" + path + "'" };
  return utils.returnErrorResponse(res, respData);
}

function RouteHolder(method, path, func)
{
  this.method = method; // e.g. GET, POST, PUT, DELETE
  this.path   = path;   // URL path that matches this route
  this.func   = func;   // function to handle request

  this.rePath = null;
  this.terms  = [];

  assignPaths(this);
}

function assignPaths(aRoute)
{
  var repWildcard =
      function replaceWildcardTerm(match, offset, string) {
        aRoute.terms.push(trimLeadingColon(match));
        return "([^\/]+)";
      };

  aRoute.rePath = '^' + aRoute.path.replace(/:[^\/]+/g, repWildcard) + '$';
}

function trimLeadingColon(s)
{
  return s.replace(/^:/, '');
}

function trimSlash(s)
{
  return s.replace(/\/$/, '');
}

function matchPath(req, path, aRoute)
{
  // regex match the path against the route's regex path
  let match = path.match(aRoute.rePath);

  if (match && (match.length === aRoute.terms.length + 1)) {
    // walk through all wildcard path params and store values to req.params
    for (let i = 0; i < aRoute.terms.length; i++) {
      if (!req.params) {
        req.params = {};
      }
      req.params[aRoute.terms[i]] = match[i+1];
    }
    return true;
  }
  return false;
}

