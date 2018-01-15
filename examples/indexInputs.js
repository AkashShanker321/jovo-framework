'use strict';

// =================================================================================
// App Configuration: Create Webhook + Enable Logging
// =================================================================================

const webhook = require('../index').Webhook;
const app = require('../index').Jovo;

// Enable Logging for Quick Testing
app.setConfig({
    requestLogging: true,
    responseLogging: true,
});

// Listen for post requests
webhook.listen(3000, function() {
    console.log('Example server listening on port 3000!');
});

webhook.post('/webhook', function(req, res) {
    app.handleRequest(req, res, handlers);
    app.execute();
});

// =================================================================================
// App Logic: Get name parameter and say hello
// =================================================================================

let handlers = {

    'LAUNCH': function() {
        this.ask('What\'s your name?', 'Tell me your name, please.');
    },

    'NameIntent': function(name) {
        this.tell('Hello ' + name);
    },
};

// quick testing
// node indexInputs.js --intent NameIntent --parameter name=John

