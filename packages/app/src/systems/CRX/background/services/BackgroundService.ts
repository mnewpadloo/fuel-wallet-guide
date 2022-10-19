import { CONTENT_SCRIPT_NAME, MessageTypes } from '@fuels-wallet/sdk';
import type { JSONRPCParams } from 'json-rpc-2.0';
import { JSONRPCServer } from 'json-rpc-2.0';

import type { CommunicationProtocol } from './CommunicationProtocol';
import { PopUpService } from './PopUpService';

import { ApplicationService } from '~/systems/AppConnect/services';

type EventOrigin = { origin: string };

export class BackgroundService {
  readonly communicationProtocol: CommunicationProtocol;
  readonly server: JSONRPCServer<EventOrigin>;

  constructor(communicationProtocol: CommunicationProtocol) {
    this.communicationProtocol = communicationProtocol;
    this.server = new JSONRPCServer<EventOrigin>();
    this.setupListeners();
    this.externalMethods([this.accounts, this.connect, this.disconnect]);
  }

  static start(communicationProtocol: CommunicationProtocol) {
    return new BackgroundService(communicationProtocol);
  }

  setupListeners() {
    this.communicationProtocol.on(MessageTypes.request, async (event) => {
      const response = await this.server.receive(event.request, {
        origin: event.sender!.origin!,
      });
      if (response) {
        this.communicationProtocol.postMessage({
          id: event.id,
          type: MessageTypes.response,
          target: CONTENT_SCRIPT_NAME,
          response,
        });
      }
    });
  }

  externalMethods(methods: Array<string | any>) {
    methods.forEach((method) => {
      let methodName = method;
      if (method.name) {
        methodName = method.name;
      }
      this.server.addMethod(methodName, this[methodName].bind(this) as any);
    });
  }

  async connect(_: JSONRPCParams, serverParams: EventOrigin) {
    const origin = serverParams.origin;

    if (origin) {
      const app = await ApplicationService.getApplication(origin);

      if (!app) {
        const popupService = await PopUpService.open(
          origin,
          this.communicationProtocol
        );
        const app = await popupService.requestAuthorization(origin);

        return !!app;
      }

      return !!app;
    }

    return false;
  }

  async disconnect(_: JSONRPCParams, serverParams: EventOrigin) {
    const origin = serverParams.origin;

    if (origin) {
      await ApplicationService.removeApplication(origin);
      return true;
    }

    return false;
  }

  async accounts(_: JSONRPCParams, serverParams: EventOrigin) {
    const origin = serverParams.origin;

    if (origin) {
      const app = await ApplicationService.getApplication(origin);
      return app?.accounts || [];
    }

    return [];
  }
}