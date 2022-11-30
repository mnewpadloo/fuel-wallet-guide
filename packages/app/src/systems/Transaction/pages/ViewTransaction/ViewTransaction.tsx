import { Stack } from '@fuel-ui/react';
import { AddressType } from '@fuel-wallet/types';
import { TransactionType } from 'fuels';
import { useNavigate, useParams } from 'react-router-dom';

import { TxDetails, TxFromTo } from '../../components';
import { TxHeader } from '../../components/TxHeader/TxHeader';
import { useTransaction } from '../../hooks';

import { AssetsAmount } from '~/systems/Asset';
import { Layout } from '~/systems/Core';

export function ViewTransaction() {
  const txIdQueryParam = useParams<{ txId: string }>().txId;
  // const networks = useNetworks({ type: NetworkScreen.list });
  // const providerUrl = networks?.selectedNetwork?.url;
  // TODO: Remove this mocked providerUrl before pushing, and use selectedNetwork instead
  const providerUrl = 'https://node-beta-2.fuel.network/graphql';
  const {
    isFetching,
    isFetchingResult,
    fee,
    coinInputs,
    outputsToSend,
    outputAmount,
    txStatus,
    txId,
  } = useTransaction({
    txId: txIdQueryParam,
    providerUrl,
    waitProviderUrl: true,
  });

  const navigate = useNavigate();

  const transactionFrom = coinInputs?.[0]?.owner.toString()
    ? {
        type: AddressType.account,
        address: coinInputs[0].owner.toString(),
      }
    : undefined;

  return (
    <Layout title="Transaction" isLoading={isFetching}>
      <Layout.TopBar onBack={() => navigate(-1)} />
      <Layout.Content>
        <Stack gap="$4">
          {isFetching ? (
            <TxHeader.Loader />
          ) : (
            <TxHeader
              transaction={{
                id: txId,
                type: TransactionType.Create,
                status: txStatus,
              }}
            />
          )}
          {isFetching ? (
            <div>XX Loader XX</div>
          ) : (
            <TxFromTo
              from={transactionFrom}
              to={{
                type: AddressType.account,
                address: outputsToSend[0]?.to.toString(),
              }}
            />
          )}
          {isFetching ? (
            <div>XX Loader XX</div>
          ) : (
            <AssetsAmount amounts={outputsToSend} title="Assets Sent" />
          )}
          {isFetching || isFetchingResult ? (
            <div>XX Loader XX</div>
          ) : (
            <TxDetails fee={fee} outputAmount={outputAmount} />
          )}
        </Stack>
      </Layout.Content>
    </Layout>
  );
}