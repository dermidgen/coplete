function loger(msg){
	if (typeof DEBUG === 'undefined') { DEBUG=true; }
	if(DEBUG){
		console.dir(msg);
	}
}
var Modules = {Requests:{},CallBack:{},CallBackForever:{}}, socket, User = {}, State = [], Config = {TaskSort:"LastUpdatedEpoch",TaskFilter:"Open"},
Menu = {
		Open:{Short:"All",Long:"All Incomplete",Sort:"LastUpdatedEpoch",Filter:"Open",Unread:[],Total:[]},
		OnMe:{Short:"Me",Long:"Passed to Me",Sort:"LastUpdatedEpoch",Filter:"OnMe",Unread:[],Total:[]},
		ByMe:{Short:"By Me",Long:"Created by Me",Sort:"LastUpdatedEpoch",Filter:"ByMe",Unread:[],Total:[]},
		Watch:{Short:"Watch",Long:"Involves Me",Sort:"LastUpdatedEpoch",Filter:"Watch",Unread:[],Total:[]},
		Complete:{Short:"Done",Long:"Completed Items",Sort:"LastUpdatedEpoch",Filter:"Complete",Unread:[],Total:[]}
},
DB = {
	Nodes:{},TaskList:[],Tasks:{},ContactList:[],Contacts:{},FlashTrack:{}
},
NumRender=0,
NumPassed=0;

function rm(id){
	toRem = byID(id);
	if(toRem){
		toRem.parentNode.removeChild(toRem);
	}
}
function byID(id){ return document.getElementById(id); }

Modules.initSocket = function(){
	if(localStorage.User){ try { User = JSON.parse(localStorage.User); User.authed = 0; } catch(e){ User = {}; } } else { User = {}; }
	if(!User.email){ User.email = ''; }
	if(!User.Token){ User.Token = ''; }

	if(window['WebSocket']){
		var wssURL = "wss://"+document.location.hostname+":"+document.location.port;
		if(document.location.hostname != 'coplete.com'){ wssURL = 'wss://coplete.com'; }
		socket = new WebSocket(wssURL);
		socket.onopen = function(){
			Modules.Requests = {};
			Modules.AppInit();
		};
		socket.onmessage = function(message){
			var data = JSON.parse(message.data);
			loger("Got: "+message.data);
			if(data.NoNo){ User.lastNoNo = data.msg; User.authed=false; Modules.Connection(); }
			Modules.HANDLE(data);
		};

		socket.onclose = function(data){
			User.authed=false;
			loger("close");
			Modules.Connection();
		};
	} else {
		html({ID:"welcomeText",HTML:"Sorry, your browser is a bit too dated to use this app. We like <a href=\"http://www.google.com/chrome\">Chrome</a>"});
	}
}

Modules.send = function(data){
	socket.send(JSON.stringify(data));
	loger("Sent: "+JSON.stringify(data));
}
Modules.parseHash = function(F){
	var CurState = [];
	if(!window.location.hash){ window.location.hash = ['TaskList']; }
	if(window.location.hash){
		var workit = window.location.hash.substr(1).split(":");
		for(var k in workit){
			CurState.push(workit[k]);
		}
	}
	Modules.changeState(CurState,F);
}
Modules.changeState = function(CurState,opFunc){
	var hash = '';
	if(opFunc == 'force'){ var go=true; } else { var go=false; }
	for(var K in CurState){
		hash += CurState[K]+":";
		if(State[K] != CurState[K]){
			State[K] = CurState[K];
			go=true;
		}
	}
	window.location.hash = hash.substring(0,(hash.length-1));
	if(go){
		if(typeof(opFunc) == 'function'){
			opFunc();
		} else {
			if(User.authed && !User.tmpPass){
				loger('authed func running');
				if(!Modules[State[0]] || State[0] == "Login"){ State = ['TaskList','Open']; }
				Modules.CallBack = {};
				Modules[State[0]]();
				loger("Running "+State[0]);
			} else {
				loger('non authed func running');
				Modules.Login();
			}
		}
	}
}
window.onhashchange = Modules.parseHash;
Modules.AppInit = function(){
	rm("welcomeText");
	rm("loginContainer");
	loger("running app init");
	if(User.authed != 1){ User.authed = false; }
	if(socket && User.authed && !User.tmpPass){
		Modules.Nav();
		Modules.parseHash('force');
	} else {
		if(socket){
			Modules.parseHash('force');
		} else {
			Modules.Connection();
		}
	}
}

Modules.Connection = function(){
	rm("welcomeText");
	rm("loginContainer");
	
	if(User.lastNoNo){
		html({ID:"subMenu",Type:"div",Text:"Connection lost, Server said "+User.lastNoNo,Styles:{height:20+"px",opacity:1},AppendTo:"main"});
	} else {
		html({ID:"subMenu",Type:"div",Text:"Connection lost, attempting to reconnect...",Styles:{height:20+"px",opacity:1},AppendTo:"main"});
		setTimeout(Modules.initSocket,2000);
	}
}

