var mysql_require = require('mysql');

var mysql = {};

//mysql数据库连接状态，0表示未连接，1表示已连接
mysql.status = 0;

//mysql连接
mysql.connect = function(){
	mysql.connection = mysql_require.createConnection({
		host: 'houtai.mysql.ktpd.xd.com',
		user: 'ktpd',
		password: 'mNSzAjXJpS33Tuen',
		database: 'ktpd_houtai',
	});
	
	mysql.connection.connect(function(err){
		if (err){
			console.log("mysql connection error: "+err);
			mysql.status = 0;
		}
		else{
			console.log("mysql connect successful!");
			mysql.status = 1;
		}
	});
	
	mysql.connection.on('error', function(err){
		console.log("mysql connection error: "+ err);
		mysql.status = 0;
		mysql.connect();
	});

}

//mysql关闭
mysql.close = function(){
	mysql.connection.destroy();
	mysql.status = 0;
	console.log("mysql connection closed!");
}


exports.mysql = mysql;
