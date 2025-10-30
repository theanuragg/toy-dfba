import { SolanaService } from "./solana.service";
import { OrderType, Side, OrderParams } from "../types";
import { BN } from "@coral-xyz/anchor";
import { config } from '../config';

export class MakerService {
    private intervalId: NodeJS.Timeout | null = null;
    private basePrice = 100;
    private spread = 0.01;

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

        const buyPrice = currentMid * (1 - this.spread * Math.random());
        const buyQuantity = 100 + Math.floor(Math.random() * 900);

        await this.postOrder({
            orderType: OrderType.Maker,
            side: Side.Buy,
            price: new BN(Math.floor(buyPrice * 1e6)),
            quantity: new BN(buyQuantity),
        });

        const sellPrice = currentMid * (1 + this.spread * Math.random());
        const sellQuantity = 100 + Math.floor(Math.random() * 900);
        
        await this.postOrder({
            orderType: OrderType.Maker,
            side: Side.Sell,
            price: new BN(Math.floor(sellPrice * 1e6)),
            quantity: new BN(sellQuantity),
        });

        console.log(`Posted maker orders - Buy: ${buyPrice.toFixed(2)} @ ${buyQuantity}, Sell: ${sellPrice.toFixed(2)} @ ${sellQuantity}`);
    }

    private async postOrder(params: OrderParams) {
        try {
            const tx = await this.solanaService.program.methods
                .placeOrder({
                    orderType: { [params.orderType]: {} },
                    side: { [params.side]: {} },
                    price: params.price,
                    quantity: params.quantity,
                })
                .accounts({
                    orderPlacer: config.makerKeypair.publicKey,
                    auctionState: this.solanaService.auctionStatePDA,
                    bidQueue: this.solanaService.bidQueuePDA,
                    askQueue: this.solanaService.askQueuePDA,
                })
                .signers([config.makerKeypair])
                .rpc();
            
            return tx;
        } catch (error) {
            console.error('Failed to post order:', error);
            throw error;
        }
    }
}