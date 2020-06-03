var express                 = require("express"),
    bodyParser              = require('body-parser'),
    mongoose                = require('mongoose'),
    passport                = require("passport"),
    googlestrategy          = require("passport-google-oauth20"),
    keys                    = require("./config/keys"),
    cookiesession           = require("cookie-session"),
    request                 = require('request'),
    unirest                 = require("unirest");

var  app=express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookiesession({
    maxAge:24*60*60*1000,
    keys:[keys.session.cookie]
}))

app.use(passport.initialize());
app.use(passport.session());
mongoose.connect(keys.mongodb.url,{ useNewUrlParser: true });

var userschema = new mongoose.Schema({
    username:String,
    googleid:String,
    amount:Number,
    stocks:[{number:Number,name:Number,profit:Number}],
    transaction:[{company:String,name:Number,number:Number,buyingprice:Number,sellingprice:Number,buysell:Number,dateofbuy:String,dateofsale:String}]
});
var user=mongoose.model("iwpuser",userschema);

passport.serializeUser(function(user,done){
    done(null,user.id);
});
passport.deserializeUser(function(id,done){
    user.findById(id).then((user)=>{
        done(null,user);
    })
});
passport.use(new googlestrategy({
    callbackURL:'/auth/google/redirect',
    clientID:keys.google.clientID,
    clientSecret:keys.google.clientSecret
},function(accessToken,refreshToken,profile,done)
    {
    user.findOne({googleid:profile.id},function(err,currentuser){
        if(currentuser){
            console.log("user exists");
            done(null,currentuser);
        }else{
            new user({
                username:profile.displayName,
                googleid:profile.id,
                amount:10000,
                NoOfStocks:0
            }).save().then((newuser)=>{
                console.log("new user created");
                done(null,newuser);
            });            
        }
        });
}));

app.use(function(req,res,next){
    res.locals.currentuser = req.user;
    next();
 });

//======================================================================================================================
//      routes
//======================================================================================================================

app.get("/",function(req,res){
    res.render("index.ejs");

});


app.post("/mystocks",isloggedin,function(req,res){
        res.redirect("/");
});
app.get("/mystocks",isloggedin,function(req,res){
    var req = unirest("GET", keys.yahoo.url);    
    req.query({
        "region": "US",
        "lang": "en",
        "symbols": "AAPL%2CGOOGL%2CMSFT%2CUBER%2CMS%2CAMZN%2CTXN%2CNTDOY%2CAMRN%2CKR%2CMCK%2CPSX%2CWMT%2CJNJ%2CT%2CF%2CDELL%2CIBM%2CPEP%2CINTC%2CBAC%2CGE"
    });    
    req.headers({
        "x-rapidapi-host": keys.yahoo.host,
        "x-rapidapi-key": keys.yahoo.key,
        "useQueryString": true

    });
    req.end(function (resp) {
        if(resp.error){
            console.log(resp.error);
            res.redirect("/mystocks");
        }
        stocksdata = resp.body["quoteResponse"]["result"];
        res.render("mystocks.ejs",{stocksdata:stocksdata});    
    });  
});
app.get("/allstocks",function(req,res){
    var req = unirest("GET", keys.yahoo.url);    
    req.query({
        "region": "US",
        "lang": "en",
        "symbols": "AAPL%2CGOOGL%2CMSFT%2CUBER%2CMS%2CAMZN%2CTXN%2CNTDOY%2CAMRN%2CKR%2CMCK%2CPSX%2CWMT%2CJNJ%2CT%2CF%2CDELL%2CIBM%2CPEP%2CINTC%2CBAC%2CGE"
    });
    req.headers({
        "x-rapidapi-host": keys.yahoo.host,
        "x-rapidapi-key": keys.yahoo.key,
        "useQueryString": true
    });
    req.end(function (resp) {
        if (resp.error) throw new Error(resp.error);
        stocksdata = resp.body["quoteResponse"]["result"];
        res.render("allstocks.ejs",{stocksdata:stocksdata});         
    });       
});

