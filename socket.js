var cluster = require('cluster');
if(cluster.isMaster){
	//form #CPU's minus 1 (1 minimum)
	var numcpu = require('os').cpus().length-1;
	if(numcpu < 1){ numcpu = 1; }
	for(var i=0;i<numcpu;i++){
		cluster.fork();
	}
} else {

/* load config variables */
var ws = require('ws').Server,
zlib = require('zlib'),
http = require('http'),
https = require('https'),
fs = require('fs'),
bcrypt = require('bcrypt'),
redis = require('redis'),
email = require('mailer'),
DB = {},
Modules = {},
nonAuthed = {"auth":1,"register":1,"NewPassword":1},
Config = JSON.parse(fs.readFileSync('config.json','utf8')),
drport=Config.server.DataBaseReadPort,
dwport=Config.server.DataBaseWritePort,
lport=Config.server.ListenPort,
lsport=Config.server.ListenSecurePort,
staticFiles = {
	'/Client.js':{"Content-Type": "application/javascript"},
	'/Style.css':{"Content-Type": "text/css"},
	'/images/favicon.ico':{"Content-Type": "image/x-icon"},
	'/images/icon16.png':{"Content-Type": "image/jpeg"},
	'/images/icon32.png':{"Content-Type": "image/jpeg"},
	'/images/apple-touch-icon-ipad.png':{"Content-Type": "image/jpeg"},
	'/images/apple-touch-icon-ipad3.png':{"Content-Type": "image/jpeg"},
	'/images/apple-touch-icon-iphone.png':{"Content-Type": "image/jpeg"},
	'/images/apple-touch-icon-iphone4.png':{"Content-Type": "image/jpeg"}
},
Files = {},
FilesRef = {};

for(var File in staticFiles){
	(function(File){
		if(!Files[File]){
			FilesRef[File.replace("images/","")] = File;
			fs.readFile(File.substr(1),function(err,data){
				console.log(File.substr(1));
				Files[File] = data;
			});
		}
	})(File);
}
if(process.argv[2] == 'dev'){
	console.log('dev mode');
	drport=Config.server.DataBaseReadPortDev; dwport=Config.server.DataBaseWritePortDev; lport=Config.server.ListenPortDev; lsport=Config.server.ListenSecurePortDev;
	fs.readFile('StyleSrc.css',function(err,data){
		Files['/Style.css'] = data;
	});
	fs.readFile('ClientSrc.js',function(err,data){
		Files['/Client.js'] = data;
	});
}

DB.R = redis.createClient(drport)
DB.R.auth(Config.server.RedisPassword,function(err,res){
	console.log(err+":"+res);
});
DB.R.info(function(err,res){
	if(res.match("role:slave")){
		DB.W = redis.createClient(dwport);
		DB.W.auth(Config.server.RedisPassword);
		DB.W.on("error", function (err) {
			console.log("DB W Error " + err);
		});
		DB.PUBSUB = redis.createClient(dwport)
		DB.PUBSUB.auth(Config.server.RedisPassword,function(err,res){
			console.log(err+":"+res);
		});
		DB.PUBSUB.on("error", function (err) {
			console.log("DB PUBSUB Error " + err);
		});
	} else {
		DB.W = DB.R;
		DB.PUBSUB = redis.createClient(drport)
		DB.PUBSUB.auth(Config.server.RedisPassword,function(err,res){
			console.log(err+":"+res);
		});
		DB.PUBSUB.on("error", function (err) {
			console.log("DB PUBSUB Error " + err);
		});
	}
	DB.R.on("error", function (err) {
		console.log("DB R Error " + err);
	});
});



var ca = [];
chain = fs.readFileSync(Config.certs.ca, 'utf8');
chain = chain.split("\n");
cert = [];
for(line in chain){
	if(line.length > 0 ){
		cert.push(chain[line]);
		if(chain[line].match(/-END CERTIFICATE-/)){
			ca.push(cert.join("\n"));
			cert = [];
		}
	}
}
var options = {
	ca: ca,
	key: fs.readFileSync(Config.certs.key),
	cert: fs.readFileSync(Config.certs.crt)
};

httpServer = http.createServer(function(req,res){
	res.statusCode = 302;
	res.setHeader("Location", "https://"+Config.domain+"/");
	res.end();
}).listen(lport);

var data = '';
var gdata = '';
setTimeout(function(){
	data = '<!DOCTYPE html>'
	+ '<html>'
	+ '	<head id="head">'
	+ '		<title>Coplete</title>'
	+ '		<meta charset="utf-8" />'
	+ '		<meta name="description" content="Coplete is a topic and conversation manager which focuses on a single concept; You always know who has the ball.">'
	+ '		<meta name="viewport" content="initial-scale=1, maximum-scale=1, maximum-scale=1, user-scalable=no">'
	+ '		<meta name="google-site-verification" content="8VECxWt3AOrehnhsGZ5AhATYBW3Wm4fZS5h-NMcfSjE" />'
	+ '		<meta name="apple-mobile-web-app-capable" content="yes">'
	+ '		<style type="text/css">'+Files['/Style.css']+'</style>'
	+ '		<link rel="apple-touch-icon" href="apple-touch-icon-iphone.png" />'
	+ '		<link rel="apple-touch-icon" sizes="72x72" href="apple-touch-icon-ipad.png" />'
	+ '		<link rel="apple-touch-icon" sizes="114x114" href="apple-touch-icon-iphone4.png" />'
	+ '		<link rel="apple-touch-icon" sizes="144x144" href="apple-touch-icon-ipad3.png" />'
	+ '		'
	+ '	</head>'
	+ '	<body id="body">'
	+'		<div id="main" class="main">'
	+ '			<div id="welcomeText">Connecting... <svg style="position:absolute;left:0;right:0;top:0;bottom:0" viewBox="-2 0 50 50"><g opacity=".25"><path fill="#00AEEF" d="M21.934,23.969c0,0.196-0.008,0.368-0.023,0.515s-0.042,0.275-0.079,0.386c-0.038,0.11-0.087,0.208-0.148,0.294s-0.167,0.19-0.318,0.313s-0.469,0.31-0.954,0.561c-0.485,0.251-1.086,0.496-1.805,0.735c-0.719,0.239-1.544,0.441-2.476,0.606c-0.931,0.166-1.949,0.248-3.054,0.248c-1.907,0-3.629-0.257-5.166-0.772s-2.846-1.274-3.929-2.279s-1.915-2.246-2.498-3.722c-0.583-1.477-0.875-3.177-0.875-5.101c0-1.973,0.314-3.732,0.942-5.276c0.628-1.544,1.51-2.852,2.646-3.924c1.136-1.072,2.494-1.891,4.076-2.454s3.334-0.846,5.257-0.846c0.848,0,1.673,0.064,2.476,0.193c0.802,0.129,1.544,0.292,2.225,0.487c0.682,0.196,1.287,0.423,1.817,0.68c0.53,0.257,0.897,0.469,1.101,0.634c0.205,0.166,0.337,0.291,0.397,0.376c0.061,0.086,0.11,0.187,0.148,0.304c0.038,0.116,0.068,0.254,0.091,0.414C21.809,6.5,21.82,6.689,21.82,6.91c0,0.245-0.015,0.454-0.045,0.625c-0.031,0.171-0.076,0.315-0.137,0.432c-0.061,0.117-0.133,0.202-0.217,0.257c-0.083,0.055-0.187,0.083-0.308,0.083c-0.213,0-0.51-0.12-0.891-0.358c-0.38-0.239-0.872-0.502-1.473-0.791c-0.601-0.288-1.332-0.551-2.191-0.791c-0.86-0.239-1.891-0.358-3.093-0.358c-1.309,0-2.5,0.211-3.573,0.634c-1.073,0.423-1.99,1.045-2.751,1.866c-0.761,0.821-1.351,1.823-1.77,3.005c-0.419,1.183-0.628,2.534-0.628,4.053c0,1.507,0.202,2.84,0.605,3.998c0.403,1.158,0.981,2.126,1.735,2.904c0.753,0.779,1.678,1.367,2.773,1.765c1.096,0.398,2.336,0.597,3.721,0.597c1.172,0,2.195-0.116,3.07-0.349s1.621-0.493,2.237-0.781s1.122-0.548,1.518-0.781c0.396-0.233,0.708-0.349,0.936-0.349c0.106,0,0.198,0.018,0.274,0.055c0.076,0.037,0.137,0.107,0.183,0.211c0.045,0.104,0.08,0.249,0.103,0.432C21.922,23.454,21.934,23.687,21.934,23.969z"/><path fill="#6D6E71" d="M45.245,15.13c0,2.353-0.254,4.466-0.763,6.339c-0.508,1.875-1.256,3.464-2.243,4.77s-2.208,2.313-3.664,3.02c-1.456,0.708-3.12,1.062-4.994,1.062c-0.797,0-1.535-0.08-2.213-0.239c-0.678-0.16-1.341-0.409-1.988-0.748c-0.648-0.339-1.291-0.768-1.929-1.286c-0.638-0.518-1.315-1.126-2.033-1.824v13.457c0,0.159-0.041,0.299-0.12,0.419c-0.08,0.12-0.209,0.219-0.389,0.299c-0.18,0.08-0.429,0.139-0.748,0.179s-0.728,0.06-1.226,0.06c-0.479,0-0.877-0.02-1.196-0.06c-0.319-0.04-0.574-0.1-0.763-0.179c-0.19-0.08-0.319-0.179-0.389-0.299c-0.07-0.12-0.105-0.26-0.105-0.419V2.092c0-0.179,0.03-0.324,0.09-0.434c0.06-0.109,0.18-0.204,0.359-0.284c0.18-0.08,0.408-0.134,0.688-0.165c0.279-0.03,0.618-0.045,1.017-0.045c0.418,0,0.763,0.015,1.032,0.045c0.269,0.03,0.493,0.085,0.673,0.165c0.179,0.08,0.304,0.175,0.374,0.284c0.07,0.11,0.105,0.254,0.105,0.434V5.71c0.817-0.837,1.604-1.565,2.362-2.183c0.757-0.618,1.52-1.131,2.288-1.54s1.555-0.718,2.363-0.927c0.807-0.209,1.66-0.314,2.557-0.314c1.954,0,3.619,0.379,4.994,1.136c1.375,0.758,2.497,1.794,3.364,3.11c0.867,1.315,1.5,2.846,1.899,4.59C45.045,11.328,45.245,13.177,45.245,15.13z M40.131,15.698c0-1.375-0.105-2.706-0.316-3.992c-0.211-1.286-0.572-2.427-1.083-3.424c-0.512-0.997-1.199-1.794-2.061-2.393c-0.863-0.598-1.936-0.897-3.22-0.897c-0.642,0-1.274,0.095-1.896,0.284c-0.622,0.189-1.253,0.489-1.896,0.897c-0.642,0.409-1.314,0.947-2.016,1.615c-0.703,0.668-1.444,1.491-2.227,2.467v10.706c1.364,1.655,2.658,2.921,3.881,3.798c1.223,0.877,2.507,1.316,3.851,1.316c1.244,0,2.312-0.299,3.204-0.897s1.615-1.396,2.167-2.393c0.551-0.997,0.958-2.113,1.219-3.349C40.001,18.201,40.131,16.954,40.131,15.698z"/><path d="M2,42 L8,38 L8,40 L40,40 L40,38 L45,42 L40,46 L40,44 L8,44 L8,46 Z" stroke="#6D6E71" fill="#6D6E71" /></g></svg></div>'
	+ '			<script id="client">'
	+ '				'+Files['/Client.js']
	+ '			</script>'
	+ '		</div>'
	+ '	</body>'
	+ '</html>';
	zlib.gzip(data,function(err,gzdata){
		gdata = gzdata;
	});
},300);

httpServer = https.createServer(options,function(req,res){
	console.log("req secure: "+req.url);
	if(FilesRef[req.url]){
		res.writeHeader(200, staticFiles[FilesRef[req.url]]);
		res.end(Files[FilesRef[req.url]]);
		return;
	} else {
		console.log("req");
		res.writeHead(200, { 'content-encoding': 'gzip' });
		res.end(gdata);
  		//res.writeHead(200, {"Content-Type": "text/html"});
		//console.log("req");
		//res.end(data);
		return;
	}
}).listen((lsport));

server = new ws({server: httpServer});
server.on('connection', function (socket){
	console.log("sup connector");
	socket.on('message', function(data){ Modules.onData(socket,data); });
	socket.on('close', function(data){ Modules.onClose(socket,data); });
});

Modules.send = function(socket,data){
	if(socket){
		if(socket.readyState == 1){
			socket.send(JSON.stringify(data));
			console.log("Sent: "+JSON.stringify(data));
		}
	}
}

Modules.onData = function(socket,data){
	console.log("GOT: "+data);
	data = JSON.parse(data);
	if(socket.User || nonAuthed[data.do]){
		if(Modules.handle[data.do]){
			Modules.handle[data.do](socket,data);
		} else {
			Modules.internalHandle.NoLike(socket,"i don't think i like what you are trying");
		}
	} else {
		socket.close(1000,"no auth");
	}
}
Modules.idByEmail = function(email,Source,callBack){
	if(validateEmail(email)){
		email = email.toLowerCase().trim();
		DB.R.get("UserEmail:"+email,function(err,UserID){
			if(UserID){
				callBack({Action:"Returned",UserID:UserID});
			} else {
				if(!Source.CheckOnly){
					DB.W.incr("User_Count",function(err,UserID){
						var Save = {id:UserID,email:email,name:email.split("@")[0],created:new Date().toString()};
						Save.tmpPass = safeToken();
						Save.password = pwHash(Save.tmpPass);
						DB.W.hmset("User:"+UserID,Save,function(err,res){
							console.log("wrote user");
							if(err){ console.log(err); }
							DB.W.set("UserEmail:"+email,UserID);
							callBack({Action:"Created",UserID:UserID});
							Modules.sendEmail("AccountCreated",UserID,Source);
						});
					});
				} else {
					callBack({Action:"Error",Error:"Invalid Email"});
				}
			}
		});
	} else {
		callBack({Action:"Error",Error:"Invalid Email"});
	}
}
Modules.handle = {
	register:function(socket,data){
		if(!data.password || data.password.length > 5){
			Modules.idByEmail(data.email,{Source:"Registration",Password:data.password},function(Res){
				if(Res.Action == "Error"){
					Modules.send(socket,{callBack:data.callBack,msg:"That email address is invalid."});
				} else if(Res.Action == "Returned"){
					Modules.send(socket,{callBack:data.callBack,msg:"That email address is already registered."});
				} else if(Res.Action == "Created"){
					Modules.send(socket,{callBack:data.callBack,msg:"Your email address was registered, please check your email and spam folder for login instructions."});
				} else {
					Modules.send(socket,{callBack:data.callBack,msg:"Something didn't go right."});
				}
			});
		} else {
			Modules.send(socket,{callBack:data.callBack,msg:"Please provide a password at least 6 characters long."});
		}
	},
	NewPassword:function(socket,data){
		Modules.idByEmail(data.email,{Source:"NewPassword",CheckOnly:1},function(Res){
			if(Res.Action == "Returned"){
				Modules.sendEmail("NewPassword",Res.UserID);
				Modules.send(socket,{callBack:data.callBack,msg:"We emailed you a link to reset your password."});
			} else {
				Modules.send(socket,{callBack:data.callBack,msg:"Invalid email address."});
			}
		});
	},
	SetPass:function(socket,data){
		if(socket.User.id){
			if(data.password.length > 5){
				var Save = {password:pwHash(data.password),tmpPass:""};
				DB.W.hmset("User:"+socket.User.id,Save);
				socket.User.tmpPass = "";
				Modules.send(socket,{callBack:data.callBack,msg:"Authenticated",user:socket.User});
			} else {
				Modules.send(socket,{callBack:data.callBack,msg:"Password must be at least 8 characters"});
			}
		} else {
			Modules.send(socket,{callBack:data.callBack,msg:"Invalid User"});
		}
	},
	auth:function(socket,data){
		Modules.onClose(socket);
		if(data.email && (data.password || data.tmpPass || (data.token && data.tokenClient))){
			Modules.idByEmail(data.email,{Source:"Auth",CheckOnly:1},function(Res){
				if(Res.Action == "Returned"){
					DB.R.hgetall("User:"+Res.UserID,function(err,res){
						if(res){
							if(data.token && data.tokenClient){
								data.password = data.token;
								if(res["ClientToken:"+data.tokenClient]){
									if(res["ClientToken:"+data.tokenClient] == data.token){
										var TOKENAUTH=true;
									} else {
										var TOKENAUTH=false;
									}
								} else {
									var TOKENAUTH=false;
								}
							} else {
								var TOKENAUTH=false;
							}
							if(data.tmpPass){
								data.password = '';
								if(data.tmpPass == res.tmpPass){ TOKENAUTH=true; }
							}
							if(bcrypt.compareSync(data.password,res.password) || TOKENAUTH){
								SendUser = {id:res.id,name:res.name,email:res.email,tmpPass:res.tmpPass,EmailReminder:res.EmailReminder,EmailPass:res.EmailPass}
								if(data.RememberMe && !data.TOKENAUTH){
									data.tokenClient = safeToken();
									SendUser.tokenClient = data.tokenClient;
									var Token = token();
									SendUser.Token = Token;
									DB.W.hset("User:"+res.id,"ClientToken:"+data.tokenClient,Token);
								}
								socket.User = SendUser;
								DB.PUBSUB.subscribe("User:"+res.id);
								DB.PUBSUB.on("message",function(channel,message){
									if(channel == "User:"+socket.User.id){
										Modules.onData(socket,message);
									}
								});
								SendUser.authed = 1;
								Modules.send(socket,{callBack:data.callBack,msg:"Authenticated",user:SendUser});
							} else {
								Modules.send(socket,{callBack:data.callBack,msg:"Password Failed"});
							}
						} else {
							Modules.send(socket,{callBack:data.callBack,msg:"Email address or password is incorrect [p]"});
						}
					});
				} else {
					Modules.send(socket,{callBack:data.callBack,msg:"Email address or password is incorrect [a]"});
				}
			});
		} else {
			Modules.send(socket,{callBack:data.callBack,msg:"Email address or password is incorrect [d]"});
		}
	},
	NewTask:function(socket,data){
		if(data.Title.length > 0){
			if(!data.Title){ data.Title = ''; } data.Title = data.Title.substring(0,200).trim();
			if(!data.Description){ data.Description = ''; } data.Description = data.Description.substring(0,10000).trim();
			DB.W.incr("Task_Count",function(err,TaskID){
				if(!data.TaskFor || data.TaskFor.length < 6){ data.TaskFor = socket.User.email; }
				Modules.idByEmail(data.TaskFor,{Source:"NewTask",Title:data.Title,Description:data.Description,CreatedBy:socket.User.name+" ("+socket.User.email+")"},function(Res){
					if(Res.Action == "Error"){
						Modules.send(socket,{callBack:data.callBack,msg:"You cannot assign the task to that email address"});
					} else {
						//fix input
						if(!data.Title){ data.Title = ''; } data.Title = data.Title.substring(0,200);
						if(!data.Description){ data.Description = ''; } data.Description = data.Description.substring(0,10000);
						var Save = {
							id:TaskID,
							Title:data.Title,
							Description:data.Description,
							TaskFor:Res.UserID,
							TaskForEmail:data.TaskFor,
							created:new Date().toString(),
							updated:new Date().toString(),
							CreatedBy:socket.User.id,
							NumReplies:0,
							Members:{}
						}
						Save.Members[Res.UserID] = {Read:0,Last:new Date().toString()};
						Save.Members[socket.User.id] = {Read:0,Last:new Date().toString()};
						Save.Members = JSON.stringify(Save.Members);
						DB.W.sadd("UserTasks:"+socket.User.id,TaskID);
						DB.W.sadd("TaskMembers:"+TaskID,socket.User.id);
						DB.W.sadd("UserTasks:"+Res.UserID,TaskID);
						DB.W.sadd("TaskMembers:"+TaskID,Res.UserID);
						DB.W.sunionstore("UserContacts:"+socket.User.id,"TaskMembers:"+TaskID,"UserContacts:"+socket.User.id);
						DB.W.sunionstore("UserContacts:"+Res.UserID,"TaskMembers:"+TaskID,"UserContacts:"+Res.UserID);

						DB.W.hincrby("User:"+socket.User.id,"NumCreate",1);
						if(Save.TaskFor != socket.User.id){
							DB.W.hincrby("User:"+socket.User.id,"NumPass",1);
							Modules.internalHandle.Notify(Save.TaskFor,TaskID,socket.User.name+" passed a topic to you: "+Save.Title,Save.Description);
						}
						DB.W.hmset("Task:"+TaskID,Save,function(err,TaskID){
							Modules.send(socket,{callBack:"NewTask",msg:"Topic Saved!"});
						});
						Modules.internalHandle.SendTaskConnected(socket,TaskID,"TaskList");
					}
				});
			});
		} else {
			Modules.send(socket,{callBack:data.callBack,msg:"Please fill in the required fields"});
		}
	},
	NewResponse:function(socket,data){
		if(data.Response){
			data.Response = data.Response.substring(0,10000).trim();
			if(data.TaskID){
				DB.R.hgetall("Task:"+data.TaskID,function(err,Task){
					if(Task){
						DB.R.sismember("TaskMembers:"+Task.id,socket.User.id,function(err,access){
							if(access){
								if(!data.TaskFor || data.TaskFor.length < 6){ data.TaskFor = Task.TaskForEmail; }
								Modules.idByEmail(data.TaskFor,{Source:"NewTask",Title:Task.Title,Description:Task.Description,CreatedBy:socket.User.name+" ("+socket.User.email+")"},function(Res){
									if(Res.Action == "Error"){
										Modules.send(socket,{callBack:data.callBack,msg:"You cannot assign the task to that email address"});
									} else {
										if(data.TaskFor != Task.TaskForEmail && Task.TaskFor != socket.User.id && Task.CreatedBy != socket.User.id){
											Modules.send(socket,{callBack:data.callBack,msg:"Only the person with the ball or the topic creator can pass the topic."});
										} else {
											DB.W.sadd("UserTasks:"+Res.UserID,data.TaskID);
											DB.W.sadd("TaskMembers:"+data.TaskID,Res.UserID);
											DB.W.sunionstore("UserContacts:"+socket.User.id,"TaskMembers:"+data.TaskID,"UserContacts:"+socket.User.id);
											DB.W.sunionstore("UserContacts:"+Res.UserID,"TaskMembers:"+data.TaskID,"UserContacts:"+Res.UserID);
											var Reply = {Response:data.Response,created:new Date().toString(),updated:new Date().toString(),CreatedBy:socket.User.id};
											var UpdateTask = {TaskFor:Res.UserID,TaskForEmail:data.TaskFor,updated:new Date().toString(),NumReplies:(((Task.NumReplies)*1)+1)};
											DB.W.hincrby("User:"+socket.User.id,"NumReply",1);
											if(Res.UserID != Task.TaskFor){
												Reply.TaskPassedFrom = Task.TaskFor;
												Reply.TaskPassedTo = Res.UserID;
												DB.W.hincrby("User:"+socket.User.id,"NumPass",1);
												Modules.internalHandle.Notify(Res.UserID,Task.id,socket.User.name+" passed a topic to you: "+Task.Title,Reply.Response);
											}
											var TaskMembers = JSON.parse(Task.Members);
											for(var U in TaskMembers){
												TaskMembers[U].Read = 0;
												TaskMembers[U].Last = new Date().toString();
											}
											if(!TaskMembers[Res.UserID]){ TaskMembers[Res.UserID] = {}; }
											TaskMembers[Res.UserID].Read = 0;
											TaskMembers[Res.UserID].Last = new Date().toString();
											UpdateTask.Members = JSON.stringify(TaskMembers);

											for(var K in UpdateTask){
												console.log(typeof(UpdateTask[K]));
												console.log(UpdateTask[K]);
											}
											DB.W.hmset("Task:"+data.TaskID,UpdateTask);
											DB.W.rpush("TaskReplies:"+data.TaskID,JSON.stringify(Reply));
											Modules.send(socket,{callBack:data.callBack,msg:"Response Saved!"});

											Modules.internalHandle.SendTaskConnected(socket,data.TaskID,"TaskList");
										}
									}
								});
							} else {
								Modules.send(socket,{callBack:data.callBack,msg:"You do not have access to this task."});
							}
						});
					} else {
						Modules.send(socket,{callBack:data.callBack,msg:"You do not have access to this task [1]."});
					}
				});
			}
		} else {
			Modules.send(socket,{callBack:data.callBack,msg:"You must enter a response"});
		}
	},
	TaskList:function(socket,data){
		DB.R.smembers("UserTasks:"+socket.User.id,function(err,res){
			if(res.length > 0){
				Modules.send(socket,{callBack:data.callBack,Type:"Task",List:res});
			} else {
				Modules.send(socket,{callBack:data.callBack,msg:"You do not have any tasks"});
			}
		});
	},
	Task:function(socket,data){
		DB.R.sismember("UserTasks:"+socket.User.id,data.id,function(err,access){
			if(access){
				DB.R.hgetall("Task:"+data.id,function(err,res){
					if(res){
						//fix permissions check if user is part of task
						res.Type = "Task";
						res.callBack = data.callBack;
						Modules.send(socket,res);
					}
				});
			} else {
				console.log("NO ACCESS TO: "+data.id);
			}
		});
	},
	Replies:function(socket,data){
		DB.R.sismember("UserTasks:"+socket.User.id,data.id,function(err,access){
			if(access){
				DB.R.hget("Task:"+data.id,"id",function(err,res){
					if(!data.lastReply){ data.lastReply = 0; }
					DB.R.lrange("TaskReplies:"+data.id,data.lastReply,"-1",function(err,replies){
						Modules.send(socket,{callBack:data.callBack,Type:"Task",Replies:replies});
					})
				});
			} else {
				console.log("NO ACCESS TO: "+data.id);
			}
		});
	},
	Notices:function(socket,data){
		if(!data.lastReply){ data.lastReply = 0; }
		DB.R.lrange("Notice:"+socket.User.id,data.lastReply,"-1",function(err,replies){
			Modules.send(socket,{callBack:data.callBack,Type:"Notices",Notices:replies});
		})
	},
	ContactList:function(socket,data){
		DB.R.smembers("UserContacts:"+socket.User.id,function(err,res){
			if(res.length > 0){
				Modules.send(socket,{callBack:data.callBack,Type:"Contact",List:res});
			} else {
				Modules.send(socket,{callBack:data.callBack,msg:"You do not have any contacts"});
			}
		});
	},
	Contact:function(socket,data){
		DB.R.sismember("UserContacts:"+socket.User.id,data.id,function(err,access){
			if(access){
				DB.R.hgetall("User:"+data.id,function(err,res){
					if(res){
						if(!res[0]){ res[0] = ''; }
						Modules.send(socket,{callBack:data.callBack,Type:"Contact",id:data.id,name:res.name,email:res.email,NumCreate:res.NumCreate,NumReply:res.NumReply,NumPass:res.NumPass,NumCredit:res.NumCredit});
					}
				});
			}
		});
	},
	UserPreferences:function(socket,data){
		if(!data.name){ data.name = ''; }
		if(data.name.length > 2){
			data.name.substring(0,50).trim();
			var Save = {name:data.name};
			if(data.EmailReminder == false){ Save.EmailReminder = "no"; } else { Save.EmailReminder = "yes"; }
			if(data.EmailPass == false){ Save.EmailPass = "no"; } else { Save.EmailPass = "yes"; }

			DB.W.hmset("User:"+socket.User.id,Save);
			Modules.send(socket,{callBack:data.callBack,msg:"Settings Saved!",Updated:Save});
		} else {
			Modules.send(socket,{callBack:data.callBack,msg:"Your name must at least 3 characters long and less than 50",Updated:Save});
		}
	},
	MarkTaskComplete:function(socket,data){
		DB.R.hmget("Task:"+data.TaskID,"CreatedBy","Title",function(err,res){
			if(res[0] == socket.User.id){
				var Save = {Completed:1,updated:new Date().toString()};
				DB.W.hmset("Task:"+data.TaskID,Save);
				Modules.internalHandle.SendTaskConnected(socket,data.TaskID,"TaskList");
			}
		});
	},
	MarkTaskIncomplete:function(socket,data){
		DB.R.hmget("Task:"+data.TaskID,"CreatedBy","Title","TaskFor",function(err,res){
			if(res[0] == socket.User.id){
				var Save = {Completed:0,updated:new Date().toString()};
				DB.W.hmset("Task:"+data.TaskID,Save);
				Modules.internalHandle.SendTaskConnected(socket,data.TaskID,"TaskList");
			}
		});
	},
	CompletionCredit:function(socket,data){
		DB.R.hmget("Task:"+data.TaskID,"CreatedBy","Members",function(err,res){
			if(!err){
				console.dir(res);
				if(res[0] == socket.User.id){
					var Members = JSON.parse(res[1]);
					if(Members[data.UserID]){
						if(data.Credit){
							DB.W.hincrby("User:"+socket.User.id,"NumCredit",1);
							Members[data.UserID].CompletionCredit = 1;
						} else {
							if(Members[data.UserID].CompletionCredit == 1){
								DB.W.hincrby("User:"+socket.User.id,"NumCredit",-1);
							}
							Members[data.UserID].CompletionCredit = 0;
						}
						DB.W.hset("Task:"+data.TaskID,"Members",JSON.stringify(Members));
						Modules.internalHandle.SendTaskConnected(socket,data.TaskID,"TaskList");
					}
				}
			}
		});
	},
	MarkTaskRead:function(socket,data){
		DB.R.hget("Task:"+data.TaskID,"Members",function(err,res){
			var Members = JSON.parse(res);
			if(Members[socket.User.id]){
				Members[socket.User.id].Read = 1;
				Members[socket.User.id].Last = new Date().toString();
				DB.W.hset("Task:"+data.TaskID,"Members",JSON.stringify(Members));
			}
		});
	},
	MarkTaskUnread:function(socket,data){
		DB.R.hget("Task:"+data.TaskID,"Members",function(err,res){
			var Members = JSON.parse(res);
			if(Members[socket.User.id]){
				Members[socket.User.id].Read = 0;
				Members[socket.User.id].Last = new Date().toString();
				DB.W.hset("Task:"+data.TaskID,"Members",JSON.stringify(Members));
			}
		});
	},
	MarkNoticeRead:function(socket,data){
		DB.R.lindex("Notice:"+socket.User.id,data.Index,function(err,res){
			if(res){
				var Notice = JSON.parse(res);
				Notice.Read = 1;
				DB.W.lset("Notice:"+socket.User.id,data.Index,JSON.stringify(Notice));
			}
		});
	}
};
Modules.internalHandle = {
	SendTaskConnected:function(socket,TaskID,callBack){
		//try on master write
		DB.W.smembers("TaskMembers:"+TaskID,function(err,ids){
			if(err){ console.log("ERR: "+err); }
			if(ids){
				console.dir(ids);
				ids.forEach(function(UserID){
					console.log("attempting to publish to "+UserID);
					DB.W.publish("User:"+UserID,JSON.stringify({do:"Task",id:TaskID,callBack:callBack}));
				});
			}
		});
	},
	NoLike:function(socket,reason){
		DB.W.zincrby("BadGuys",1,socket._socket.remoteAddress);
		socket.close(1000,"Bad Moves");
	},
	Notify:function(UserID,TaskID,Subject,Body){
		var EmailSubject = Subject;
		var EmailBody = Body+"<br><br>";
		EmailBody += "Log into coplete to see the full details of this topic:<br>";
		EmailBody += "https://"+Config.domain+"/#Task:"+TaskID;
		Modules.sendEmail("Notify",UserID,{subject:EmailSubject,body:EmailBody});
	}
}

Modules.onClose = function(socket){
	addr = 'dunno';
	if(socket._socket){
		if(socket._socket.remoteAddress){
			addr = socket._socket.remoteAddress;
		}
	}
	if(socket.User){
		if(socket.User.id){
			console.log(socket.User.email+" ("+addr+") disconnected");
		} else {
			console.log("semi anon socket ("+addr+") disconnected");
		}
	} else {
		console.log("anon socket ("+addr+") disconnected");
	}
}

Modules.sendEmail = function(template,User,data){
	//auth credentials looked for ['State','','','email','v-token','tmpPass']
	DB.R.hgetall("User:"+User,function(err,res){
		if(res){
			if(template == "AccountCreated"){
				if(data.Source == "Registration"){
					var subject = "Coplete: Your Account was Created. Please validate your email address";
					var body = "Your account was created. Please validate your email address by clicking on the link below<br><br>";
					body += "https://"+Config.domain+"/#Login:::"+res.email+":"+res.tmpPass;
				} else if(data.Source == "NewTask"){
					var subject = "Coplete: A new topic was passed to you";
					var body = "A topic was created and passed to you on Coplete. <br><br>";
					body += "Title: "+data.Title+"<br>";
					if(data.Description){
						body += "Description: "+data.Description+"<br>";
					}
					body += "Created By: "+data.CreatedBy+"<br><br>";
					body += "Click on the link below to setup your account on Coplete and review your topics:<br><br>"
					body += "https://"+Config.domain+"/#Login:::"+res.email+":"+res.tmpPass;
				}
			} else if(template == "NewPassword"){
				var subject = "Coplete: Your password was reset";
				var body = "Click the link below to set a new password. <br>";
				var SetSend = {tmpPass:safeToken()}
				SetSend.password = pwHash(SetSend.tmpPass);
				DB.W.hmset("User:"+res.id,SetSend);
				body += "https://"+Config.domain+"/#Login:::"+res.email+":"+SetSend.tmpPass;
			} else if(template == "Notify"){
				var WillSend=true;
				if(res.EmailPass){ if(res.EmailPass == "no"){ WillSend=false; } }
				if(WillSend){
					var subject = data.subject;
					var body = data.body;
				}
			}
			if(subject && body){
				if(res.name){
					var to = res.name+" <"+res.email+">";
				} else {
					var to = res.email;
				}
				email.send(
					{
					host : Config.smtp.host,
					port : Config.smtp.port,
					domain : Config.smtp.domain,
					to : to,
					from : Config.smtp.from,
					subject : subject,
					html: body,
					text:body.replace("<br>","\n"),
					authentication : "login",
					username : Config.smtp.username,
					password : Config.smtp.password
					},
					function(err, result){
						console.log("EMAIL SENDING to: "+to);
						if(err){ console.log(err); }
						console.log(result);
					}
				);
			} else {
				console.log("NO EMAIL SENT: NO SUBJECT OR BODY");
			}
		} else {
			console.log("user not found");
		}
	});
}
function safeToken(){
	var randar = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
	var token = '';
	for(var p=0;p<(10+(Math.random()*20));p++){
		var key = Math.round(Math.random()*(randar.length-1));
		token += randar[key];
	}
	return token;
}
function token(){
	var randar = ['Good','Job','You','Did','It','SlowClap','0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','!','$','#','@','%','&'];
	var token = '';
	for(var p=0;p<(50+(Math.random()*50));p++){
		var key = Math.round(Math.random()*(randar.length-1));
		token += randar[key];
	}
	return token;
}
function validateEmail(email){
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}
function pwHash(pw){
	var salt = bcrypt.genSaltSync(10);  
	var hash = bcrypt.hashSync(pw, salt);
	return hash;
}

//jump to nobody user or some user a few seconds after launch
if(!process.argv[2]){
        setTimeout(function(){
                process.setuid(65534);
                console.log("DOWNGRADED USER");
        },2000);
}
console.log("Socket Executed");

}
