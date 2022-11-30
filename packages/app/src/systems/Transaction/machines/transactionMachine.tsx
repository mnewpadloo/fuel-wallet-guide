import type {
  BN,
  Transaction,
  TransactionResponse,
  TransactionResult,
} from 'fuels';
import type { InterpreterFrom, StateFrom } from 'xstate';
import { assign, createMachine } from 'xstate';

import { TxService } from '../services';
import type { TxStatus } from '../types';
import { getTxStatus, isValidTxId } from '../utils';

import { FetchMachine } from '~/systems/Core';
import { NetworkService } from '~/systems/Network';

export const INVALID_TX_ID_ERROR = 'Invalid transaction ID';

type GetTransactionResponse = {
  txResponse: TransactionResponse;
  tx: Transaction;
  status: TxStatus;
};

type MachineContext = {
  error?: string;
  txResponse?: TransactionResponse;
  txStatus?: TxStatus;
  tx?: Transaction;
  txResult?: TransactionResult<any>;
  fee?: BN;
};

type MachineServices = {
  getTransaction: {
    data: GetTransactionResponse;
  };
  getTransactionResult: {
    data: TransactionResult<any>;
  };
};

type MachineEvents = {
  type: 'GET_TRANSACTION';
  input: { providerUrl?: string; txId?: string };
};

export const transactionMachine = createMachine(
  {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    tsTypes: {} as import('./TransactionMachine.typegen').Typegen0,
    schema: {
      context: {} as MachineContext,
      services: {} as MachineServices,
      events: {} as MachineEvents,
    },
    predictableActionArguments: true,
    id: '(machine)',
    initial: 'idle',
    states: {
      idle: {
        on: {
          GET_TRANSACTION: [
            {
              cond: 'isInvalidTxId',
              actions: 'assignInvalidTxIdError',
            },
            {
              target: 'fetching',
            },
          ],
        },
      },
      fetching: {
        invoke: {
          src: 'getTransaction',
          data: (_, event: MachineEvents) => ({
            input: event.input,
          }),
          onDone: [
            {
              actions: ['assignGetTransactionResponse'],
              target: 'fetchingResult',
            },
          ],
        },
      },
      fetchingResult: {
        invoke: {
          src: 'getTransactionResult',
          data: (_) => ({
            input: {
              txResponse: _.txResponse,
            },
          }),
          onDone: [
            {
              actions: ['assignGetTransactionResult'],
              target: 'idle',
            },
          ],
        },
      },
    },
  },
  {
    actions: {
      assignInvalidTxIdError: assign({
        error: (_) => INVALID_TX_ID_ERROR,
      }),
      assignGetTransactionResponse: assign((_, event) => {
        const data = event.data as GetTransactionResponse;

        return {
          txResponse: data.txResponse,
          tx: data.tx,
          txStatus: data.status,
        };
      }),
      assignGetTransactionResult: assign((_, event) => {
        const txResult = event.data as TransactionResult<any>;

        return {
          txResult,
          transaction: txResult.transaction,
          txStatus: getTxStatus(txResult.status.type),
          fee: txResult.fee,
        };
      }),
    },
    guards: {
      isInvalidTxId: (ctx, ev) => !isValidTxId(ev.input?.txId),
    },
    services: {
      getTransaction: FetchMachine.create<
        { providerUrl?: string; txId: string },
        GetTransactionResponse
      >({
        showError: true,
        async fetch({ input }) {
          if (!input?.txId || !isValidTxId(input?.txId)) {
            throw new Error('Invalid tx ID');
          }

          const selectedNetwork = await NetworkService.getSelectedNetwork();
          const defaultProvider = import.meta.env.VITE_FUEL_PROVIDER_URL;

          const providerUrl =
            input?.providerUrl || selectedNetwork?.url || defaultProvider;

          const txResponse = await TxService.fetch({
            providerUrl,
            txId: input.txId,
          });

          const { transaction, transactionWithReceipts } =
            await txResponse.fetch();

          const status = getTxStatus(transactionWithReceipts.status?.type);

          return { tx: transaction, txResponse, status };
        },
      }),
      getTransactionResult: FetchMachine.create<
        { txResponse: TransactionResponse },
        TransactionResult<any>
      >({
        showError: true,
        async fetch({ input }) {
          if (!input?.txResponse) {
            throw new Error('Invalid tx response');
          }
          const txResult = await input?.txResponse?.waitForResult();

          return txResult;
        },
      }),
    },
  }
);

export type TransactionMachine = typeof transactionMachine;
export type TransactionMachineService = InterpreterFrom<
  typeof transactionMachine
>;
export type TransactionMachineState = StateFrom<typeof transactionMachine>;