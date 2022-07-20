import * as React from 'react';
import ReactDOM from 'react-dom'
import App from './App';
import './index.css';
import { createTheme, NextUIProvider } from '@nextui-org/react';
import {
  getDefaultWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import {
  chain,
  configureChains,
  createClient,
  WagmiConfig,
} from 'wagmi';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';

const { chains, provider } = configureChains(
  [chain.mainnet, chain.polygon, chain.optimism, chain.arbitrum],
  [
    alchemyProvider({ alchemyId: process.env.ALCHEMY_ID }),
    publicProvider()
  ]
);

const { connectors } = getDefaultWallets({
  appName: 'My RainbowKit App',
  chains
});

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider
})

const darkTheme = createTheme({
  type: 'dark',
  theme: {
    fonts: {
      sans: 'League Mono, monospace',
      mono: 'League Mono, monospace',
    },
    colors: {
      primary: '$cyan100',
      secondary: '$gray900',
      inputPlaceholderColor: '$cyan100',
    },
  },
});

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)