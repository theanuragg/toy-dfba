import { BN } from '@coral-xyz/anchor';

export enum OrderType {
    Maker = 'maker',
    Taker = 'taker'
}

export enum Side {
    Buy = 'buy',
    Sell = 'sell'
}

export interface Order {
    id: string;
    owner: string;
    orderType: OrderType;
    side: Side;
    price: number;
    quantity: number;
    timestamp: number;
    isActive: boolean;
    filledQuantity: number;
}

export interface AuctionResult {
    batchId: string;
    bidClearingPrice: number;
    bidVolume: number;
    askClearingPrice: number;
    askVolume: number;
    timestamp: number;
}

export interface OrderParams {
    orderType: OrderType;
    side: Side;
    price: BN;
    quantity: BN;
}