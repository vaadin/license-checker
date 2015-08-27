var express = require('express');
var cors = require('cors');
var app = express();
var http = require("http");

var port = process.env.PORT || 8080;

var router = express.Router();

var example = {
    "startDate": "2015-01-01 00:00:00",
    "licenseKey": "12345678-1234-abcd-1234-12345678abcd",
    "email": "tester@vaadin.com",
    "licensee": "John Tester",
    "licenseName": "cval3",
    "product": {
        "name": "some-product",
        "version": 2
    },
    "inUse": true,
    "nonProfit": false,
    "type": "normal",
    "message": "Some product 2 registered to tester@vaadin.com",
    "expired": false
};

// -- Main logic
router.get('/:licenseKey', function(req, res) {
    var licenseKey = req.params.licenseKey;
    console.log("Incoming:\n" + licenseKey);


    if("12345678-1234-abcd-1234-12345678abcd" === licenseKey) {
        res.json(example);
    }else if("12345678-1234-abcd-1234-12345678abce" === licenseKey) {
        example.type = "evaluation";
        res.json(example);
    }else {
        res.sendStatus(404);
    }
});

app.use(cors());

app.use('/mockserver', router);

//startup
app.listen(port);
console.log('Magic happens on port ' + port);
