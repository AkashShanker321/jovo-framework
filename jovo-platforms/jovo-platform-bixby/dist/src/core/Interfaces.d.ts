import { TestSuite } from 'jovo-core';
import { BixbyRequestBuilder } from './BixbyRequestBuilder';
import { BixbyResponseBuilder } from './BixbyResponseBuilder';
export interface VivContext {
    clientAppVersion: string;
    is24HourFormat: boolean;
    timezone: string;
    screenLocked: boolean;
    sessionId: string;
    locale: string;
    clientAppId: string;
    userId: string;
    canTypeId: string;
    handsFree: boolean;
    bixbyUserId: string;
    grantedPermissions: {
        'bixby-user-id-access': boolean;
    };
    device: string;
}
export interface BixbyRequestJSON {
    $vivContext: VivContext;
    _JOVO_PREV_RESPONSE_: any;
    [key: string]: any;
}
export interface SessionData {
    _JOVO_SESSION_ID_: string;
    _JOVO_STATE_?: string;
    [key: string]: any;
}
export interface Response {
    _JOVO_SPEECH_: string;
    _JOVO_TEXT_: string;
    _JOVO_SESSION_DATA_: SessionData;
    _JOVO_AUDIO_?: {};
}
export interface BixbyTestSuite extends TestSuite<BixbyRequestBuilder, BixbyResponseBuilder> {
}
