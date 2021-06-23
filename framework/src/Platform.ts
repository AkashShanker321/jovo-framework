import { JovoResponse, OutputTemplateConverterStrategy } from '@jovotech/output';
import _merge from 'lodash.merge';
import {
  App,
  AppBaseMiddleware,
  ArrayElement,
  Constructor,
  HandleRequest,
  InvalidParentError,
  Jovo,
  JovoConstructor,
  JovoUser,
} from '.';
import { Extensible, ExtensibleConfig } from './Extensible';
import { JovoRequest } from './JovoRequest';
import { JovoUserConstructor } from './JovoUser';
import { MiddlewareCollection } from './MiddlewareCollection';

export type PlatformBaseMiddlewares = [
  '$init',
  '$request',
  '$session',
  '$user',
  '$type',
  '$asr',
  '$nlu',
  '$inputs',
  '$output',
  '$response',
];

export type PlatformBaseMiddleware = ArrayElement<PlatformBaseMiddlewares>;

export const BASE_PLATFORM_MIDDLEWARES: PlatformBaseMiddlewares = [
  '$init',
  '$request',
  '$session',
  '$user',
  '$type',
  '$asr',
  '$nlu',
  '$inputs',
  '$output',
  '$response',
];

export abstract class Platform<
  REQUEST extends JovoRequest = JovoRequest,
  RESPONSE extends JovoResponse = JovoResponse,
  JOVO extends Jovo<REQUEST, RESPONSE> = Jovo<REQUEST, RESPONSE>,
  CONFIG extends ExtensibleConfig = ExtensibleConfig,
> extends Extensible<CONFIG, PlatformBaseMiddlewares> {
  abstract readonly requestClass: Constructor<REQUEST>;
  abstract readonly jovoClass: JovoConstructor<REQUEST, RESPONSE, JOVO, this>;
  abstract readonly userClass: JovoUserConstructor<REQUEST, RESPONSE, JOVO>;

  abstract outputTemplateConverterStrategy: OutputTemplateConverterStrategy<RESPONSE>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract isRequestRelated(request: REQUEST | Record<string, any>): boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract isResponseRelated(response: RESPONSE | Record<string, any>): boolean;
  abstract finalizeResponse(
    response: RESPONSE | RESPONSE[],
    jovo: JOVO,
  ): RESPONSE | RESPONSE[] | Promise<RESPONSE> | Promise<RESPONSE[]>;

  initializeMiddlewareCollection(): MiddlewareCollection<PlatformBaseMiddlewares> {
    return new MiddlewareCollection<PlatformBaseMiddlewares>(...BASE_PLATFORM_MIDDLEWARES);
  }

  install(parent: Extensible) {
    if (!(parent instanceof App)) {
      throw new InvalidParentError(this.constructor.name, App);
    }
    const propagateMiddleware = (
      appMiddleware: AppBaseMiddleware,
      middleware: PlatformBaseMiddleware,
    ) => {
      parent.middlewareCollection.use(
        appMiddleware,
        async (handleRequest: HandleRequest, jovo: Jovo, ...args) => {
          if (jovo.$platform?.constructor?.name !== this.constructor.name) {
            return;
          }
          return this.middlewareCollection.run(middleware, handleRequest, jovo, ...args);
        },
      );
    };

    // TODO determine actual middleware mappings and add missing ones
    propagateMiddleware('request', '$request');
    propagateMiddleware('interpretation.asr', '$asr');
    propagateMiddleware('interpretation.nlu', '$nlu');
    propagateMiddleware('response.output', '$output');
  }

  createJovoInstance<APP extends App>(
    app: APP,
    handleRequest: HandleRequest,
  ): Jovo<REQUEST, RESPONSE> {
    return new this.jovoClass(app, handleRequest, this);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createRequestInstance(request: REQUEST | Record<string, any>): REQUEST {
    const instance = new this.requestClass();
    _merge(instance, request);
    return instance;
  }

  createUserInstance(jovo: JOVO): JovoUser<REQUEST, RESPONSE, JOVO> {
    return new this.userClass(jovo);
  }
}