Modules.Login = function(){
	rm("welcomeText");
	rm("loginContainer");
	html({ID:"main",Type:"div",HTML:" ",AppendTo:"body"});

	if(State[0] == "NewAccount"){
		html({ID:"loginContainer",HTML:"",Type:"div",Styles:{padding:20+"px"},AppendTo:"main"});
		html({ID:"emailtxtR",Type:"label",Text:"Email Address",Attributes:{for:"emailR"},AppendTo:"loginContainer"});
		html({ID:"emailR",Type:"input",Attributes:{type:"text",value:User.email,placeholder:"email@address"},AppendTo:"loginContainer",Enter:function(){ byID("createAccountButton").onclick(); }});
		html({ID:"createAccountButton",Type:"button",Text:"Create Account",Class:"button",AppendTo:"loginContainer",Click:function(){
			html({ID:"createAccountButton",Text:"Sending...",Attributes:{disabled:true},Class:"buttonG"});
			Modules.send({do:"register",email:getValue("emailR"),callBack:"loginScreen"});
		}});
	} else if(State[0] == "NewPassword"){
		html({ID:"loginContainer",HTML:"",Type:"div",Styles:{padding:20+"px"},AppendTo:"main"});
		html({ID:"emailtxtF",Type:"label",Text:"Email Address",Attributes:{for:"emailF"},AppendTo:"loginContainer"});
		html({ID:"emailF",Type:"input",Attributes:{type:"text",value:User.email,placeholder:"email@address"},AppendTo:"loginContainer",Enter:function(){ byID("createAccountButton").onclick(); }});
		html({ID:"sendNewPasswordButton",Type:"button",Text:"Send New Password",Class:"button",AppendTo:"loginContainer",Click:function(){
			html({ID:"sendNewPasswordButton",Text:"Sending...",Attributes:{disabled:true},Class:"buttonG"});
			Modules.send({do:"NewPassword",email:getValue("emailF"),callBack:"loginScreen"});
		}});
	} else {
		if(User.tmpPass && User.authed){
			html({ID:"loginContainer",HTML:"",Type:"div",Styles:{padding:20+"px"},AppendTo:"main"});
			html({ID:"passwordtxt",Type:"label",Text:"Hello "+User.email+", Please set a password",Attributes:{for:"password"},AppendTo:"loginContainer",Enter:function(){ byID("loginButton").onclick(); }});
			html({ID:"password",Type:"input",Attributes:{type:"password",placeholder:"password",size:10},AppendTo:"loginContainer",Enter:function(){ byID("loginButton").onclick(); }});
			html({ID:"loginButton",Type:"button",Text:"Login",Class:"button",AppendTo:"loginContainer",Click:function(){
				html({ID:"loginButton",Text:"Sending...",Attributes:{disabled:true},Class:"buttonG"});
				Modules.send({do:"SetPass",password:getValue("password"),callBack:"loginScreen"});
			}});
		} else {
			html({ID:"loginContainer",HTML:"",Type:"div",Styles:{padding:20+"px"},AppendTo:"main"});
			html({ID:"emailtxt",Type:"label",Text:"Email Address",Attributes:{for:"email"},AppendTo:"loginContainer"});
			html({ID:"email",Type:"input",Attributes:{type:"text",value:User.email,placeholder:"email@address"},AppendTo:"loginContainer",Enter:function(){ byID("loginButton").onclick(); }});
			html({ID:"passwordtxt",Type:"label",Text:"Password",Attributes:{for:"password"},AppendTo:"loginContainer"});
			html({ID:"password",Type:"input",Attributes:{type:"password",value:"",placeholder:"password",size:10},AppendTo:"loginContainer",Enter:function(){ byID("loginButton").onclick(); }});
			html({ID:"remembertxt",Type:"label",Text:"Remember Me",Attributes:{for:"remember"},Styles:{"font-weight":"normal"},AppendTo:"loginContainer"});
			checked=true; if(User){ if(User.RememberMe === false){ checked=false; } }
			html({ID:"remember",Type:"input",Attributes:{type:"checkbox",checked:checked},AppendFirst:"remembertxt"});
			html({ID:"loginButton",Type:"button",Text:"Login",Class:"button",AppendTo:"loginContainer",Click:function(){
				html({ID:"loginButton",Text:"Sending...",Attributes:{disabled:true},Class:"buttonG"});
				Modules.send({do:"auth",email:getValue("email"),password:getValue("password"),RememberMe:byID("remember").checked,callBack:"loginScreen"});
			}});
		}
	}

	if(State[0] == "NewAccount" || State[0] == "NewPassword"){
		html({ID:"HaveLogin",Type:"div",Text:"Already have an Account?",Styles:{padding:6+"px",cursor:"pointer","font-weight":"bold",color:"#0072BC"},AppendTo:"loginContainer",Click:function(){
			Modules.changeState(['Login'],'force');
		}});
	}
	if(State[0] != "NewAccount"){
		html({ID:"NewAccount",Type:"div",Text:"Need an Account?",Styles:{padding:6+"px",cursor:"pointer","font-weight":"bold",color:"#0072BC"},AppendTo:"loginContainer",Click:function(){
			Modules.changeState(['NewAccount'],'force');
		}});
	}
	if(State[0] != "New Password"){
		html({ID:"NewPassword",Type:"div",Text:"Forgot Password?",Styles:{padding:6+"px",cursor:"pointer","font-weight":"bold",color:"#0072BC"},AppendTo:"loginContainer",Click:function(){
			Modules.changeState(['NewPassword'],'force');
		}});
	}

	Modules.CallBack.loginScreen = function(data){
		html({ID:"loginButton",Text:"Login",Attributes:{disabled:false},Class:"button"});
		html({ID:"createAccountButton",Text:"Create Account",Attributes:{disabled:false},Class:"button"});
		html({ID:"sendNewPasswordButton",Text:"Send New Password",Attributes:{disabled:false},Class:"button"});
		html({ID:"loginNotice",Type:"div",Text:data.msg,Class:"notify animate",Styles:{background:"Yellow"},AppendFirst:"loginContainer",Delay:{func:function(){
			html({ID:"loginNotice",Styles:{"background":""}});
		},time:500}});
		if(data.msg == "Authenticated" && data.user){
			if(!data.user.name){ data.user.name = data.user.email.split("@")[0]; }
			for(var K in data.user){ User[K] = data.user[K]; }
			if(byID("remember")){ User.RememberMe = byID("remember").checked; }
			localStorage.setItem("User",JSON.stringify(User));
			if(State[0] == 'Login' || !Modules[State[0]]){ State = ['TaskList','Open']; }
			Modules.AppInit();
		}
		rm("AutoAttemptStatus");
	};

	if(!User.authed){
		if(User.email && User.Token && User.RememberMe && User.tokenClient && !User.authed){
			html({ID:"AutoAttemptStatus",Type:"div",Text:"Attempting automatic login...",Class:"notify animate",Styles:{background:"Yellow"},AppendFirst:"loginContainer",Delay:{func:function(){
				html({ID:"AutoAttemptStatus",Styles:{"background":""}});
			},time:500}});
			Modules.send({do:"auth",email:User.email,token:User.Token,tokenClient:User.tokenClient,callBack:"loginScreen"});
		}

		var GET = {e:'',v:''};
		if(State[3]){ GET.e = State[3]; User.email = GET.e; }
		if(State[4]){ GET.v = State[4]; }

		if(GET.e && GET.v){
			html({ID:"AutoAttemptStatus",Type:"div",Text:"Setting up new password for: "+GET.e,Class:"notify animate",Styles:{background:"Yellow"},AppendFirst:"loginContainer",Delay:{func:function(){
				html({ID:"AutoAttemptStatus",Styles:{"background":""}});
			},time:500}});
			Modules.send({do:"auth",email:GET.e,tmpPass:GET.v,callBack:"loginScreen"});
		}
	}

	//promo
	var PromoText = ''
	+'<b>[BETA] Coplete</b><br><br>'
	+'Coplete is a topic and conversation manager which focuses on a single concept;<br><b>You always know who has the ball.</b>'
	+'<ol>'
	+'<li>Start a topic and pass it.</li>'
	+'<li>Any recipient can respond and/or pass the responsibility to someone else.</li>'
	+'<li>When satisfied, the creator of the topic can close it.</li>'
	+'</ol>'
	html({ID:"PromoText",Type:"div",HTML:PromoText,Styles:{padding:20+"px"},AppendTo:"loginContainer"});
}

