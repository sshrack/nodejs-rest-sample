config = {};

config.default_port = process.env.PORT || 8090;
config.user_file = 'data/users.txt';
config.session_file = 'data/sessions.txt';
config.server_file = 'data/servers.json';
config.pwd_salt = 'SaltIsTasty';
config.default_page_size = 5;
config.use_https = false;

module.exports = config;
