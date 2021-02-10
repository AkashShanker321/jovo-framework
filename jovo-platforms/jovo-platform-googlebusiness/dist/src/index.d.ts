import { TestSuite } from 'jovo-core';
import { GoogleBusinessBot } from './core/GoogleBusinessBot';
import { GoogleBusinessRequestBuilder } from './core/GoogleBusinessRequestBuilder';
import { GoogleBusinessResponseBuilder } from './core/GoogleBusinessResponseBuilder';
import { CarouselCard, StandaloneCard, Suggestion } from './Interfaces';
export interface GoogleBusinessTestSuite extends TestSuite<GoogleBusinessRequestBuilder, GoogleBusinessResponseBuilder> {
}
declare module 'jovo-core/dist/src/core/Jovo' {
    interface Jovo {
        $googleBusinessBot?: GoogleBusinessBot;
        googleBusinessBot(): GoogleBusinessBot;
        isGoogleBusinessBot(): boolean;
    }
}
declare module './core/GoogleBusinessBot' {
    interface GoogleBusinessBot {
        showCarousel(carousel: CarouselCard, fallback?: string): Promise<void>;
        showStandaloneCard(card: StandaloneCard, fallback?: string): Promise<void>;
    }
}
declare module 'jovo-core/dist/src/Interfaces' {
    interface Output {
        GoogleBusiness: {
            Suggestions?: Suggestion[];
            Carousel?: CarouselCard;
            StandaloneCard?: StandaloneCard;
            Fallback?: string;
        };
    }
}
export { GoogleBusiness } from './GoogleBusiness';
export * from './Interfaces';
export * from './core/GoogleBusinessBot';
export * from './core/GoogleBusinessRequest';
export * from './core/GoogleBusinessResponse';
export * from './core/GoogleBusinessSpeechBuilder';
export * from './core/GoogleBusinessUser';
