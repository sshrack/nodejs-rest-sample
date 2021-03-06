 # A simple Node.js REST Server
 The code here implements a very simple example REST server to manage server
 configuration data.

 It is written entirely in core-NodeJS (ie. without any external libraries).
 Due to this restriction, all data (ie. users, sessions, and server
 definitions) are simply stored in files in the data directory, rather than
 in a database.

### How to run:

   node server.js [PORT]   (PORT is optional; if not specified, the default_
                            port value in config/configs.js is used.)

 _All request and response bodies are in JSON._

 __NOTE:__ For simplicity in testing, the server is set up to run non-secure (ie.
   using HTTP). To use SSL/HTTPS instead, change the 'use_https' value in
   config/configs.js to 'true'. (There are self-signed cert files in the config/
   directory that are used in HTTPS mode; some testing tools may complain about
   these non-official certificates.)
  
 ##### API Definition
 See the REST API Definition document, found in docs/API.md, for specific API definitions.
 Here is a synopsis:

 **Login: /login**
   POST example data: { "userid": "susan", "password":"apitest" }
   Response example data: { "session": "b271b846bbbf57f7fa5caa86291849b4" }

  **_NOTE:_** _To add users to use for login, use the **scripts/user_create.js**
         utility. User IDs & encrypted passwords are stored in data/users.txt)_

 **Logout: /logout**
   POST example data: { "userid": "susan" }

 _**SERVER FUNCTIONS:** Authorization header is required with valid Session ID, in
   Base-64 encoded format. Use online utility to base64-encode the string:
   session:[SESSIONID], where SESSIONID is a valid session returned from a
   login. Use the encoded string to create the Authorization header with the
   format:_
      **Authorization: BASIC c2Vzc2lvbjo0ZmY3NDdmMjFiYjJjMDhhOWZjOTJhNTVkMTQ1MDA4Yg==**

 **List Servers: /servers[?[sort=[SORTKEY][&][page=[PAGE]][&][limit=[LIMIT]]**
   GET
   Response data: JSON structure containing all configured servers.

 **Set Servers: /servers**
   POST data containing full server definition
   Example:
{
    "configurations" : [
	{
	    "name" : "host1",
	    "hostname" : "nessus-ntp.lab.com",
	    "port" : 1244,
	    "username" : "toto"
	},
	{
	    "name" : "host2",
	    "hostname" : "nessus-xml.lab.com",
	    "port" : 1115,
	    "username" : "admin"
	}
    ]
}

 **Delete Servers: /servers**
   DELETE

 **Get Server: /servers/[NAME]**
   GET

 **Set Server: /servers/[NAME]**
   POST or PUT
   Example:
	{
	    "name" : "myhost",
	    "hostname" : "myhost.test.com",
	    "port" : 1234,
	    "username" : "me"
	}

 **Delete Server: /servers/[NAME]**
   DELETE

### Installation

This server requires [Node.js](https://nodejs.org/) v6+ to run.