app.get("/allstocks/:id",function(request,res){
    var req = unirest("GET", keys.yahoo.url);    
    req.query({
        "region": "US",
        "lang": "en",
        "symbols": "AAPL%2CGOOGL%2CMSFT%2CUBER%2CMS%2CAMZN%2CTXN%2CNTDOY%2CAMRN%2CKR%2CMCK%2CPSX%2CWMT%2CJNJ%2CT%2CF%2CDELL%2CIBM%2CPEP%2CINTC%2CBAC%2CGE"
    });    
    req.headers({
        "x-rapidapi-host": keys.yahoo.host,
        "x-rapidapi-key": keys.yahoo.key,
        "useQueryString": true
    });    
    req.end(function (resp) {
        if (resp.error) throw new Error(resp.error);
        stocksdata = resp.body["quoteResponse"]["result"];
        res.render("stocks.ejs",{stocksdata:stocksdata,id:request.params.id}); 
    });    
});
app.get("/login/google",passport.authenticate('google',{
    scope:['profile']
}));

app.get("/auth/google/redirect",passport.authenticate('google'),function(req,res){
    res.redirect("/");
})

app.get("/logout",isloggedin,function(req,res){
    req.logout();
    res.redirect("/");
});

app.get("/profile/:id",isloggedin,function(req,res){
    res.render("profile.ejs");
});

app.get("/mystocks/:id",isloggedin,function(request,res){    
    var req = unirest("GET", keys.yahoo.url);    
    req.query({
        "region": "US",
        "lang": "en",
        "symbols": "AAPL%2CGOOGL%2CMSFT%2CUBER%2CMS%2CAMZN%2CTXN%2CNTDOY%2CAMRN%2CKR%2CMCK%2CPSX%2CWMT%2CJNJ%2CT%2CF%2CDELL%2CIBM%2CPEP%2CINTC%2CBAC%2CGE"
    });    
    req.headers({
        "x-rapidapi-host": keys.yahoo.host,
        "x-rapidapi-key": keys.yahoo.key,
        "useQueryString": true
    });    
    req.end(function (resp) {
        if(resp.error){
            res.redirect("/");
        }
        else{
            stocksdata = resp.body["quoteResponse"]["result"];
            res.render("buystock.ejs",{stocksdata:stocksdata,id:request.params.id,data:1});     
        }
    });
});






app.get("/mystocks/:id/:symbol/:period1/:period2/predict",isloggedin,function(request,res){    


    var req = unirest("GET", keys.yahoo.url);    
    req.query({
        "region": "US",
        "lang": "en",
        "symbols": "AAPL%2CGOOGL%2CMSFT%2CUBER%2CMS%2CAMZN%2CTXN%2CNTDOY%2CAMRN%2CKR%2CMCK%2CPSX%2CWMT%2CJNJ%2CT%2CF%2CDELL%2CIBM%2CPEP%2CINTC%2CBAC%2CGE"
    });    
    req.headers({
        "x-rapidapi-host": keys.yahoo.host,
        "x-rapidapi-key": keys.yahoo.key,
        "useQueryString": true
    });    
    req.end(function (resp) {
        if(resp.error){
            res.redirect("/");
        }
        else{
            stocksdata = resp.body["quoteResponse"]["result"];
            
            var spawn = require("child_process").spawn; 
	
            // Parameters passed in spawn - 
            // 1. type_of_script 
            // 2. list containing Path of the script 
            // and arguments for the script 
            //	req.query.firstname, 
        
            var process = spawn('python',["./final.py",request.params.symbol,request.params.period1,request.params.period2]); 
            
            process.stdout.on('data', function(data) { 
                //res.send(data.toString()); 
                res.render("buystock.ejs",{stocksdata:stocksdata,id:request.params.id,data:data.toString()}); 
            } ) 


        }
    });


});











