var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var LRU = require("lru-cache")

var YZClient = require('yz-open-sdk-nodejs');
var Token = require('yz-open-sdk-nodejs/Token');
var getToken = require('./utils/index.js').getToken;
// 简单的设置下token缓存，可以存到其他存储中
var cache = new LRU({
  maxAge: 604800000
});
var YZ_Client;
var YZToken = '';
// 获取token并初始化有赞请求客服端
getYZToken();

var index = require('./routes/index');
var users = require('./routes/users');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

// 设置接口操作白名单，只有在此申明的接口才能进行操作
// 只支持查，不支持改
// 格式 /^youzan.(在这里增加类型).*\.(增加操作)$/
var API_LIST = {
  // 不要写g，原因见：http://www.365mini.com/page/javascript-regexp-test.htm
  whiteList: /^youzan\.(item|shop|itemcategories|retail|logistics|regions|pay|ump|salesman|crm|users|scrm|ebiz).*\.(get|search|query|getbycode|count|all|list)$/i
}

app.use('/api/:url', function(req, res){
  if(!cache.get('YZToken')){
    getYZToken();
    return res.send({
      code: 40002,
      desc: '正在初始化有赞接口'
    })
  }
  if(!API_LIST.whiteList.test(req.params.url)){
    return res.send({
      code: 40000,
      desc: '没有操作权限！'
    })
  }
  YZ_Client.invoke(req.params.url, '3.0.0', req.method, req.method === 'GET' ? req.query : req.body, undefined).then(function(resp){
    let dataBody = {
      code: '00001',
      data: null,
      desc: 'SUCCESS'
    }
    let body = resp.body;
    try{
      body = JSON.parse(body)
    }catch(e){
      dataBody.code = 40000;
      dataBody.desc = e.msg;
      return res.send(dataBody);
    }
    let { error_response, response} = body;
    console.log(typeof resp.body)
    if(error_response){
      dataBody.code = error_response.code;
      dataBody.desc = error_response.msg;
      if(error_response.code === 40001){
        getYZToken();
      }
    }else{
      dataBody.data = response;
    }
    res.send(dataBody);
    // console.log(response.body);
  }).catch(function(err){
    let dataBody = {
      code: 40000,
      data: null,
      desc: err.message
    }
    // console.log(err);
    res.send(dataBody)
  })
});
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


function getYZToken(){
  // 这里填写后台的设置，kdt_id是授权店铺id
  getToken('client_id', 'client_secret', 'kdt_id', function(err, token){
    if(err){
      return console.log('初始化有赞接口失败')
    }
    YZToken = token.access_token;
    cache.set("YZToken", YZToken);
    console.log('初始化有赞接口成功： ', token)
    YZ_Client = new YZClient(new Token(YZToken));
  });
}

module.exports = app;