Modules.HANDLE = function(data){
	if(data.Type){
		if(data.List){
			if(!DB[data.Type+"List"]){ DB[data.Type+"List"] = []; }
			data.List.forEach(function(ItemID){
				if(DB[data.Type+"List"].indexOf(ItemID) < 0){ DB[data.Type+"List"].push(ItemID); }
			});
		} else if(data.id){
			if(Modules.ProcessRow[data.Type]){
				data = Modules.ProcessRow[data.Type](data);
			}
			if(!DB[data.Type+"List"]){ DB[data.Type+"List"] = []; }
			if(DB[data.Type+"List"].indexOf(data.id) < 0){ DB[data.Type+"List"].push(data.id); }
			if(data.callBack == data.Type+"List"){
				if(Modules.CallBack[data.Type+"List"]){
					data.List = []; data.List.push(data.id);
				} else {
					if(Modules.CallBack[data.Type+data.id] && data.callBack != data.Type+data.id){
						Modules.CallBack[data.Type+data.id](data);
					}
				}
			}
		}
	}
	if(data.callBack){
		if(Modules.CallBack){
			if(Modules.CallBack[data.callBack]){
				if(typeof(Modules.CallBack[data.callBack]) === "function"){
					Modules.CallBack[data.callBack](data);
				} else {
					for(var F in Modules.CallBack[data.callBack]){
						Modules.CallBack[data.callBack][F](data);
					}
				}
			}
			if(Modules.CallBackForever[data.callBack]){
				Modules.CallBackForever[data.callBack](data);
			}
		}
	}
}
Modules.ProcessRow = {
	Task:function(Task){
		Task.LastUpdatedEpoch = Date.parse(Task.updated);
		if(Task.Completed < 1){ Task.Completed = 0; }
		if(Task.LastUpdatedEpoch < 1){ Task.LastUpdatedEpoch=1; }
		if(typeof(Task.Members) != "object"){ Task.Members = JSON.parse(Task.Members); }

		if(Task.Completed){
			SupNow(['Complete'],['Open','OnMe','ByMe','Watch'],Task);
			Task.What = "DONE";
		} else {
			if(Task.TaskFor == User.id){
				SupNow(['Open','OnMe'],['Complete','Watch'],Task);
				Task.What = "ME";
			} else {
				Task.What = "YOU";
			}
			if(Task.CreatedBy == User.id){
				SupNow(['Open','ByMe'],['Complete','Watch'],Task);
			}
			if(Task.TaskFor != User.id && Task.CreatedBy != User.id){
				SupNow(['Open','Watch'],['Complete','OnMe','ByMe'],Task);
			}
		}
		Modules.GenerateMenu(true);

		if(!DB.Tasks[Task.id]){ DB.Tasks[Task.id] = Task; } else {
			for(var K in Task){ DB.Tasks[Task.id][K] = Task[K]; }
		}
		return Task;
	},
	Contact:function(Contact){
		if(Contact.email == User.email){ Contact.name = "Me"; } else {
			if(!Contact.name){ Contact.name = Contact.email.split("@")[0]; }
		}
		Contact.FullDisplay = Contact.name+" ("+Contact.email+")";
		Contact.Display = Contact.name;
		if(!DB.Contacts[Contact.id]){ DB.Contacts[Contact.id] = Contact; } else {
			for(var K in Contact){ DB.Contacts[Contact.id][K] = Contact[K]; }
		}
		return Contact;
	}
}
Modules.GET = function(Data,What,callBack,AppendFunc){
	if(AppendFunc == 1){
		if(!Modules.CallBack[Data+What]){ Modules.CallBack[Data+What] = []; }
		Modules.CallBack[Data+What].push(callBack);
	} else {
		Modules.CallBack[Data+What] = callBack;
	}
	if(What == "List"){
		if(!Modules.Requests[Data+What] || !DB[Data+What]){
			Modules.send({do:Data+What,callBack:Data+What});
			Modules.Requests[Data+What] = 1;
		} else if(DB[Data+What]){
			callBack({List:DB[Data+What]});
		}
	} else {
		if(DB[Data+"s"][What]){
			callBack(DB[Data+"s"][What]);
		} else {
			if(!Modules.Requests[Data+What]){
				Modules.send({do:Data,id:What,callBack:Data+What});
				Modules.Requests[Data+What] = 1;
			}
		}
	}
}

Modules.getReplies = function(TaskID,callBack){
	var HandleCallBack = function(data){
		if(!DB.Tasks[TaskID].Replies){ DB.Tasks[TaskID].Replies = []; }
		data.Replies.forEach(function(Reply){
			ParsedReply = JSON.parse(Reply);
			DB.Tasks[TaskID].Replies.push(ParsedReply);
			callBack(ParsedReply);
		});
	}
	Modules.CallBack['Task'+TaskID+'Replies'] = HandleCallBack;
	if(DB.Tasks[TaskID].Replies){
		DB.Tasks[TaskID].Replies.forEach(function(Reply){ callBack(Reply); });
		Modules.send({do:"Replies",id:TaskID,lastReply:DB.Tasks[TaskID].Replies.length,callBack:"Task"+TaskID+"Replies"});
	} else {
		Modules.send({do:"Replies",id:TaskID,lastReply:0,callBack:"Task"+TaskID+"Replies"});
	}
}

