
var mysql_require = require('./mysql');

var mysql = mysql_require.mysql;

//存储最新充值记录，按平台分开存储
var new_income = new Object();

var new_income_channel_num = 50;

var max_id = 0;

//当前的client连接数
var connection_num = 0;

//get_new_income函数执行间隔，单位：秒
var time_distance = 5;


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

	//监听连接事件
	socket_io.sockets.on('connection', function (socket) {
		connection_num++;
		socket.on('new_income',function(data){ 
			var channel_ids = data.channel_ids;
			var id = data.id?data.id:0;
			
			var return_income = new Object();
			
			for( var i in new_income)
			{
				if( channel_ids.length && !in_array(i,channel_ids)) continue;
				
				for( var j in new_income[i] )
				{
					if ( new_income[i][j].id <= id ) break;
					return_income[new_income[i][j].id] = new_income[i][j];
				}
			}
			
			var return_income_sort = object_sort(return_income);
			
			socket.emit('new_income',return_income_sort);
		});
		
		//断开连接
		socket.on("disconnect",function(){
			connection_num--;
		});
	});
}


//获取最新的充值信息
function get_new_income()
{
	console.log("当前的连接数："+connection_num);
	//没有连接时不查询数据库
	if (connection_num)
	{
		if ( !mysql.status )
		{
			mysql.connect();
		}
		
		//防止mysql连接出错
		if( mysql.status )
		{
			var sql = 'select a.id,a.channel_id,a.server_id,a.player_name,a.gold,a.create_time,b.name as server_name,c.chinese_name from orders as a left join servers as b on a.server_id=b.id left join channels as c on a.channel_id=c.id where a.id > '+ max_id +' order by a.id desc limit 100';
			mysql.connection.query(sql,function (err, rows, fields){
				if (err){
					mysql.close();
				}
				else{
					set_new_income(rows);
				}
			});
		}
	}
	else
	{
		new_income = new Object();
		max_id = 0;
		if ( mysql.status )
		{
			mysql.close();
		}
	}
	setTimeout(get_new_income,time_distance*1000);
}

get_new_income();


//获取到的最新充值存储到new_income对象中
function set_new_income(income)
{
	if( income )
	{
		for(var i=income.length-1;i>=0;i--)
		{
			max_id = income[i].id;
			var channel_id = income[i]['channel_id'];
			if (!channel_id) continue;
			
			if ( typeof new_income[channel_id] !== 'object') new_income[channel_id] = new Array();
			
			for( var k=new_income[channel_id].length-1;k>=0;k-- )
			{
				new_income[channel_id][k+1] = new_income[channel_id][k];
			}
			new_income[channel_id][0] = income[i];
			if ( new_income[channel_id].length > new_income_channel_num )
			{
				new_income[channel_id].splice(new_income_channel_num,new_income[channel_id].length-new_income_channel_num);
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

exports.start = socket_start;
