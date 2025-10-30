// frontend/src/components/AuctionResults.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AuctionResults.css';

interface AuctionResult {
    batchId: string;
    bidClearingPrice: number;
    bidVolume: number;
    askClearingPrice: number;
    askVolume: number;
    timestamp: number;
}

export const AuctionResults: React.FC = () => {
    const [results, setResults] = useState<AuctionResult[]>([]);
    const [auctionState, setAuctionState] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resultsRes, stateRes] = await Promise.all([
                    axios.get('http://localhost:3001/api/results/10'),
                    axios.get('http://localhost:3001/api/auction-state')
                ]);
                
                setResults(resultsRes.data);
                setAuctionState(stateRes.data);
            } catch (error) {
                console.error('Failed to fetch auction data:', error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 1000);

        return () => clearInterval(interval);
    }, []);

    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString();
    };

    return (
        <div className="auction-results">
            <h2>Auction Results</h2>
            {auctionState && (
                <div className="auction-info">
                    <p>Total Batches: {auctionState.batchCounter}</p>
                    <p>Batch Interval: {auctionState.batchInterval} slots (~400ms)</p>
                </div>
            )}
            <div className="results-header">
                <span>Batch</span>
                <span>Bid Price</span>
                <span>Bid Vol</span>
                <span>Ask Price</span>
                <span>Ask Vol</span>
                <span>Time</span>
            </div>
            <div className="results-list">
                {results.map((result) => (
                    <div key={result.batchId} className="result-row">
                        <span>{result.batchId}</span>
                        <span>{result.bidClearingPrice.toFixed(2)}</span>
                        <span>{result.bidVolume}</span>
                        <span>{result.askClearingPrice.toFixed(2)}</span>
                        <span>{result.askVolume}</span>
                        <span>{formatTime(result.timestamp)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};