Modules.Nav = function(){
	html({ID:"navOps",Type:"div",Class:"navContainer",AppendTo:"main"});
	html({ID:"navSettings",Type:"button",Class:"button",Text:User.name,Styles:{float:"right","min-height":18+"px","min-width":80+"px"},Attributes:{expanded:"no"},AppendTo:"navOps",Click:function(fc){
		if(this.getAttribute("expanded") == "no" && fc != "forceclose"){
			html({ID:"navSettings",Class:"buttonG",Attributes:{expanded:"yes"},Text:"Cancel"});
			html({ID:"subMenu",HTML:" ",Styles:{padding:10+"px",height:120+"px",opacity:1}});
			if(byID("newTaskButton").getAttribute("State") == "open"){
				html({ID:"newTaskButton",Text:"New Topic",Class:"button",Attributes:{State:"closed"}});
			}
			html({ID:"logoutButton",Type:"button",Class:"button",Text:"Logout",Styles:{float:"right"},AppendTo:"subMenu",Click:function(){
				localStorage.removeItem("User");
				document.location = '/';
			}});

			html({ID:"ChangeNameText",Type:"label",Text:"Your Name",Attributes:{for:"ChangeName"},AppendTo:"subMenu"});
			html({ID:"ChangeName",Type:"input",Attributes:{placeholder:"Enter your name",value:User.name},AppendTo:"subMenu"});

			var checked = true;
			if(User.EmailReminder){ if(User.EmailReminder == "no"){ var checked = false; } }
			html({ID:"EmailReminderTxt",Type:"label",Text:"Email unread topics to me daily (not implemented)",Attributes:{for:"EmailReminder"},AppendTo:"subMenu"});
			html({ID:"EmailReminder",Type:"input",Attributes:{type:"checkbox",checked:checked},AppendFirst:"EmailReminderTxt"});

			var checked = true;
			if(User.EmailPass){ if(User.EmailPass === "no"){ var checked = false; } }
			html({ID:"EmailPassTxt",Type:"label",Text:"Email me when a topic is passed to me",Attributes:{for:"EmailPass"},AppendTo:"subMenu"});
			html({ID:"EmailPass",Type:"input",Attributes:{type:"checkbox",checked:checked},AppendFirst:"EmailPassTxt"});

			html({ID:"SaveSettings",Type:"button",Class:"button",Text:"Save Settings",AppendTo:"subMenu",Click:function(){
				Modules.CallBack.UserPreferences = function(data){
					if(data.msg == "Settings Saved!"){
						if(data.Updated){
							for(var K in data.Updated){ User[K] = data.Updated[K]; }
						}
						setTimeout(function(){
							byID("navSettings").onclick('forceclose');
						},500);
					} else {
						html({ID:"SaveSettings",Class:"button",Text:"Save Settings",Attributes:{disabled:false}});
						html({ID:"SaveSettingskStatus",Type:"div",Class:"notice",Text:data.msg,Class:"notify animate",Styles:{background:"Yellow"},AppendTo:"subMenu",Delay:{func:function(){
							html({ID:"SaveSettings",Styles:{"background":""}});
						},time:500}});
					}
				};
				if(!this.disabled){
					html({ID:"SaveSettings",Class:"buttonG",Text:"Sending...",Attributes:{disabled:true}});
					Modules.send({do:"UserPreferences",name:getValue("ChangeName"),EmailReminder:byID("EmailReminder").checked,EmailPass:byID("EmailPass").checked,callBack:"UserPreferences"});
				}
			}})
		} else {
			html({ID:"navSettings",Class:"button",Attributes:{expanded:"no"},Text:User.name});
			html({ID:"subMenu",Styles:{padding:0,height:0,"min-height":0,opacity:0,overflow:"hidden"}});
		}
	}});
	html({ID:"subMenu",Type:"div",Class:"animateH",Styles:{padding:0,"border-bottom":"1px solid #666",height:0,opacity:0,overflow:"hidden"},AppendTo:"main"});
	html({ID:"content",Type:"div",AppendTo:"main"});
}
Modules.GenerateMenu = function(upd){
	if(upd === true){
		for(K in Menu){
			if(Menu[K].Unread.length > 0){
				Count = '<span class="NumUnreadBig">'+Menu[K].Unread.length+"/</span>"+Menu[K].Total.length;
				if(K == 'OnMe'){ Color = '#77d42a'; } else { Color = '#378de5'; }
			} else {
				Count = Menu[K].Total.length;
				Color = '#999';
			}
			if(!Count){ Count = '0'; }
			html({ID:"TaskNav"+K+"Count",HTML:Count,Styles:{"background-color":Color}});
		}
	} else {
		loger("Generated Menu");
		if(!State[1]){ State[1] = 'Open'; }
		Config.TaskFilter = State[1];
		var W = (window.innerWidth/5);
		for(var K in Menu){
			(function(Menu,K){
				if(Config.TaskFilter == Menu[K].Filter){ var useClass = "taskMenuO"; } else { var useClass = "taskMenu"; }
				if(window.innerWidth < 720){ var useText = Menu[K].Short; } else { var useText = Menu[K].Long; }
				html({ID:"TaskNav"+K,Type:"div",Class:useClass,Text:useText,Styles:{width:W+"px"},AppendTo:"taskMenuRow",Click:function(){
					html({ID:"TaskNav"+Config.TaskFilter,Class:"taskMenu"});
					html({ID:"TaskNav"+Menu[K].Filter,Class:"taskMenuO"});
					Config.TaskSort = Menu[K].Sort;
					Config.TaskFilter = Menu[K].Filter;
					html({ID:"TaskNav"+Config.TaskFilter,Class:"taskMenuO"});
					setTimeout(function(){
						Modules.changeState(['TaskList',Menu[K].Filter],function(){
							html({ID:"TaskRows",Type:"div",HTML:"",AppendTo:"content"});
							html({ID:"TaskListMsg",Type:"div",Text:"Fetching Topics...",Styles:{padding:"4px"},AppendFirst:"TaskRows"});
							Modules.CallBack['TaskList']({List:DB.TaskList});
						});
					},25)
				}});
				if(Menu[K].Unread.length > 0){
					Count = '<span class="NumUnreadBig">'+Menu[K].Unread.length+"</span>/"+Menu[K].Total.length;
					if(K == 'OnMe'){ Color = '#77d42a'; } else { Color = '#378de5'; }
				} else {
					Count = Menu[K].Total.length;
					Color = '#999';
				}
				if(!Count){ Count = '0'; }
				html({ID:"TaskNav"+K+"Count",Type:"div",Class:"NumUnread",HTML:Count,Styles:{"background-color":Color},AppendTo:"TaskNav"+K});
			})(Menu,K);
		}
	}
}
Modules.TaskList = function(){
	html({ID:"content",Type:"div",HTML:" ",AppendTo:"main"});

	html({ID:"newTaskButton",Type:"button",Class:"button",Text:"New Topic",Attributes:{State:"closed"},AppendFirst:"navOps",Click:function(fc){
		if(this.getAttribute("State") == "closed" && fc != 'forceclose'){
			html({ID:"newTaskButton",Text:"Cancel",Class:"buttonG",Attributes:{State:"open"}});
			if(byID("navSettings").getAttribute("expanded") == "yes"){ html({ID:"navSettings",Class:"button",Attributes:{expanded:"no"},Text:"Settings"}); }
			html({ID:"subMenu",HTML:" ",Styles:{padding:10+"px",height:260+"px",opacity:1}});

			html({ID:"TaskForTxt",Type:"label",Text:"Pass To (leave blank to pass to yourself)",Attributes:{for:"TaskFor"},AppendTo:"subMenu"});
			html({ID:"TaskFor",Type:"input",Class:"input animate",Styles:{width:300+"px"},Attributes:{placeholder:"email@address"},AppendTo:"subMenu",Focus:function(){
				Modules.ContactPicker("TaskFor");
			}});

			html({ID:"TaskTitleTxt",Type:"label",Text:"Title",Attributes:{for:"TaskTitle"},AppendTo:"subMenu"});
			html({ID:"TaskTitle",Type:"input",Styles:{width:300+"px"},Attributes:{placeholder:"Enter a title"},AppendTo:"subMenu"});
			html({ID:"TaskDescTxt",Type:"label",Text:"Description",Attributes:{for:"TaskDesc"},AppendTo:"subMenu"});
			html({ID:"TaskDesc",Type:"textarea",Styles:{height:100+"px",width:"90%"},Attributes:{placeholder:"enter a description (optional)"},AppendTo:"subMenu"});
			html({ID:"SaveTask",Type:"button",Class:"button",Text:"Save and Send Topic",AppendTo:"subMenu",Click:function(){

				var require = {TaskTitle:1};
				var errors = false;
				for(K in require){
					if(!byID(K).value){
						html({ID:K,Styles:{border:"2px solid Red"}});
						//errors=true;
					} else {
						html({ID:K,Styles:{border:""}});
					}
				}
				Modules.CallBack.NewTask = function(data){
					if(data.msg == "Topic Saved!"){
						html({ID:"subMenu",Text:""});
						html({ID:"subMenuCover",Type:"div",Text:data.msg,Styles:{"text-align":"center","font-size":"200%",color:"#999","text-shadow":"1px 1px 1px #CCC",width:"100%",height:"100%"},AppendTo:"subMenu"});
						setTimeout(function(){
							byID("newTaskButton").onclick('forceclose');
						},500);
					} else {
						html({ID:"SaveTask",Class:"button",Text:"Save and Send Topic",Attributes:{disabled:false}});
						html({ID:"SaveTaskStatus",Type:"div",Class:"notice",Text:data.msg,Class:"notify animate",Styles:{background:"Yellow"},AppendTo:"subMenu",Delay:{func:function(){
							html({ID:"SaveTaskStatus",Styles:{"background":""}});
						},time:500}});
					}
				};
				if(!errors && !this.disabled){
					html({ID:"SaveTask",Class:"buttonG",Text:"Sending...",Attributes:{disabled:true}});
					Modules.send({do:"NewTask",Title:getValue("TaskTitle"),TaskFor:getValue("TaskFor"),Description:getValue("TaskDesc"),callBack:"NewTask"});
				}
			}});
		} else {
			html({ID:"newTaskButton",Text:"New Topic",Class:"button",Attributes:{State:"closed"}});
			html({ID:"subMenu",Styles:{padding:0,height:0,"min-height":0,opacity:0,overflow:"hidden"}});
		}
	}});

	html({ID:"taskMenu",Type:"div",Styles:{display:"table","margin-top":"-1px",width:"100%"},AppendTo:"content"});
	html({ID:"taskMenuRow",Type:"div",Styles:{display:"table-row"},AppendTo:"taskMenu"});

	var resizer;
	window.onresize = function(){
		clearTimeout(resizer);
		resizer = setTimeout(function(){
			Modules.GenerateMenu();
		},250);
	};
	Modules.GenerateMenu();

	html({ID:"TaskRows",Type:"div",HTML:"",AppendTo:"content"});
	html({ID:"TaskListMsg",Type:"div",Text:"Fetching Topics...",Styles:{padding:"4px"},AppendFirst:"TaskRows"});
	Modules.GET('Task','List',function(List){
		NumRender=0;
		NumPassed=0;
		if(List.List){
			for(var K in List.List){
				(function runTaskRow(TaskID){
					Modules.taskRow(TaskID);
				})(List.List[K]);
			}
			if(List.List.length < 1){
				html({ID:"TaskListMsg",Text:"You do not have any tasks"});
			}
		} else {
			html({ID:"TaskListMsg",Text:"You do not have any tasks"});
		}
	});
}

