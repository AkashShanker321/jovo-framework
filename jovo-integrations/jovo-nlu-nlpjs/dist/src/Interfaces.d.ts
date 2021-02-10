export interface NlpJsClassification {
    intent: string;
    score: number;
}
export interface NlpjsNluAnswer {
    classifications: NlpJsClassification[];
}
export interface NlpjsSentiment {
    score: number;
    numWords: number;
    numHits: number;
    average: number;
    locale: string;
    vote: string;
}
export interface NlpjsEntity {
    start: number;
    end: number;
    len: number;
    levenshtein: number;
    accuracy: number;
    entity: string;
    type: string;
    option: string;
    sourceText: string;
    utteranceText: string;
}
export interface NlpjsResponse {
    locale: string;
    utterance: string;
    languageGuessed: boolean;
    localeIso2: string;
    language: string;
    nluAnswer: NlpjsNluAnswer;
    intent: string;
    score: number;
    optionalUtterance: string;
    sourceEntities: any[];
    entities: NlpjsEntity[];
    answers: any[];
    actions: any[];
    sentiment: NlpjsSentiment;
}
