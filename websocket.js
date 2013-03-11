var nodegrass = require('nodegrass');

var md5 = require('./md5');
md5 = md5.md5;

var mysql_require = require('./mysql');

var mysql = mysql_require.mysql;

//存储最新充值记录，按平台分开存储
var new_income = {};

//当前的client连接数
var connection_num = {};

//最大的order_id
var max_id = {};

for(var game in mysql)
{
	new_income[game] = new Object();
	connection_num[game] = 0;
	max_id[game] = 0;
}

var new_income_channel_num = 50;

//get_new_income函数执行间隔，单位：秒
var time_distance = 10;


//启动websocket服务器
function socket_start()
{
	var fs = require('fs');
	var server = require('http').createServer(function(req,res){
		fs.readFile(__dirname + '/index.html',
			function (err, data) {
			if (err) {
				res.writeHead(500);
				return res.end('Error loading index.html');
			}
			res.writeHead(200);
			res.end(data);
		});
	});
	server.listen(8880);
	var socket_io = require('socket.io').listen(server);
	
	//关闭调试信息
	socket_io.set('log level', 1); 

	//监听连接事件
	socket_io.sockets.on('connection', function (socket) {
		var query = socket.handshake.query;
		
		if ( query.game && mysql[query.game] )
		{
			//var sign = md5(string);
			var sign = 1;
			//验证签名
			if ( query.sign && query.sign == sign )
			{
				connection_num[query.game]++;
				socket.on('new_income',function(data){ 
					var channel_ids = data.channel_ids;
					var id = data.id?data.id:0;
					
					var return_income = new Object();
					
					for( var i in new_income[query.game])
					{
						if( channel_ids.length && !in_array(i,channel_ids)) continue;
						
						for( var j in new_income[query.game][i] )
						{
							if ( new_income[query.game][i][j].id <= id ) break;
							return_income[new_income[query.game][i][j].id] = new_income[query.game][i][j];
						}
					}
					
					var return_income_sort = object_sort(return_income);
					
					if ( !is_object_empty( return_income_sort ) )
					{
						console.log(query.game+' client:');
						console.log(return_income_sort);
					}
					
					socket.emit('new_income',return_income_sort);
				});
				
				//断开连接
				socket.on("disconnect",function(){
					connection_num[query.game]--;
				});
			}
			else
			{
				console.log("Error: sign验证失败");
			}
		}
		else
		{
			
		}
	});
}


//获取最新的充值信息
function get_new_income()
{
	var get_new_income_by_game = function(game)
	{
		console.log(game+",当前的连接数："+connection_num[game]);
		
		//没有连接时不查询数据库
		if (connection_num[game])
		{
			if ( mysql[game].remote )
			{
				var time = parseInt(Date.parse(new Date())/1000);
				var string = '';
				var url = mysql[game].url+'?max_id='+max_id[game]+'&time='+time+'&sign='+md5(string);
				
				nodegrass.get(url,function(data,status,headers){
					var income = eval("("+data+")");
					if (status === 200)
					{
						set_new_income(income,game);
					}
					else
					{
						console.log('Error: '+status+', info: '+income);
					}
				},'utf8').on('error',function(e){
					console.log('Error: get '+ game +' url error, '+e.message);
				});
			}
			else
			{
				if ( !mysql[game].status )
				{
					mysql[game].connect(game);
				}
				
				//防止mysql连接出错
				if( mysql[game].status )
				{
					var sql = 'select * from orders  where id >'+max_id[game];
					
					mysql[game].connection.query(sql,function (err, rows, fields){
						if (err){
							mysql[game].close(game);
						}
						else{
							set_new_income(rows,game);
						}
					});
				}
			}
			
		}
		else
		{
			new_income[game] = new Object();
			max_id[game] = 0;
			
			if ( !mysql[game].remote && mysql[game].status)
			{
				mysql[game].close(game);
			}
		}
	}
	
	for( var game in mysql )
	{
		//get_new_income_by_game(game);
		//下面是调试的代码，线上请将下面几行注释，上面一行反注释
		var time = parseInt(Date.parse(new Date())/1000);
		var rows = [{id:time,channel_id:1,content:'now time is: '+time}];
		set_new_income(rows,game);
	}
	console.log(' ');
	
	setTimeout(get_new_income,time_distance*1000);
}

get_new_income();


//获取到的最新充值存储到new_income对象中
function set_new_income(income,game)
{
	if(!game)
	{
		console.log('Error:game为空');
		return;
	}
	if( income )
	{
		for(var i=income.length-1;i>=0;i--)
		{
			max_id[game] = income[i].id;
			var channel_id = income[i].channel_id;
			if (!channel_id) continue;
			
			if ( typeof new_income[game][channel_id] !== 'object') new_income[game][channel_id] = new Array();
			
			for( var k=new_income[game][channel_id].length-1;k>=0;k-- )
			{
				new_income[game][channel_id][k+1] = new_income[game][channel_id][k];
			}
			new_income[game][channel_id][0] = income[i];
			if ( new_income[game][channel_id].length > new_income_channel_num )
			{
				new_income[game][channel_id].splice(new_income_channel_num,new_income[game][channel_id].length-new_income_channel_num);
			}
		}
	}
}

//判断num是否在data数组中
function in_array(num, data)
{
	var result = false;
	if ( data ) for ( var i in data )
	{
		if ( parseInt(data[i]) === parseInt(num) )
		{
			result = true;
			break;
		}
	}
	
	return result;
}

//data对象按照key排序
function object_sort(data)
{
	var result = new Object();
	var sort_array = new Array();
	if (data)
	{
		for(var i in data)
		{
			var key = parseInt(i);
			sort_array.push(key);
		}
	
		var sort_number = function (a,b){return a-b;};
		sort_array.sort(sort_number);
		
		for (var j in sort_array)
		{
			result[sort_array[j]] = data[sort_array[j]];
		}
	}
	return result;
}

function is_object_empty(obj)
{
	for (var i in obj)
	{
		return false;
	}
	return true;
}

exports.start = socket_start;
