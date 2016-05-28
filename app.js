var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');

var app = express();

var token = "EAAYXoVixNkoBALZC6ZCw0TbWiKYEbqgp5zuFdagtx0fvMSXP8ez8R418bG3PV2RnGsBZCrVur7FWc3H7h2VUWZAcw6yji3Ibgzctdg3qjlHLC2WiySgrcK9miHZB1LZC7gjDPtzH7fkPQwEM8rIFTkZBJNLmZACzIhhLjvC5vv61BwZDZD";
var verify_token = 'bankbot';

app.use(bodyParser.json());

app.all('/', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === verify_token) {
        res.send(req.query['hub.challenge']);
    }
    res.send('Error, wrong validation token');
})

app.post('/webhook/', function (req, res) {
    messaging_events = req.body.entry[0].messaging;
    for (i = 0; i < messaging_events.length; i++) {
        event = req.body.entry[0].messaging[i];
        sender = event.sender.id;

        if (event.postback) {
            text = JSON.stringify(event.postback);
            sendTextMessage(sender, 'Confirmation received');
            continue;
        }

        if (event.message && event.message.text) {
            text = event.message.text;

            getUserInfo(sender, callback, text);  
        }
    }
    res.sendStatus(200);
});

function callback(userInfo, text, sender) {
    var data = JSON.stringify({
        ageRange: 'Hi',
        userId: sender,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        question: text
    });

    console.log(data);
    request({
        url: 'http://10.29.20.74:8080/api/question',
        method: 'POST',
        json: data
    }, function (error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    }).on('response', function (response) {
        console.log(response);
        response.on('data', function (data) {
            console.log('data returned from the server' + data);
            sendTextMessage(sender, data.answer);
        });
    });
}

function getUserInfo(userId, callback, text) {
        request({
            url: 'https://graph.facebook.com/v2.6/' + userId + '?fields=first_name,last_name,locale,timezone,gender&access_token=' + token,
            method: 'GET', 
        }, function (error, response, body) {
            console.log(error);    
        }).on('response', function (response) {
            response.on('data', function (data) {
                var parsedData = JSON.parse(data);
                var userData = {
                    firstName: parsedData.first_name,
                    lastName: parsedData.last_name
                };

                callback(userData, text, userId);
            })
        });
}

function sendTextMessage(sender, text) {
    messageData = {
        text: text
    },    
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: token },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: messageData,
        }
    }, function (error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}

app.listen(process.env.PORT || 3000);