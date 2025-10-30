// frontend/src/App.tsx
import React, { useEffect, useState } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { OrderBook } from './components/OrderBook';
import { TradingPanel } from './components/TradingPanel';
import { AuctionResults } from './components/AuctionResults';
import './App.css';

require('@solana/wallet-adapter-react-ui/styles.css');

function App() {
    const endpoint = clusterApiUrl('devnet');
    const wallets = [new PhantomWalletAdapter()];

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <div className="App">
                        <header className="App-header">
                            <h1>Dual Flow Batch Auction MVP</h1>
                            <p>Demonstrating 400ms batch auctions on Solana</p>
                        </header>
                        <div className="main-content">
                            <div className="left-panel">
                                <OrderBook />
                            </div>
                            <div className="center-panel">
                                <TradingPanel />
                                <AuctionResults />
                            </div>
                        </div>
                    </div>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}

export default App;