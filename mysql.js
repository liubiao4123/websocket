var mysql_require = require('mysql');

var mysql = {
		ktpd:{},
		sssg:{remote:1,url:'https://sg.liubioa.com/websocket/get_new_income',},
		js:{},
};

mysql.ktpd.config = {
		host: '127.0.0.1',
		user: 'root',
		password: 'xindong',
		database: 'ktpd_houtai',
};

mysql.js.config = {
		host: '127.0.0.1',
		user: 'root',
		password: 'xindong',
		database: 'js_houtai',
};

for(var game in mysql )
{
	//mysql数据库连接状态，0表示未连接，1表示已连接
	mysql[game].status = 0;
	
	if (mysql[game].remote) continue;
	
	//mysql连接
	mysql[game].connect = function(the_game){
		mysql[the_game].connection = mysql_require.createConnection(mysql[the_game].config);
		
		mysql[the_game].connection.connect(function(err){
			if (err){
				console.log(the_game+"  mysql connection error: "+err);
				mysql[the_game].status = 0;
			}
			else{
				console.log(the_game+"  mysql connect successful!");
				mysql[the_game].status = 1;
			}
		});
		
		mysql[the_game].connection.on('error', function(err){
			console.log(the_game+"  mysql connection error: "+ err);
			mysql[the_game].status = 0;
			mysql[the_game].connect();
		});

	}

	//mysql关闭
	mysql[game].close = function(the_game){
		mysql[the_game].connection.destroy();
		mysql[the_game].status = 0;
		console.log(the_game+"  mysql connection closed!");
	}
}

exports.mysql = mysql;
