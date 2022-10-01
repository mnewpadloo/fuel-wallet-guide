import { useEffect } from 'react';

import { welcomeLink } from '../../config';
import { openTab } from '../../utils';

import { routes } from './routes';

import { Providers, useIsLogged } from '~/systems/Core';

export function WalletPage() {
  const isLoggedIn = useIsLogged();

  useEffect(() => {
    if (!isLoggedIn) {
      openTab(welcomeLink);
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return null;
  }

  return <Providers>{routes}</Providers>;
}