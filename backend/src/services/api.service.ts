import { Express } from 'express';
import { WebSocketServer } from 'ws';
import { SolanaService } from './solana.service';
import { Order, AuctionResult, OrderType, Side } from '../types';
import { BN } from '@coral-xyz/anchor';

export class ApiService {
    private wss: WebSocketServer | null = null;

    constructor(private solanaService: SolanaService) {}

    setupRoutes(app: Express) {
        app.get('/api/auction-state', async(req, res) => {
            try {
                const state = await this.solanaService.program.account.auctionState.fetch(
                    this.solanaService.auctionStatePDA
                );
                res.json({
                    authority: state.authority.toString(),
                    batchInterval: state.batchInterval.toNumber(),
                    lastBatchSlot: state.lastBatchSlot.toNumber(),
                    batchCounter: state.batchCounter.toNumber(),
                    isPaused: state.isPaused
                });
            }
            catch(err) {
                res.status(500).json({ error: err.message });
            }
        });

        app.get('/api/orders', async(req, res) => {
            try {
                const bidQueue = await this.solanaService.program.account.orderQueue.fetch(
                    this.solanaService.bidQueuePDA
                );

                const askQueue = await this.solanaService.program.account.orderQueue.fetch(
                    this.solanaService.askQueuePDA
                );

                const formatOrder = (order: any): Order => (
                    {
                        id: order.id.toString(),
                        owner: order.owner.toString(),
                        orderType: order.orderType.maker ? OrderType.Maker : OrderType.Taker,
                        side: order.side.buy ? Side.Buy : Side.Sell,
                        price: order.price.toNumber() / 1e6,
                        quantity: order.quantity.toNumber(),
                        timestamp: order.timestamp.toNumber(),
                        isActive: order.isActive,
                        filledQuantity: order.filledQuantity.toNumber(),
                    }
                );

                res.json({
                    bidOrders: bidQueue.orders.filter(o => o.isActive).map(formatOrder),
                    askOrders: askQueue.orders.filter(o => o.isActive).map(formatOrder),
                });
            }
            catch(err) {
                res.status(500).json({ error: err.message });
            }
        });

        app.get('/api/results/:count', async (req, res) => {
            try {
                const count = parseInt(req.params.count) || 10;
                const auctionState = await this.solanaService.program.account.auctionState.fetch(
                    this.solanaService.auctionStatePDA
                );
                
                const results: AuctionResult[] = [];
                const currentBatch = auctionState.batchCounter.toNumber();
                
                for (let i = Math.max(1, currentBatch - count + 1); i <= currentBatch; i++) {
                    try {
                        const result = await this.solanaService.program.account.auctionResult.fetch(
                            this.solanaService.getResultPDA(i)
                        );
                        results.push({
                            batchId: result.batchId.toString(),
                            bidClearingPrice: result.bidClearingPrice.toNumber() / 1e6,
                            bidVolume: result.bidVolume.toNumber(),
                            askClearingPrice: result.askClearingPrice.toNumber() / 1e6,
                            askVolume: result.askVolume.toNumber(),
                            timestamp: result.timestamp.toNumber(),
                        });
                    } catch (error) {
                    }
                }
                
                res.json(results);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        app.post('/api/place-order', async (req, res) => {
            try {
                const { orderType, side, price, quantity, walletPubkey } = req.body;
                
                res.json({
                    success: true,
                    message: 'Order placement requires wallet connection in frontend',
                    orderData: { orderType, side, price, quantity, walletPubkey }
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

        setupWebSocket(wss: WebSocketServer) {
        this.wss = wss;

        wss.on('connection', (ws) => {
            console.log('New WebSocket connection');

            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    
                    if (data.type === 'subscribe') {
                        const interval = setInterval(async () => {
                            try {
                                const bidQueue = await this.solanaService.program.account.orderQueue.fetch(
                                    this.solanaService.bidQueuePDA
                                );
                                const askQueue = await this.solanaService.program.account.orderQueue.fetch(
                                    this.solanaService.askQueuePDA
                                );

                                ws.send(JSON.stringify({
                                    type: 'orderbook',
                                    data: {
                                        bids: bidQueue.orders.filter(o => o.isActive),
                                        asks: askQueue.orders.filter(o => o.isActive),
                                    }
                                }));
                            } catch (error) {
                                console.error('WebSocket update error:', error);
                            }
                        }, 1000);

                        ws.on('close', () => {
                            clearInterval(interval);
                        });
                    }
                } catch (error) {
                    console.error('WebSocket message error:', error);
                }
            });

            ws.send(JSON.stringify({ type: 'connected' }));
        });
    }

    broadcastUpdate(type: string, data: any) {
        if (this.wss) {
            this.wss.clients.forEach((client) => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({ type, data }));
                }
            });
        }
    }
}