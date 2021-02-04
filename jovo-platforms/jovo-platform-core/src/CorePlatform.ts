import {
  ActionSet,
  BaseApp,
  ExtensibleConfig,
  HandleRequest,
  Jovo,
  Platform,
  RequestBuilder,
  ResponseBuilder,
  TestSuite,
} from 'jovo-core';
import { PlatformStorage } from 'jovo-db-platformstorage';
import {
  ActionType,
  CorePlatformApp,
  CorePlatformCore,
  CorePlatformRequest,
  CorePlatformRequestBuilder,
  CorePlatformResponse,
  CorePlatformResponseBuilder,
} from '.';
import _get = require('lodash.get');
import _merge = require('lodash.merge');
import _set = require('lodash.set');

export interface Config extends ExtensibleConfig {
  handlers?: any; // tslint:disable-line:no-any
  defaultOutputAction: ActionType.Text | ActionType.Speech;
}

export class CorePlatform<
  REQ extends CorePlatformRequest = CorePlatformRequest,
  RES extends CorePlatformResponse = CorePlatformResponse
> extends Platform<REQ, RES> {
  requestBuilder = this.getRequestBuilder();
  responseBuilder = this.getResponseBuilder();

  config: Config = {
    defaultOutputAction: ActionType.Speech,
    enabled: true,
  };

  constructor(config?: ExtensibleConfig) {
    super(config);

    if (config) {
      this.config = _merge(this.config, config);
    }

    this.actionSet = new ActionSet(
      [
        'setup',
        '$init',
        '$request',
        '$session',
        '$user',
        '$type',
        '$asr',
        '$nlu',
        '$inputs',
        '$tts.before',
        '$tts',
        '$output',
        '$response',
      ],
      this,
    );
  }

  getAppType(): string {
    return 'CorePlatformApp';
  }

  install(app: BaseApp): void {
    app.$platform.set(this.constructor.name, this);
    app.middleware('setup')!.use(this.setup.bind(this));
    app.middleware('platform.init')!.use(this.initialize.bind(this));
    app.middleware('asr')!.use(this.asr.bind(this));
    app.middleware('nlu')!.use(this.nlu.bind(this));
    app.middleware('before.tts')!.use(this.beforeTTS.bind(this));
    app.middleware('tts')!.use(this.tts.bind(this));
    app.middleware('platform.output')!.use(this.output.bind(this));
    app.middleware('response')!.use(this.response.bind(this));

    app.use(new PlatformStorage());

    this.use(new CorePlatformCore());

    this.augmentJovoPrototype();
  }

  async setup(handleRequest: HandleRequest) {
    await this.middleware('setup')!.run(handleRequest);
  }

  async initialize(handleRequest: HandleRequest) {
    handleRequest.platformClazz = this.appClass;
    await this.middleware('$init')!.run(handleRequest);

    if (!handleRequest.jovo || handleRequest.jovo.constructor.name !== this.getAppType()) {
      return Promise.resolve();
    }

    await this.middleware('$request')!.run(handleRequest.jovo);
    await this.middleware('$type')!.run(handleRequest.jovo);
    await this.middleware('$session')!.run(handleRequest.jovo);

    if (this.config.handlers) {
      _set(
        handleRequest.app,
        'config.handlers',
        _merge(_get(handleRequest.app, 'config.handlers'), this.config.handlers),
      );
    }
  }

  async asr(handleRequest: HandleRequest) {
    if (!handleRequest.jovo || handleRequest.jovo.constructor.name !== this.getAppType()) {
      return Promise.resolve();
    }
    await this.middleware('$asr')!.run(handleRequest.jovo);
  }

  async nlu(handleRequest: HandleRequest) {
    if (!handleRequest.jovo || handleRequest.jovo.constructor.name !== this.getAppType()) {
      return Promise.resolve();
    }
    await this.middleware('$nlu')!.run(handleRequest.jovo);
    await this.middleware('$inputs')!.run(handleRequest.jovo);
  }

  async beforeTTS(handleRequest: HandleRequest) {
    if (!handleRequest.jovo || handleRequest.jovo.constructor.name !== this.getAppType()) {
      return Promise.resolve();
    }
    await this.middleware('$tts.before')!.run(handleRequest.jovo);
  }

  async tts(handleRequest: HandleRequest) {
    if (!handleRequest.jovo || handleRequest.jovo.constructor.name !== this.getAppType()) {
      return Promise.resolve();
    }
    await this.middleware('$tts')!.run(handleRequest.jovo);
  }

  async output(handleRequest: HandleRequest) {
    if (!handleRequest.jovo || handleRequest.jovo.constructor.name !== this.getAppType()) {
      return Promise.resolve();
    }
    await this.middleware('$output')!.run(handleRequest.jovo);
  }

  async response(handleRequest: HandleRequest) {
    if (!handleRequest.jovo || handleRequest.jovo.constructor.name !== this.getAppType()) {
      return Promise.resolve();
    }
    await this.middleware('$response')!.run(handleRequest.jovo);

    await handleRequest.host.setResponse(handleRequest.jovo.$response);
  }

  makeTestSuite(): TestSuite<RequestBuilder<REQ>, ResponseBuilder<RES>> {
    return new TestSuite(this.getRequestBuilder(), this.getResponseBuilder());
  }

  protected get appClass() {
    return CorePlatformApp;
  }

  protected augmentJovoPrototype() {
    Jovo.prototype.$corePlatformApp = undefined;
    Jovo.prototype.corePlatformApp = function (this: Jovo) {
      if (this.constructor.name !== 'CorePlatformApp') {
        throw Error(`Can't handle request. Please use this.isCorePlatformApp()`);
      }
      return this as CorePlatformApp;
    };
    Jovo.prototype.isCorePlatformApp = function (this: Jovo) {
      return this.constructor.name === 'CorePlatformApp';
    };
  }

  protected getRequestBuilder(): RequestBuilder<REQ> {
    return (new CorePlatformRequestBuilder() as unknown) as RequestBuilder<REQ>;
  }

  protected getResponseBuilder(): ResponseBuilder<RES> {
    return (new CorePlatformResponseBuilder() as unknown) as ResponseBuilder<RES>;
  }
}
