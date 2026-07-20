import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  phantomWallet,
  rainbowWallet,
  coinbaseWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

const alchemyKey = import.meta.env.VITE_ALCHEMY_KEY;
const sepoliaRpcUrl = alchemyKey && alchemyKey !== 'your_alchemy_key_here'
  ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
  : 'https://rpc.ankr.com/eth_sepolia';

export const wagmiConfig = getDefaultConfig({
  appName: 'TrustChain',
  projectId: '3a8170812b534d0ff9d794f19a901d64',
  chains: [sepolia],
  wallets: [
    {
      groupName: 'Popular Wallets',
      wallets: [metaMaskWallet, phantomWallet, rainbowWallet, coinbaseWallet, walletConnectWallet],
    },
  ],
  transports: {
    [sepolia.id]: http(sepoliaRpcUrl),
  },
  ssr: false,
});

export { sepolia };