app.get("/mystocks/:id/buy/:no",isloggedin,function(request,res){    
    var req = unirest("GET", keys.yahoo.url);    
    req.query({
        "region": "US",
        "lang": "en",
        "symbols": "AAPL%2CGOOGL%2CMSFT%2CUBER%2CMS%2CAMZN%2CTXN%2CNTDOY%2CAMRN%2CKR%2CMCK%2CPSX%2CWMT%2CJNJ%2CT%2CF%2CDELL%2CIBM%2CPEP%2CINTC%2CBAC%2CGE"
    });    
    req.headers({
        "x-rapidapi-host": keys.yahoo.host,
        "x-rapidapi-key": keys.yahoo.key,
        "useQueryString": true
    });    
    req.end(function (resp) {
        if (resp.error) throw new Error(resp.error);
        stocksdata = resp.body["quoteResponse"]["result"];
        var flag=-1;
        for(var i=0;i<request.user.stocks.length;i++){
            if(request.user.stocks[i].name==request.params.id){
                flag=i;
                break;
            }
        }
        if(request.user.amount>=stocksdata[request.params.id]["regularMarketPrice"]*parseInt(request.params.no)){
            request.user.stocks[flag].number=parseInt(request.params.no)+request.user.stocks[flag].number;
            request.user.amount-=(parseInt(request.params.no)*stocksdata[request.params.id]["regularMarketPrice"]);
            request.user.amount=request.user.amount.toFixed(2);

            var today = new Date();
            var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
            var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
            var datetime = date+' '+time;

            request.user.transaction.unshift({
                name:parseInt(request.params.id),
                buyingprice:stocksdata[request.params.id]["regularMarketPrice"],
                buysell:1,
                dateofbuy:datetime,
                number:parseInt(request.params.no),
                company:stocksdata[request.params.id]["longName"]
            });

            request.user.save();
           // res.render("buystock.ejs",{stocksdata:stocksdata,id:request.params.id}); 
           res.redirect("/mystocks/"+request.params.id);
        }
        else{
            res.render("buystock.ejs",{stocksdata:stocksdata,id:request.params.id,data:1}); 
        }
       
    });
});

app.get("/mystocks/:id/sell/:no",isloggedin,function(request,res){    
    var req = unirest("GET", keys.yahoo.url);    
    req.query({
        "region": "US",
        "lang": "en",
        "symbols": "AAPL%2CGOOGL%2CMSFT%2CUBER%2CMS%2CAMZN%2CTXN%2CNTDOY%2CAMRN%2CKR%2CMCK%2CPSX%2CWMT%2CJNJ%2CT%2CF%2CDELL%2CIBM%2CPEP%2CINTC%2CBAC%2CGE"
    });    
    req.headers({
        "x-rapidapi-host": keys.yahoo.host,
        "x-rapidapi-key": keys.yahoo.key,
        "useQueryString": true
    });    
    req.end(function (resp) {
        if (resp.error) throw new Error(resp.error);
        stocksdata = resp.body["quoteResponse"]["result"];
        var flag=-1;
        for(var i=0;i<request.user.stocks.length;i++){
            if(request.user.stocks[i].name==request.params.id){
                flag=i;
                break;
            }
        }
        var today = new Date();
        var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        var datetime = date+' '+time;
        
        for(var i=0;i<request.user.transaction.length;i++){
            if(request.user.transaction[i]._id == request.params.no){

                request.user.transaction[i] = {
                    company:request.user.transaction[i].company,
                    name:request.user.transaction[i].name,
                    number:request.user.transaction[i].number,
                    buyingprice:request.user.transaction[i].buyingprice,
                    dateofbuy:request.user.transaction[i].dateofbuy,
                    dateofsale:datetime,
                    buysell:0,
                    sellingprice:stocksdata[request.params.id]["regularMarketPrice"]
                };
                request.user.stocks[flag].number=request.user.stocks[flag].number-request.user.transaction[i].number;
                request.user.stocks[flag].profit=stocksdata[request.params.id]["regularMarketPrice"]-request.user.transaction[i].buyingprice;
                request.user.amount+=(request.user.transaction[i].number*stocksdata[request.params.id]["regularMarketPrice"]);
                request.user.amount=request.user.amount.toFixed(2);
                break;
            }
        }
            request.user.save();
            res.render("buystock.ejs",{stocksdata:stocksdata,id:request.params.id,data:1}); 
            //res.redirect("/mystocks/"+request.params.id);
       
    });
});


function isloggedin(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login/google");
}

app.listen(3000,function(){
    console.log("server is running");
});
