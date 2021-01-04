import * as ua from 'universal-analytics';
import _merge = require('lodash.merge');
import * as crypto from 'crypto';
import { Analytics, BaseApp, ErrorCode, HandleRequest, JovoError } from 'jovo-core';
import { Jovo } from 'jovo-framework';
import { Config, Event, TransactionItem, Transaction } from './interfaces';
import { Helper } from './helper';

type validEndReasons =
  | 'Stop'
  | 'ERROR'
  | 'EXCEEDED_MAX_REPROMPTS'
  | 'PLAYTIME_LIMIT_REACHED'
  | 'PlayTimeLimitReached'
  | 'USER_INITIATED'
  | 'undefined';

export class GoogleAnalytics implements Analytics {
  /**
   * Need to save start state -\> will change during handling
   * Need to save lastUsed for calculation timeouts (sessionEnded bug display devices)
   *
   * @param handleRequest - jovo HandleRequest objekt
   */
  static saveStartStateAndLastUsed(handleRequest: HandleRequest): void {
    const { jovo } = handleRequest;

    if (jovo) {
      const stateString: string = jovo.getState() ? jovo.getState() : '/';

      jovo.$data.startState = stateString;
      jovo.$data.lastUsedAt = jovo?.$user.$metaData.lastUsedAt;
    }
  }

  /**
   * Get end reason from session variables
   *
   * @param jovo - unser liebes Jovo objekt.
   * @returns - the endreason saved in the session data.
   */
  static getEndReason(jovo: Jovo): validEndReasons | undefined {
    const endReason: validEndReasons | undefined = jovo.$session.$data.endReason;
    return endReason;
  }

  config: Config = {
    trackingId: '',
    enableAutomaticEvents: true,
    trackEndReasons: false,
    sessionTimeoutInMinutes: 5,
    skipUnverifiedUser: true,
  };
  visitor: ua.Visitor | undefined;

  // this map can be overwritten by skill developers to map endreasons to different custom metric numbers
  readonly endReasonGoogleAnalyticsMap = new Map<validEndReasons, number>([
    ['Stop', 1],
    ['ERROR', 2],
    ['EXCEEDED_MAX_REPROMPTS', 3],
    ['PlayTimeLimitReached', 4],
    ['USER_INITIATED', 5],
    ['undefined', 6],
  ]);

  constructor(config?: Config) {
    if (config) {
      this.config = _merge(this.config, config);
    }
  }

  install(app: BaseApp) {
    if (!this.config.trackingId) {
      throw new JovoError(
        'trackingId has to be set.',
        ErrorCode.ERR_PLUGIN,
        'jovo-analytics-googleanalytics',
        '',
        'You can find your tracking id in Google Analytics by clicking: Admin -> Property Settings -> Tracking Id',
        'https://www.jovo.tech/docs/analytics/googleanalytics',
      );
    }

    app.middleware('before.handler')!.use(GoogleAnalytics.saveStartStateAndLastUsed.bind(this));
    app.middleware('after.platform.init')!.use(this.setGoogleAnalyticsObject.bind(this));
    app.middleware('after.response')!.use(this.track.bind(this));
    app.middleware('fail')!.use(this.sendError.bind(this));
  }

  /**
   * Sets end reason to session variables + updates google analytics metric
   *
   * @param jovo - unser liebes Jovo objekt
   * @param endReason - grund für session ende
   */
  setEndReason(jovo: Jovo, endReason: validEndReasons): void {
    jovo.$session.$data.endReason = endReason;
    const gaMetricNumber = this.endReasonGoogleAnalyticsMap.get(endReason);
    if (gaMetricNumber) {
      jovo.$googleAnalytics.setCustomMetric(gaMetricNumber, '1');
    } else {
      const undefinedMetricNumber = this.endReasonGoogleAnalyticsMap.get('undefined');
      if (undefinedMetricNumber) {
        jovo.$googleAnalytics.setCustomMetric(undefinedMetricNumber, '1');
      }
    }
  }

