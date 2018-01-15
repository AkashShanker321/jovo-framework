'use strict';

const webhook = require('../../index').Webhook;

webhook.listen(3000, function() {
    console.log('Example server listening on port 3000!');
});

const app = require('../../index').Jovo;

const BasicCard = require('../../index').GoogleAction.BasicCard;
const Carousel = require('../../index').GoogleAction.Carousel;
const List = require('../../index').GoogleAction.List;
const OptionItem = require('../../index').GoogleAction.OptionItem;

app.setConfig({
    requestLogging: true,
    responseLogging: true,
});

app.setIntentMap({
    'Default Welcome Intent': 'HelloWorldIntent',
});

// listen for post requests
webhook.post('/webhook', function(req, res) {
    app.handleRequest(req, res, handlers);
    app.execute();
});


let handlers = {

    'ON_SIGN_IN': function() {
        this.tell('signed in: ' + this.googleAction().getSignInStatus());
    },

    'LAUNCH': function() {
        // this.showAccountLinkingCard();
        // this.googleAction().showAccountLinkingCard();
        // this.addSessionAttribute('bla', 'blub');
        // this.tell('sdsd');
        // this.toIntent('AccountLinkingIntent');
        this.toIntent('ListIntent');
        // this.toIntent('CarouselIntent');
    },
    'AccountLinkingIntent': function() {
        this.showAccountLinkingCard();
    },
    'BasicCardIntent': function() {
        let basicCard = new BasicCard()
            .setTitle('Title')
            .setImage('http://via.placeholder.com/450x350?text=Basic+Card', 'accessibilityText')
            .setFormattedText('Formatted Text')
            .setImageDisplay('WHITE');

        this.googleAction().showBasicCard(basicCard);
        this.googleAction().showSuggestionChips(['List', 'Carousel', 'Basic card']);
        this.ask('Response with basic card', '?');
    },
    'SuggestionsIntent': function() {
        // must end with an ask response
        this.googleAction().showSuggestionChips(['List', 'Carousel', 'Basic card']);
        this.googleAction().showLinkOutSuggestion('Name', 'http://www.example.com');
        this.ask('Suggestion Chips Example', 'Suggestion Chips Example');
    },
    'ListIntent': function() {
        let list = new List();
        list.setTitle('Simple selectable List');

        list.addItem(
            (new OptionItem())
                .setTitle('Show a BasicCard')
                .setDescription('BasicCard')
                .setImage('http://via.placeholder.com/450x350?text=List+item+1', 'accessibilityText')
                .setKey('Listitem1key')
        );
        list.addItem(
            (new OptionItem())
                .setTitle('Show a Carousel')
                .setDescription('Carousel')
                .setKey('Listitem2key')
        );
        this.googleAction().showList(list);
        this.googleAction().showSuggestionChips(['List', 'Carousel', 'Basic card']);
        this.ask('Choose from list', 'Choose from list');
    },
    'CarouselIntent': function() {
        let carousel = new Carousel();

        carousel.addItem(
            (new OptionItem())
                .setTitle('Show a BasicCard')
                .setDescription('BasicCard')
                .setImage('http://via.placeholder.com/650x350?text=Carousel+item+1', 'accessibilityText')
                .setKey('Carouselitem1key')
        );
        carousel.addItem(
            (new OptionItem())
                .setTitle('Show a List')
                .setDescription('Description2')
                .setImage('http://via.placeholder.com/650x350?text=Carousel+item+2', 'accessibilityText')
                .setKey('Carouselitem2key')
        );
        this.googleAction().showCarousel(carousel);
        this.googleAction().showSuggestionChips(['List', 'Carousel', 'Basic card']);

        this.ask('Choose from list', 'Choose from list');
    },
    'HelloWorldIntent': function() {
        this.tell('Hello World');
    },
    'ON_ELEMENT_SELECTED': function() {
        let selectedElement = this.getSelectedElementId();
        if (selectedElement === 'Listitem1key') {
            this.toIntent('BasicCardIntent');
        } else if (selectedElement === 'Listitem2key') {
            this.toIntent('CarouselIntent');
        } else if (selectedElement === 'Carouselitem1key') {
            this.toIntent('BasicCardIntent');
        } else if (selectedElement === 'Carouselitem2key') {
            this.toIntent('ListIntent');
        } else {
            this.tell(this.getSelectedElementId());
        }
    },
};
