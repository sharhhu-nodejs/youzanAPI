var https = require('https');
var querystring = require('querystring');
module.exports.getToken = function(client_id, client_secret, kdt_id, callback, grant_type="silent"){
  const postData = querystring.stringify({
    client_id,
    grant_type,
    client_secret,
    kdt_id
  });
  var req = https.request({
    hostname: 'open.youzan.com',
    port: 443,
    path: '/oauth/token',
    // url: 'https://open.youzan.com/oauth/token',
    headers: {
      'Content-Type':'application/x-www-form-urlencoded'
    },
    method: 'POST'
  }, function(res){
    let data = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      data += chunk;
      // console.log(typeof chunk, `BODY: ${chunk}`);
    });
    res.on('end', () => {
      try{
        data = JSON.parse(data);
        callback && callback(null, data);
      }catch(e){
        callback && callback(e);
      }
    });
  });
  req.on('error', (e) => {
    callback && callback(e);
    console.error(`problem with request: ${e.message}`);
  });

  // write data to request body
  req.write(postData);
  req.end();
}