  /**
   * Auto send intent data after each response. Also setting sessions and flowErrors
   * @param handleRequest
   */
  track(handleRequest: HandleRequest) {
    const jovo: Jovo = handleRequest.jovo!;
    if (!jovo) {
      throw new JovoError(
        'Jovo object is not set',
        ErrorCode.ERR_PLUGIN,
        'jovo-analytics-googleanalytics',
      );
    }

    if (
      Helper.getDiffToLastVisitInMinutes(jovo) > this.config.sessionTimeoutInMinutes &&
      !jovo.isNewSession()
    ) {
      return;
    }

    // Validate current request type
    const { type: requestType } = jovo.getRoute();
    const invalidRequestTypes = ['AUDIOPLAYER'];
    if (!this.config.trackDirectives && invalidRequestTypes.includes(requestType)) {
      return;
    }

    // Either start or stop the session. If sessionTag is undefined, it will be ignored.
    const sessionTag = this.getSessionTag(jovo);
    this.visitor!.set('sessionControl', sessionTag);

    // Track custom set data as custom metrics or dimensions.
    const customData = jovo.$googleAnalytics.$data;
    for (const [key, value] of Object.entries(customData)) {
      if (key.startsWith('cm') || key.startsWith('cd')) {
        this.visitor!.set(key, value);
      }
    }

    // Track intent data.
    const pageview = this.visitor!.pageview(this.getPageParameters(jovo));

    if (this.config.enableAutomaticEvents) {
      // Detect and send FlowErrors
      this.sendUnhandledEvents(jovo);
      this.sendIntentInputEvents(jovo);
    }
    this.visitor?.send((err: any) => {
      if (err) {
        throw new JovoError(err.message, ErrorCode.ERR_PLUGIN, 'jovo-analytics-googleanalytics');
      }
    });
  }

  /**
   * Initiates GoogleAnalytics visitor object with fixed parameters.
   * @param {object} jovo: Jovo object for data like language or platform
   */
  initVisitor(jovo: Jovo) {
    const uuid = this.getUserId(jovo);

    // Initialize visitor with account id and custom client id
    const visitor = ua(this.config.trackingId, uuid, { strictCidFormat: false });
    visitor.set('userId', uuid);
    visitor.set('dataSource', jovo.getType());
    visitor.set('userLanguage', jovo.getLocale());
    // Set user id as a custom dimension to track hits on the same scope
    visitor.set('cd1', uuid);

    this.visitor = visitor;
  }

  /**
   * Tracks uncaught user exceptions.
   * @param {object} handleRequest: HandleRequest to act upon
   */
  sendError(handleRequest: HandleRequest) {
    const jovo: Jovo = handleRequest.jovo!;
    if (!jovo) {
      // don't send anything
      return;
    }

    // Stop the current tracking session.
    this.visitor!.set('sessionControl', 'end');
    this.visitor!.pageview(this.getPageParameters(jovo), (err: any) => {
      if (err) {
        throw new JovoError(err.message, ErrorCode.ERR_PLUGIN, 'jovo-analytics-googleanalytics');
      }
    })
      .exception(handleRequest.error!.name)
      .send();
  }

  /**
   * Detects and sends flow errors, ranging from nlu errors to bugs in the skill handler.
   * @param {object} jovo: Jovo object
   */
  sendUnhandledEvents(jovo: Jovo) {
    const intent = jovo.$request!.getIntentName();
    const { path } = jovo.getRoute();

    // Check if an error in the nlu model occurred.
    if (intent === 'AMAZON.FallbackIntent' || intent === 'Default Fallback Intent') {
      return this.sendUserEvent(jovo, 'UnhandledEvents', 'NLU_Unhandled');
    }

    // If the current path is unhandled, an error in the skill handler occurred.
    if (path.endsWith('Unhandled')) {
      return this.sendUserEvent(jovo, 'UnhandledEvents', 'Skill_Unhandled');
    }
  }

  /**
   * Extract input from intent + send to googleAnalytics via events
   * @param jovo Jovo object
   */
  sendIntentInputEvents(jovo: Jovo) {
    if (jovo.$inputs) {
      for (const [key, value] of Object.entries(jovo.$inputs)) {
        if (!value.key) {
          continue;
        }

        const params: Event = {
          eventCategory: 'Inputs',
          eventAction: value.key, // Input value
          eventLabel: key, // Input key
        };
        this.visitor!.event(params);
      }
    }
  }

  /**
   * Construct pageview parameters, a.k.a intent tracking data.
   * @param {object} jovo: Jovo object
   * @returns {object} pageParameters: Intent data to track
   */
  getPageParameters(jovo: Jovo) {
    const intentType = jovo.$type.type ?? 'fallBackType';
    const intentName = jovo.$request?.getIntentName();
    const customParameters = jovo.$googleAnalytics.$parameters;

    return {
      ...customParameters,
      documentPath: this.getPageName(jovo),
      documentHostName: jovo.$data.startState ? jovo.$data.startState : '/',
      documentTitle: intentName || intentType,
    };
  }

