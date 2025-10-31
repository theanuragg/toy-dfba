import { SolanaService } from "./solana.service";
import { OrderType, Side, OrderParams } from "../types";
import { BN } from "@coral-xyz/anchor";
import { config } from '../config';

export class MakerService {
    private intervalId: NodeJS.Timeout | null = null;
    private statsIntervalId: NodeJS.Timeout | null = null;
    private basePrice = 100;
    private spread = 0.00005;
    private txCount = 0;
    private startTime = Date.now();

    constructor(private solanaService: SolanaService) {}

    async start() {
        console.log('Starting maker service...');

        this.intervalId = setInterval(async () => {
            try {
                await this.cancelAllAndPostNewOrders();
            }
            catch(err) {
                console.error('Maker service error: ', err);
            }
        }, config.batchInterval);
        this.statsIntervalId = setInterval(() => {
            const elapsed = (Date.now() - this.startTime) / 1000;
            const avgTxPerSecond = (this.txCount / elapsed).toFixed(2);
            console.log(`[STATS] Cancel & Post TXs: ${this.txCount} total | ${avgTxPerSecond} tx/s average`);
        }, 1000);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.statsIntervalId) {
            clearInterval(this.statsIntervalId);
            this.statsIntervalId = null;
        }
    }

    private async cancelAllOrders() {
        try {
            const tx = await this.solanaService.program.methods
                .cancelAllOrders()
                .accounts({
                    owner: config.makerKeypair.publicKey,
                    bidQueue: this.solanaService.bidQueuePDA,
                    askQueue: this.solanaService.askQueuePDA
                })
                .signers([config.makerKeypair])
                .rpc();
            
            console.log('Cancelled all maker orders: ', tx);
        }
        catch(err) {
            console.error('Failed to cancel orders: ', err);
        }
    }

    private async cancelAllAndPostNewOrders() {
        const priceVariation = (Math.random() - 0.5) * 0.02;
        const currentMid = this.basePrice * (1 + priceVariation);

        const orders = [];

        for (let i = 0; i < 5; i++) {
            const buyPrice = currentMid * (1 - this.spread * (1 + i * 0.15));
            const buyQuantity = 1000 + Math.floor(Math.random() * 2000);
            orders.push({
                orderType: { maker: {} },
                side: { buy: {} },
                price: new BN(Math.floor(buyPrice * 1e6)),
                quantity: new BN(buyQuantity),
            });
        }

        for (let i = 0; i < 5; i++) {
            const sellPrice = currentMid * (1 + this.spread * (1 + i * 0.15));
            const sellQuantity = 1000 + Math.floor(Math.random() * 2000);
            orders.push({
                orderType: { maker: {} },
                side: { sell: {} },
                price: new BN(Math.floor(sellPrice * 1e6)),
                quantity: new BN(sellQuantity),
            });
        }

        try {
            const tx = await this.solanaService.program.methods
                .cancelAllAndPostNewOrders(orders)
                .accounts({
                    orderPlacer: config.makerKeypair.publicKey,
                    auctionState: this.solanaService.auctionStatePDA,
                    bidQueue: this.solanaService.bidQueuePDA,
                    askQueue: this.solanaService.askQueuePDA,
                })
                .signers([config.makerKeypair])
                .rpc();

            this.txCount++;
            console.log(`Cancelled all orders and posted ${orders.length} new maker orders: ${tx}`);
            return tx;
        } catch (error) {
            console.error('Failed to cancel and post orders:', error);
            throw error;
        }
    }

    private async postNewOrders() {
        const priceVariation = (Math.random() - 0.5) * 0.02;
        const currentMid = this.basePrice * (1 + priceVariation);

        const orders = [];

        // Place 15 buy maker orders at progressively lower prices
        for (let i = 0; i < 15; i++) {
            const buyPrice = currentMid * (1 - this.spread * (1 + i * 0.15));
            const buyQuantity = 1000 + Math.floor(Math.random() * 2000);
            orders.push({
                orderType: { maker: {} },
                side: { buy: {} },
                price: new BN(Math.floor(buyPrice * 1e6)),
                quantity: new BN(buyQuantity),
            });
        }

        // Place 15 sell maker orders at progressively higher prices
        for (let i = 0; i < 15; i++) {
            const sellPrice = currentMid * (1 + this.spread * (1 + i * 0.15));
            const sellQuantity = 1000 + Math.floor(Math.random() * 2000);
            orders.push({
                orderType: { maker: {} },
                side: { sell: {} },
                price: new BN(Math.floor(sellPrice * 1e6)),
                quantity: new BN(sellQuantity),
            });
        }

        try {
            const tx = await this.solanaService.program.methods
                .placeMultipleOrders(orders)
                .accounts({
                    orderPlacer: config.makerKeypair.publicKey,
                    auctionState: this.solanaService.auctionStatePDA,
                    bidQueue: this.solanaService.bidQueuePDA,
                    askQueue: this.solanaService.askQueuePDA,
                })
                .signers([config.makerKeypair])
                .rpc();

            console.log(`Posted ${orders.length} maker orders: ${tx}`);
            return tx;
        } catch (error) {
            console.error('Failed to post orders:', error);
            throw error;
        }
    }
}