Modules.taskRow = function(TaskID){
	Modules.GET("Task",TaskID,function(Task){
		if(Task["Filter:"+Config.TaskFilter]){
			var rclass = "taskRow", tclass="taskRowTitle";
			if(Task.Members[User.id].Read == 0){ rclass = "taskRowU"; tclass="taskRowTitleU"; }

			html({ID:"Task"+Task.id+"Row",Flash:{K:"Task"+Task.id,V:Task.LastUpdatedEpoch},Type:"div",Class:rclass,Styles:{"border-bottom":"1px solid #CCC",height:40+"px",opacity:1},AppendSort:"TaskRows",SortValue:Task[Config.TaskSort],Click:function(){
				Modules.changeState(["Task",Task.id]);
			}});

			html({ID:"Task"+Task.id+"TitleText",Type:"div",Text:Task.Title,Class:tclass,AppendTo:"Task"+Task.id+"Row"});
			html({ID:"Task"+Task.id+"NumReplies",Type:"div",Text:Task.NumReplies,Class:"cornerReplies",AppendTo:"Task"+Task.id+"Row"});
			html({ID:"Task"+Task.id+"Intel",Type:"div",AppendTo:"Task"+Task.id+"Row"});
			html({ID:"Task"+Task.id+"TitleTime",Type:"div",Text:timeAgo(Task.LastUpdatedEpoch),Class:"cornerDate",AppendTo:"Task"+Task.id+"Intel"});
			html({ID:"Task"+Task.id+"Ball",Type:"div",Class:"SmallBall"+Task.What,AppendTo:"Task"+Task.id+"Intel"});
			Modules.GET("Contact",Task.TaskFor,function(Contact){ html({ID:"Task"+Task.id+"Ball",Text:Contact.Display}); },1);
			Modules.TaskMembers(Task,"Task"+Task.id+"Intel","Row");
			NumRender++;
		} else {
			NumPassed++;
		}
		if(NumRender > 0 && NumRender < 2){
			rm("TaskListMsg");
		}
		if(NumRender < 1 && NumPassed > 0 && NumPassed < 2){
			html({ID:"TaskListMsg",Text:"You do not have any tasks in this bucket ("+Menu[Config.TaskFilter].Long+")"});
		}
	});
}
Modules.TaskMembers = function(Task,Display,Type){
	html({ID:"Task"+Task.id+"Members",Type:"div",Text:"",Class:"memberInfo",AppendTo:Display});
	html({ID:"Task"+Task.id+"By",Type:"span",Text:"Created By: ",AppendTo:"Task"+Task.id+"Members"})
	Modules.GET("Contact",Task.CreatedBy,function(Contact){ html({ID:"Task"+Task.id+"ByName",Type:"span",Styles:{"font-weight":"bold"},Text:Contact.Display,AppendTo:"Task"+Task.id+"By"}); },1);
	didone=false;
	for(var M in Task.Members){
		if(M && M != Task.TaskFor && M != Task.CreatedBy){
			if(!byID("Task"+Task.id+"Invovled")){
				html({ID:"Task"+Task.id+"Invovled",Type:"span",Text:" Includes: ",AppendTo:"Task"+Task.id+"Members"});
			}
			if(didone){ com = ", "; } else { com = ""; }
			(function(M,com){
				Modules.GET("Contact",M,function(Contact){ html({ID:"Task"+Task.id+"Member"+M,Type:"span",Styles:{"font-weight":"bold"},Text:com+Contact.Display,AppendTo:"Task"+Task.id+"Invovled"}); },1);
			})(M,com);
			didone=true;
		}
	}
}
Modules.Task = function(){
	if(byID("newTaskButton")){ if(byID("newTaskButton").getAttribute("State") == "open"){ byID("newTaskButton").onclick('forceclose'); } }
	html({ID:"newTaskButton",Type:"button",Class:"button",Text:"< Back",Attributes:{State:"closed"},AppendFirst:"navOps",Click:function(){
		Modules.changeState(["TaskList",Config.TaskFilter]);
	}});

	html({ID:"content",Type:"div",HTML:" ",AppendTo:"main"});

	Modules.GET("Task",State[1],function(Task){
		if(!byID("Task"+Task.id+"Expando")){
			html({ID:"Task"+Task.id+"Expando",Type:"div",Class:"animate",Attributes:{expanded:"yes"},AppendTo:"content"});
		}


		html({ID:"Task"+Task.id+"Topic",Type:"div",AppendTo:"Task"+Task.id+"Expando"});
		html({ID:"Task"+Task.id+"Description",Type:"div",Text:Task.Description,Styles:{color:"#666","font-size":12+"px",padding:"2px 12px"},AppendTo:"Task"+Task.id+"Expando"});
		html({ID:"Task"+Task.id+"Options",Type:"div",AppendTo:"Task"+Task.id+"Expando"});

		html({ID:"Task"+Task.id+"TopicBox",Type:"div",Text:"Topic",Styles:{display:"inline-block",cursor:"pointer",color:"#666",position:"relative",padding:"4px 4px 4px 16px","border":"1px solid #CCC","background-color":"#EEE","font-weight":"bold"},AppendTo:"Task"+Task.id+"Topic",Click:function(fc){
				if(byID("Task"+Task.id+"Expando").getAttribute("expanded") == "yes" || fc == "forceclose"){
					html({ID:"Task"+Task.id+"Expando",Styles:{"max-height":28+"px",overflow:"hidden"},Attributes:{expanded:"no"}});
					html({ID:"Task"+Task.id+"Arrow1",Type:"div",Styles:{position:"absolute",top:"2px",left:4+"px",width:0,height:0,border:"6px solid transparent","border-top":"10px solid #0072BC"},AppendTo:"Task"+Task.id+"TopicBox"});
					html({ID:"Task"+Task.id+"Arrow2",Type:"div",Styles:{position:"absolute",top:"10px",left:4+"px",width:0,height:0,border:"6px solid transparent","border-top":"10px solid #0072BC"},AppendTo:"Task"+Task.id+"TopicBox"});
				} else {
					html({ID:"Task"+Task.id+"Expando",Styles:{overflow:"auto","max-height":300+"px"},Attributes:{expanded:"yes"}});
					html({ID:"Task"+Task.id+"Arrow1",Type:"div",Styles:{position:"absolute",top:"-4px",left:4+"px",width:0,height:0,border:"6px solid transparent","border-bottom":"10px solid #0072BC"},AppendTo:"Task"+Task.id+"TopicBox"});
					html({ID:"Task"+Task.id+"Arrow2",Type:"div",Styles:{position:"absolute",top:"4px",left:4+"px",width:0,height:0,border:"6px solid transparent","border-bottom":"10px solid #0072BC"},AppendTo:"Task"+Task.id+"TopicBox"});
				}
		}});
		html({ID:"Task"+Task.id+"Arrow1",Type:"div",Styles:{position:"absolute",top:"-4px",left:4+"px",width:0,height:0,border:"6px solid transparent","border-bottom":"10px solid #0072BC"},AppendTo:"Task"+Task.id+"TopicBox"});
		html({ID:"Task"+Task.id+"Arrow2",Type:"div",Styles:{position:"absolute",top:"4px",left:4+"px",width:0,height:0,border:"6px solid transparent","border-bottom":"10px solid #0072BC"},AppendTo:"Task"+Task.id+"TopicBox"});

		html({ID:"Task"+Task.id+"Title",Type:"span",Text:Task.Title,Styles:{padding:"4px"},AppendTo:"Task"+Task.id+"Topic"});
		
		html({ID:"Task"+Task.id+"Intel",Type:"div",Styles:{"margin-left":30+"px"},AppendTo:"Task"+Task.id+"Topic"});
		Modules.TaskMembers(Task,"Task"+Task.id+"Intel","Row");

		html({ID:"Task"+Task.id+"UnreadButton",Type:"button",Class:"button",Text:"Mark Unread",Attributes:{expanded:"no"},AppendTo:"Task"+Task.id+"Options",Click:function(e){
			e.stopPropagation();
			DB.Tasks[Task.id].Members[User.id].Read = 0;
			Modules.ProcessRow.Task(DB.Tasks[Task.id]);
			Modules.send({do:"MarkTaskUnread",TaskID:Task.id});
			Modules.changeState(["TaskList",Config.TaskFilter]);
		}});
		if(Task.CreatedBy == User.id){
			if(Task.Completed){
				html({ID:"Task"+Task.id+"MarkTask",Type:"button",Class:"button",Text:"Mark Incomplete",AppendTo:"Task"+Task.id+"Options",Click:function(e){
					e.stopPropagation();
					Modules.send({do:"MarkTaskIncomplete",TaskID:Task.id});
				}});
			} else {
				html({ID:"Task"+Task.id+"MarkTask",Type:"button",Class:"button",Text:"Mark Complete",Attributes:{expanded:"no"},AppendTo:"Task"+Task.id+"Options",Click:function(e){
					e.stopPropagation();
					Modules.send({do:"MarkTaskComplete",TaskID:Task.id});
				}});
			}
		}

		html({ID:"Task"+Task.id+"CompCreditContainer",Type:"div",Text:"",Styles:{padding:0},AppendTo:"Task"+Task.id+"Options",Click:function(e){
			e.stopPropagation();
		}});
		if(Task.Completed){
			html({ID:"Task"+Task.id+"CompCreditContainer",Styles:{padding:10+"px"}});
			html({ID:"Task"+Task.id+"CompCreditTitle",Type:"div",Text:"Completion Credit Goes To...",Styles:{"font-weight":"bold"},AppendTo:"Task"+Task.id+"CompCreditContainer"});
			for(var M in Task.Members){
				html({ID:"Task"+Task.id+"CompCreditBox"+M,Type:"div",Styles:{display:"inline-block","white-space":"nowrap",padding:"8px"},AppendTo:"Task"+Task.id+"CompCreditContainer"});
				(function(M){
					if(Task.CreatedBy == User.id){ var disabled=false } else { var disabled=true; }
					if(Task.Members[M].CompletionCredit == 1){ checked = true; } else { checked = false; }
					html({ID:"Task"+Task.id+"CompCreditCheck"+M,Type:"input",Attributes:{type:"checkbox",checked:checked,disabled:disabled},AppendTo:"Task"+Task.id+"CompCreditBox"+M,Input:function(){
						Modules.send({do:"CompletionCredit",TaskID:Task.id,UserID:M,Credit:this.checked});
					}});
					html({ID:"Task"+Task.id+"CompCreditLabel"+M,Type:"label",Styles:{display:"inline-block"},Attributes:{type:"checkbox",for:"Task"+Task.id+"CompCreditCheck"+M},AppendTo:"Task"+Task.id+"CompCreditBox"+M});
					Modules.GET("Contact",M,function(Contact){
						html({ID:"Task"+Task.id+"CompCreditLabel"+M,Text:Contact.Display});
					},1);
				})(M);
			}
		}

		if(!DB.Tasks[Task.id].Members[User.id].Read){
			Task.Members[User.id].Read = 1;
			Modules.ProcessRow.Task(DB.Tasks[Task.id]);
			setTimeout(function(){ Modules.send({do:"MarkTaskRead",TaskID:Task.id}); },500);
		}

		html({ID:"Task"+Task.id+"Replies",Type:"div",Styles:{"min-height":100+"px","overflow-y":"auto"},AppendTo:"content"});
		html({ID:"Task"+Task.id+"Response",Type:"div",Styles:{"position":"relative"},AppendTo:"content"});

		var check = byID("Task"+Task.id+"Replies");
		function checkScroll(){
			html({ID:"Task"+Task.id+"Replies",Styles:{"max-height":(document.body.clientHeight-(12+getH("navOps")+getH("Task"+Task.id+"Expando")+getH("Task"+Task.id+"Response")))+"px"}});
			if(check.scrollHeight > check.clientHeight){
				html({ID:"Task"+Task.id+"Replies",Styles:{"max-height":(document.body.clientHeight-(12+getH("navOps")+30+getH("Task"+Task.id+"Response")))+"px"}});
				byID("Task"+Task.id+"TopicBox").onclick('forceclose');
				check.scrollTop = check.scrollHeight;
			}
		}

		var resizer;
		window.onresize = function(){
			html({ID:"Task"+Task.id+"ReplyComment",Styles:{width:(window.innerWidth-80)+"px"}});
			clearTimeout(resizer);
			resizer = setTimeout(checkScroll,250);
		};

		var Flash=false;
		if(byID("Task"+Task.id+"RepliesContainer")){
			Flash=true;
		}
		html({ID:"fetchtxt",Type:"div",Text:"Fetching Replies...",AppendTo:"Task"+Task.id+"Replies",Delay:{func:function(){
			rm("fetchtxt");
		},time:1000}});

		Modules.getReplies(Task.id,function(Reply){
			var Index = DB.Tasks[Task.id].Replies.indexOf(Reply);
			html({ID:"fetchtxt",Styles:{display:"none"}});
			if(!byID("Task"+Task.id+"Reply"+Index+"Container")){
				if(Reply.CreatedBy == User.id){
					var align = "left";
				} else {
					var align = "right";
				}
				if(Flash){
					html({ID:"Task"+Task.id+"Reply"+Index+"Container",Type:"div",Class:"responseRow animate",Styles:{background:"rgba(0,153,255,.2)",border:"1px solid #0099FF"},AppendTo:"Task"+Task.id+"Replies",Delay:{func:function(){
						html({ID:"Task"+Task.id+"Reply"+Index+"Container",Styles:{background:"",border:""}});
					},time:500}});
				} else {
					html({ID:"Task"+Task.id+"Reply"+Index+"Container",Type:"div",Class:"responseRow animate",AppendTo:"Task"+Task.id+"Replies"});
				}

				html({ID:"Task"+Task.id+"Reply"+Index+"From",Type:"span",Styles:{"font-weight":"bold"},AppendTo:"Task"+Task.id+"Reply"+Index+"Container"});
				html({ID:"Task"+Task.id+"Reply"+Index+"Response",Type:"span",Text:Reply.Response,AppendTo:"Task"+Task.id+"Reply"+Index+"Container"});
				html({ID:"Task"+Task.id+"Reply"+Index+"TimeAgo",Type:"div",Class:"cornerDate",Text:timeAgo(Date.parse(Reply.created)),AppendTo:"Task"+Task.id+"Reply"+Index+"Container"});

				Modules.GET("Contact",Reply.CreatedBy,function(Contact){
					html({ID:"Task"+Task.id+"Reply"+Index+"From",Text:Contact.Display+": "});
				},1);

				if(Reply.TaskPassedFrom){
					if(Reply.TaskPassedTo == User.id){ Class="SmallBallME"; } else { Class="SmallBall"; }
					html({ID:"Task"+Task.id+"Reply"+Index+"Passed",Type:"div",Class:Class,AppendFirst:"Task"+Task.id+"Reply"+Index+"Container"});
					Modules.GET("Contact",Reply.TaskPassedTo,function(Contact){ html({ID:"Task"+Task.id+"Reply"+Index+"Passed",Text:"Passed to "+Contact.Display}); },1);
				}
				setTimeout(checkScroll,100);
			}
		});

		if(Task.TaskFor == User.id){ Class="BigBallME"; } else { Class="BigBall"; }
		if(Task.Completed){ Class="BigBallDONE"; }

		html({ID:"Task"+Task.id+"BallBar",Type:"div",Class:Class+"Bar",AppendTo:"Task"+Task.id+"Response"})
		html({ID:"Task"+Task.id+"Ball",Type:"div",Class:Class,AppendTo:"Task"+Task.id+"BallBar"})
		
		Modules.GET("Contact",Task.TaskFor,function(Contact){
			if(Contact.email == User.email){ text = "You have the Ball!"; } else { text = Contact.Display+" Has The Ball"; }
			if(Task.Completed){ text = "This topic is complete"; }
			html({ID:"Task"+Task.id+"Ball",Text:text});
		},1);

		if(!byID("Task"+Task.id+"ReplyComment")){
			html({ID:"Task"+Task.id+"CommentBox",Type:"div",AppendTo:"Task"+Task.id+"Response"});
			html({ID:"Task"+Task.id+"ReplyComment",Type:"textarea",Styles:{"min-height":50+"px",width:(window.innerWidth-80)+"px"},Attributes:{placeholder:"Enter your response here"},AppendTo:"Task"+Task.id+"CommentBox"});
		}
		if(!Task.Completed && (Task.CreatedBy == User.id || Task.TaskFor == User.id)){
			html({ID:"Task"+Task.id+"ReplyTaskForTxt",Type:"label",Text:"Pass To",Styles:{"padding-left":"4px"},Attributes:{display:"block",for:"Task"+Task.id+"ReplyTaskForTxt"},AppendBefore:"Task"+Task.id+"CommentBox"});
			html({ID:"Task"+Task.id+"ReplyTaskFor",Type:"input",Class:"input animate",Styles:{width:200+"px"},Attributes:{placeholder:"email@address"},AppendTo:"Task"+Task.id+"ReplyTaskForTxt",Focus:function(){
				html({ID:"Task"+Task.id+"ReplySend",Class:"button"});
				Modules.ContactPicker("Task"+Task.id+"ReplyTaskFor",Task.Members);
			}});
		} else {
			rm("Task"+Task.id+"ReplyTaskForTxt");
			rm("Task"+Task.id+"ReplyTaskFor");
		}
		html({ID:"Task"+Task.id+"ReplySend",Type:"button",Class:"button",Text:"Send",Styles:{position:"absolute",right:4+"px","min-width":56+"px","min-height":56+"px"},AppendTo:"Task"+Task.id+"CommentBox",Click:function(){
			var require = {};
			require["Task"+Task.id+"ReplyComment"] = 1;
			var errors = false;
			for(K in require){
				if(!byID(K).value){
					html({ID:K,Styles:{border:"2px solid Red"}});
					errors=true;
				} else {
					html({ID:K,Styles:{border:""}});
				}
			}

			Modules.CallBack.NewResponse = function(data){
				html({ID:"Task"+Task.id+"ReplySend",Class:"button",Text:"Send",Attributes:{disabled:false}});
				if(data.msg == "Response Saved!"){
					byID("Task"+Task.id+"ReplyComment").value = '';
					byID("Task"+Task.id+"ReplyTaskFor").value = '';
					html({ID:"SaveReplyStatus",Type:"div",Class:"notice",Text:data.msg,Class:"notify animate",Styles:{background:"Yellow"},AppendTo:"Task"+Task.id+"ReplySendContainer",Delay:{func:function(){
						html({ID:"SaveTaskStatus",Styles:{"background":""}});
						setTimeout(function(){
							rm("SaveReplyStatus");
						},250);
					},time:500}});
				} else {
					html({ID:"SaveReplyStatus",Type:"div",Class:"notice",Text:data.msg,Class:"notify animate",Styles:{background:"Yellow"},AppendTo:"Task"+Task.id+"ReplySendContainer",Delay:{func:function(){
						html({ID:"SaveTaskStatus",Styles:{"background":""}});
					},time:500}});
				}
			};
			if(!errors && !this.disabled){
				html({ID:"Task"+Task.id+"ReplySend",Class:"buttonG",Text:"Sending...",Attributes:{disabled:true}});
				Modules.send({do:"NewResponse",TaskID:Task.id,Response:getValue("Task"+Task.id+"ReplyComment"),TaskFor:getValue("Task"+Task.id+"ReplyTaskFor"),callBack:"NewResponse"});
			}
		}});

	});
}

