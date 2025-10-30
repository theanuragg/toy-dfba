import { SolanaService } from "./solana.service";
import { OrderType, Side, OrderParams } from "../types";
import { BN } from "@coral-xyz/anchor";
import { config } from '../config';

export class MakerService {
    private intervalId: NodeJS.Timeout | null = null;
    private basePrice = 100;
    private spread = 0.00005;

    constructor(private solanaService: SolanaService) {}

    async start() {
        console.log('Starting maker service...');

        await this.postNewOrders();

        this.intervalId = setInterval(async () => {
            try {
                await this.cancelAllOrders();
                await this.postNewOrders();
            }
            catch(err) {
                console.error('Maker service error: ', err);
            }
        }, config.batchInterval);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
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