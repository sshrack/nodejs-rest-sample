# REST API Definition: ServerConfig REST coding challenge
#### LOGIN:
Takes a user ID and password as input. If the inputs are valid, creates a session ID for the user and returns it in the response body with name "session". This session value must be used in the Authorization header, in the format "BASIC [Base-64-encoded value of "session:[SESSIONID]"], for all server configuration requests.
##### URL:	
     /login
##### Request:
###### Supported Method(s):	
        POST
###### Content-Type: 
        application/json
###### Body: 
        {	
            "userid" : [USER ID],
            "password" : [PASSWORD] 
        }
##### Response:
###### Content-Type: 
        application/json
###### Body: 
    	{	
            "session" : [SESSIONID]
    	}

#### LOGOUT:
Takes a user ID as input. Logs the specified user out of the REST service, invalidating any sessions for the user.
##### URL:	
    /logout
##### Request:
###### Supported Method(s):	
        POST
###### Content-Type: 
        application/json
###### Body: 
        {	
            "userid" : [USER ID],
        }
##### Response:
        '200 OK' status with empty response body.

#### LIST SERVERS:
Lists the currently configured servers. Supports sorting by server fields and paging of results.
##### URL:	
        /servers[?][sort=SORTKEY][page=PAGENUM][limit=PAGESIZE]
##### Request:
###### Supported Method(s): 
        GET
###### Supported Query Parameters:
	sort=[SORTKEY][,[asc|desc]]
            -	Optional parameter; if specified results are sorted by [SORTKEY] server value; ascending by 
            default. Descending if ',desc' is specified.
            -	Only one sortkey is supported
        page=[PAGENUM]
            -	Optional parameter; if specified, only the specified page of results is returned. The number of 
            results per page is determined either by the optional 'limit' query parameter, or the default_page_size
            value specified in the server config file.
        limit=[NUM]
            -	Optional parameter; if specified the number of results is limited to the 'limit' value. If 
            specified with the 'page' parameter, this is used to determine the entries per page for paging
            calculations.
###### Required Header(s):
	Authorization: "BASIC [BASE-64 Encoded 'session:[SESSIONID]' value]"
##### Response:
###### Content-Type: 
        application/json
###### Body: 
    	{	
            "configurations": [
                {
                    "name":  [NAME],
                    "hostname": [HOSTNAME],
                    "port": [PORT],
                    "username": [USERNAME]
                },
              ...
    		]
    	}

#### SET SERVERS:
Sets the list of currently configured servers to the input array. All existing servers are replaced.

##### URL:	
        /servers
##### Request:
###### Supported Method(s): 
        POST
###### Required Header(s):
    	Authorization: "BASIC [BASE-64 Encoded 'session:[SESSIONID]' value]"
###### Content-Type: 
        application/json
###### Body: 
    	{	
            "configurations": [
                {
                    "name":  [NAME],
                    "hostname": [HOSTNAME],
                    "port": [PORT],
                    "username": [USERNAME]
                },
              ...
    		]
    	}

###### Response:
    	'201 Created' status with empty response body.

#### DELETE SERVERS:
Deletes the list of currently configured servers. All existing servers are removed. 
##### URL:	
        /servers
##### Request:
###### Supported Method(s): 
        DELETE
###### Required Header(s):
    	Authorization: "BASIC [BASE-64 Encoded 'session:[SESSIONID]' value]"

##### Response:
    	'200 OK' status with empty response body.

#### GET SERVER:
Retrieve the specified server.
##### URL:	
        /servers/[NAME]
##### Request:
###### Supported Method(s):
        GET
###### Required Header(s):
	    Authorization: "BASIC [BASE-64 Encoded 'session:[SESSIONID]' value]"
##### Response:
###### Content-Type: 
        application/json
###### Body: 
    	{	
          "name":  [NAME],
          "hostname": [HOSTNAME],
          "port": [PORT],
          "username": [USERNAME]
    	}
#### SET SERVER:
Create or modify the specified server.
##### URL:	
        /servers/[NAME]
##### Request:
###### Supported Method(s): 	
        POST, PUT
###### Required Header(s):
    	Authorization: "BASIC [BASE-64 Encoded 'session:[SESSIONID]' value]"
###### Content-Type: 
        application/json
###### Body: 
        {	
          "name":  [NAME],
          "hostname": [HOSTNAME],
          "port": [PORT],
          "username": [USERNAME]
        }
##### Response:
        '201 Created' if server was newly created. 
        '200 OK' if existing server was modified.
#### DELETE SERVER:
Delete the specified server.
##### URL:	
        /servers/[NAME]
##### Request:
###### Supported Method(s):
        DELETE
###### Required Header(s):
    	Authorization: "BASIC [BASE-64 Encoded 'session:[SESSIONID]' value]"
##### Response:
        '200 OK' status with empty response body.

