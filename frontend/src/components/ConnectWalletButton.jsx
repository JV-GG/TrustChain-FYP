import React from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';

/** Opens RainbowKit's connect modal from a button styled like the rest of the app. */
export default function ConnectWalletButton({ className = 'btn btn-primary', children = 'Connect wallet' }) {
  const { openConnectModal } = useConnectModal();
  return (
    <button type="button" onClick={() => openConnectModal?.()} className={className}>
      {children}
    </button>
  );
}