Modules.ContactPicker = function(Display,Members){
	var DisplayElement = byID(Display);
	var pos = getPos(DisplayElement);
	if(!pos){ pos.x = 0; pos.y = 100+"px"; }
	if(DisplayElement.value == 'Me'){ DisplayElement.value = ''; }
	DisplayElement.onblur = function(){
		html({ID:"contactPicker",Styles:{"height":"","min-height":0,"max-height":0}});
		setTimeout(function(){
			rm("contactPicker");
		},250);
	}
	DisplayElement.oninput = function(){
		if(this.value.length > 0){ srch = this.value.toLowerCase(); } else { srch = false; }
		var list = byID("contactPicker");
		if(list){
			if(list.childNodes){
				for(var i in list.childNodes){
					if(list.childNodes[i].innerHTML){
						if(srch){
							if(list.childNodes[i].innerText.toLowerCase().match(srch)){
								list.childNodes[i].style.display = '';
							} else {
								list.childNodes[i].style.display = 'none';
							}
						} else {
							list.childNodes[i].style.display = '';
						}
					}
				}
			}
		}
	}

	html({ID:"contactPicker",Type:"div",Class:"contactPicker animate",Styles:{height:"",left:pos.x+"px",top:(pos.y+DisplayElement.offsetHeight-2)+"px"},AppendTo:"main"});
	var fixDir = function(){
		if((pos.y+DisplayElement.offsetHeight+2+getH("contactPicker")) > document.body.clientHeight){
			html({ID:"contactPicker",Styles:{top:pos.y-getH("contactPicker")+"px"}});
		}
	}
						


	setTimeout(function(){
		html({ID:"contactPicker",Styles:{"min-height":20+"px","max-height":400+"px"}});
	},10);
	if(Members){
		html({ID:"contactPikcerInList",Type:"div",Text:"People on this Topic",Styles:{"font-weight":"bold"},AppendTo:"contactPicker"});
		for(var M in Members){
			html({ID:"contactPickerInList"+M,Type:"div",Class:"contactRow",AppendTo:"contactPicker"});
			(function(M){
				Modules.GET("Contact",M,function(Contact){
					html({ID:"contactPickerInList"+M,Type:"div",Class:"contactRow",Text:Contact.FullDisplay,AppendTo:"contactPicker",Click:function(){
						DisplayElement.value = Contact.email;
						setTimeout(function(){
							DisplayElement.onblur();
						},20)
					}});
					setTimeout(fixDir,200);
				},1);
			})(M)
		}
		html({ID:"contactPikcerAll",Type:"div",Text:"All Contacts",Styles:{"font-weight":"bold"},AppendTo:"contactPicker"});
	}

	Modules.GET("Contact","List",function(data){
		if(data.List){
			data.List.forEach(function(ContactID){
				Modules.GET("Contact",ContactID,function(Contact){
					html({ID:"Contact"+ContactID,Type:"div",Class:"contactRow",Text:Contact.FullDisplay,AppendTo:"contactPicker",Click:function(){
						DisplayElement.value = Contact.email;
						setTimeout(function(){
							DisplayElement.onblur();
						},20)
					}});
					setTimeout(fixDir,200);
				},1);
			});
		}
	});
}
function DOM(dom,K,html){
	this.dom = dom;
	switch(K){
		case "Styles":
			for(var S in html[K]){
				this.dom.style.setProperty(S,html[K][S]);
			}
			break;
		case "Attributes":
			for(var A in html[K]){
				this.dom.setAttribute(A,html[K][A]);
				if(A == "disabled" || A == "checked"){
					if(html[K][A]){ this.dom[A] = true; } else { this.dom[A] = false; }
				}
			}
			break;
		case "Click":
			this.dom.onclick = html.Click;
			break;
		case "Class":
			this.dom.className = html.Class;
			break;
		case "Delay":
			setTimeout(html.Delay.func,html.Delay.time);
			break;
		case "Input":
			this.dom.oninput = html.Input;
			this.dom.onchange = html.Input;
			break;
		case "Focus":
			this.dom.onfocus = html.Focus;
			break;
		case "Blur":
			this.dom.onblur = html.Blur;
			break;
		case "MouseDown":
			this.dom.onmousedown = html.MouseDown;
			break;
		case "Enter":
			this.dom.addEventListener('keydown', function(e){
				if(e.which == "13"){
					html.Enter();
				}
			});
			break;
		case "SortValue":
			this.dom.setAttribute("sv",html.SortValue);
			break;
		case "AppendSort":
			this.AppendSort = byID(html.AppendSort);
			if(!this.AppendSort.firstChild){
				this.AppendSort.appendChild(this.dom);
			} else {
				placed=false;
				placedFoReal=false;
				r=0;
				while(!placed){
					if(this.AppendSort.childNodes[r]){
						if(html.SortValue > this.AppendSort.childNodes[r].getAttribute("sv")){
							placed=true
							placedFoReal=true;
							this.AppendSort.insertBefore(this.dom,this.AppendSort.childNodes[r]);
						}
					}
					r++;
					if(r >= this.AppendSort.childNodes.length){ placed=true; }
				}
				if(!placedFoReal){
					this.AppendSort.appendChild(this.dom);
				}
			}
			break;
		case "Text":
			if(this.dom.innerText != undefined){ this.dom.innerText = html.Text; } else { this.dom.textContent = html.Text; }
			break;
		case "HTML":
			dom.innerHTML = html.HTML;
			break;
		case "AppendFirst":
			this.AppendFirst = byID(html.AppendFirst);
			if(this.AppendFirst){
				if(this.AppendFirst.firstChild){
					if(this.AppendFirst.firstChild != this.dom){
						this.AppendFirst.insertBefore(this.dom,this.AppendFirst.firstChild);
					}
				} else {
					html.AppendTo = html.AppendFirst;
					DOM(this.dom,"AppendTo",html);
				}
			}
			break;
		case "AppendBefore":
			this.AppendBefore = byID(html.AppendBefore);
			if(this.AppendBefore){
				if(this.AppendBefore){
					this.AppendBefore.parentNode.insertBefore(this.dom,this.AppendBefore);
				}
			}
			break;
		case "AppendTo":
			this.AppendTo = byID(html.AppendTo);
			if(this.AppendTo){
				if(this.dom.parentNode){
					if(this.dom.parentNode.id != this.AppendTo.id){
						this.AppendTo.appendChild(this.dom);
					}
				} else {
					this.AppendTo.appendChild(this.dom);
				}
			}
			break;
		case "Flash":
			if(!DB.FlashTrack[html.Flash.K]){
				DB.FlashTrack[html.Flash.K] = html.Flash.V;
			} else {
				if(html.Flash.V != DB.FlashTrack[html.Flash.K]){
					Flash(html.ID);
					DB.FlashTrack[html.Flash.K] = html.Flash.V;
					if(html.Flash.Kill){
						delete DB.FlashTrack[html.Flash.Kill];
					}
				}
			}
			break;
	}
}
function html(html){
	(function htmlASYNC(html){
		this.dom = byID(html.ID);
		if(!this.dom){
			if(html.Type){
				this.dom = document.createElement(html.Type);
				this.dom.id = html.ID;
			}
		}
		if(this.dom){
			for(var K in html){
				DOM(this.dom,K,html)
			}
		}
	})(html);
}
function Flash(id){
	(function(id){
		var el = byID(id);
		if(el){
			pos = {x:el.offsetLeft,y:el.offsetTop,w:el.offsetWidth,h:el.offsetHeight};
			html({ID:"GonnaFlash"+id,Type:"div",Class:"Flash animate",Styles:{left:(pos.x+(pos.w*.5))+"px",top:(pos.y+(pos.h*.5))+"px",width:0,height:0},AppendTo:"body"});
			setTimeout(function(){
				html({ID:"GonnaFlash"+id,Styles:{left:pos.x+"px",top:pos.y+"px",width:(pos.w-2)+"px",height:(pos.h-2)+"px"}});
				setTimeout(function(){
					html({ID:"GonnaFlash"+id,Styles:{opacity:0}});
					setTimeout(function(){
						rm("GonnaFlash"+id);
					},250);
				},300);
			},10);
		}
	})(id);
}

