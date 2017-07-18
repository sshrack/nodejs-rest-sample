const crypto = require('crypto');
const fs = require('fs');

const config = require('../config/config');

function createUser(userId, password)
{

  const hash = crypto.createHash('sha256');
  hash.update(password + config.pwd_salt);
  var hashPwd = hash.digest('hex');
  console.log(hashPwd);
  var userRecord = userId + ' ' + hashPwd + '\r\n';
  console.log(userRecord);
  fs.appendFileSync(config.user_file, userRecord);
}

if (process.argv.length < 4) {
  console.log("Input userID and password to add new user");
}
else {
  var userId = process.argv[2];
  var password = process.argv[3];
  createUser(userId, password);
  process.exit(0);
}
               
  
