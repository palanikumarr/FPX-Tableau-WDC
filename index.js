var express = require('express');
var request = require('request');
var app = express();
var COOKIES = [];
app.set('port', (process.env.PORT || 5000))
app.use(express.static(__dirname + '/public'))

app.get('/', function(request, response) {
    response.redirect('/connector.html')
});

app.use('/proxy', function(req, res) {

    var url = req.url.replace('/?url=', '');
    console.info (url);
    
    req.pipe(request({
        url : url,
        headers : {
            'Cookie' : COOKIES.join(";"),
            'Content-Type' : 'application/json'
        }
    }).on("response", function(response, body) {
        var cookies = response.headers['set-cookie'];
        if (typeof cookies === "undefined") return;

        var modifiedCookies = [];
        for (var i = cookies.length - 1; i >= 0; i--) {
            var cookie = cookies[i];
            cookie = cookie.split(";")[0];
            modifiedCookies.push(cookie);
        }

        COOKIES = modifiedCookies;
    })).pipe(res);
});

app.listen(app.get('port'), function() {
    console.log("Node app is running at localhost:" + app.get('port'))
});