function getValue(id){
	item = byID(id);
	if(item){
		if(item.value){ return item.value; }
	}
	return '';
}
	
function timeAgo(date){
	//thanks stack overflow: i forget
	diff = (Date.parse(new Date())-date);
	if(diff < 1){ diff = 1; }
	if(diff < (1000*60)){ return "Just Now"; }
	if(diff < (1000*60*60)){ ret = Math.round(diff/1000/60); if(ret == 1){ return ret+" min ago"; } else { return ret+" mins ago" } }
	if(diff < (1000*60*60*24)){ ret = Math.round(diff/1000/60/60); if(ret == 1){ return ret+" hour ago"; } else { return ret+" hrs ago" } }
	if(diff < (1000*60*60*24*365)){ ret = Math.round(diff/1000/60/60/24); if(ret == 1){ return ret+" day ago"; } else { return ret+" days ago" } }
	ret = Math.round(diff/1000/60/60/24/365);  if(ret == 1){ return ret+" yr ago"; } else { return ret+" yrs ago" }
}
var SupNow = function(AddTo,RemoveFrom,Task){
	AddTo.forEach(function(Ar){
		Task["Filter:"+Ar] = 1;
		if(Menu[Ar].Total.indexOf(Task.id) < 0){ Menu[Ar].Total.push(Task.id); }
		if(Task.Members[User.id].Read == 1){
			if(Menu[Ar].Unread.indexOf(Task.id) >= 0){
				Menu[Ar].Unread.splice(Menu[Ar].Unread.indexOf(Task.id),1);
			}
		} else {
			if(Menu[Ar].Unread.indexOf(Task.id) < 0){ Menu[Ar].Unread.push(Task.id); }
		}
	});
	RemoveFrom.forEach(function(Ar){
		Task["Filter:"+Ar] = 0;
		if(Menu[Ar].Total.indexOf(Task.id) >= 0){ Menu[Ar].Total.splice(Menu[Ar].Total.indexOf(Task.id),1); }
		if(Menu[Ar].Unread.indexOf(Task.id) >= 0){ Menu[Ar].Unread.splice(Menu[Ar].Total.indexOf(Task.id),1); }
	});

}
function getH(el){
	check = byID(el);
	if(check){ if(check.offsetHeight){ return check.offsetHeight; }  }
	return 0;
}
		
function getPos( el ) {
 	var w = el.offsetWidth;
	var h = el.offsetHeight;
	for (var lx=0, ly=0;
		el != null;
		lx += el.offsetLeft, ly += el.offsetTop, el = el.offsetParent);
    return {x: lx,y: ly,w:w,h:h};
}

Modules.initSocket();