  /**
   * Change state to startState + root intent (not mappedIntent)
   *
   * @param jovo - unser liebes Jovo objekt
   * @override
   */
  getPageName(jovo: Jovo): string {
    const endReason =
      this.getSessionTag(jovo) === 'end' && GoogleAnalytics.getEndReason(jovo)
        ? GoogleAnalytics.getEndReason(jovo)
        : jovo.$type.type;

    const intentName = jovo.$request?.getIntentName() ? jovo.$request?.getIntentName() : endReason;
    const state = jovo.$data.startState ? jovo.$data.startState : '/';
    return `${state}.${intentName}`;
  }

  /**
   * Generates hash for userId.
   * @param {object} jovo: Jovo object
   * @returns {string} uuid: Hashed user id
   */
  getUserId(jovo: Jovo): string {
    const idHash = crypto.createHash('sha256').update(jovo.$user.getId()!).digest('base64');
    return idHash;
  }

  /**
   * Checks if the current session started or ended.
   * @param {object} jovo: Jovo object
   * @returns {string | void} sessionTag: Corresponding session tag (start|end|undefined)
   */
  getSessionTag(jovo: Jovo): string | void {
    if (
      jovo.getMappedIntentName() === 'END' ||
      jovo.$type.type === 'END' ||
      (jovo.$response && jovo.$response.isTell())
    ) {
      return 'end';
    }

    if (jovo.isNewSession()) {
      return 'start';
    }
  }

  /**
   * User Events ties users to event category and action
   * @param {object} jovo: Jovo object
   * @param {string} eventName maps to category -> eventGroup
   * @param {string} eventElement maps to action -> instance of eventGroup
   */
  sendUserEvent(jovo: Jovo, eventCategory: string, eventAction: string) {
    const params: Event = {
      eventCategory,
      eventAction,
      eventLabel: this.getUserId(jovo),
      documentPath: jovo.getRoute().path,
    };

    this.visitor!.event(params);
  }

  /**
   * Sets the analytics variable to the instance of this object for making it accessable in skill code
   * @param handleRequest
   */
  setGoogleAnalyticsObject(handleRequest: HandleRequest) {
    const jovo = handleRequest.jovo;
    if (!jovo) {
      throw new JovoError(
        'Jovo object is not set',
        ErrorCode.ERR_PLUGIN,
        'jovo-analytics-googleanalytics',
      );
    }

    // Initialise visitor object.
    this.initVisitor(jovo);

    // Initialise googleAnalytics object.
    jovo.$googleAnalytics = {
      $data: {},
      $parameters: {},
      sendEvent: (params: Event) => {
        this.visitor!.event(params, (err: any) => {
          if (err) {
            throw new JovoError(
              err.message,
              ErrorCode.ERR_PLUGIN,
              'jovo-analytics-googleanalytics',
            );
          }
        }).send();
      },
      sendTransaction: (params: Transaction) => {
        this.visitor!.transaction(params, (err: any) => {
          if (err) {
            throw new JovoError(
              err.message,
              ErrorCode.ERR_PLUGIN,
              'jovo-analytics-googleanalytics',
            );
          }
        }).send();
      },
      sendItem: (params: TransactionItem) => {
        this.visitor!.transaction(params, (err: any) => {
          if (err) {
            throw new JovoError(
              err.message,
              ErrorCode.ERR_PLUGIN,
              'jovo-analytics-googleanalytics',
            );
          }
        }).send();
      },
      sendUserEvent: (eventCategory: string, eventAction: string) => {
        this.sendUserEvent(jovo, eventCategory, eventAction);
      },
      setCustomMetric(index: number, value: string | number) {
        this.$data[`cm${index}`] = value;
      },
      setCustomDimension(index: number, value: string | number): void {
        this.$data[`cd${index}`] = value;
      },
      setParameter(parameter: string, value: string | number): void {
        this.$parameters[parameter] = value;
      },
      setOptimizeExperiment(experimentId: string, variation: string | number): void {
        this.$parameters[`exp`] = `${experimentId}.${variation}`;
      },
    };
  }
}
