import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { config } from './config';
import { SolanaService } from './services/solana.service';
import { MakerService } from './services/maker.service';
import { TakerService } from './services/taker.service';
import { CrankService } from './services/crank.service';
import { ApiService } from './services/api.service';

async function main() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    const solanaService = new SolanaService();
    await solanaService.initialize();

    const makerService = new MakerService(solanaService);
    const takerService = new TakerService(solanaService);
    const crankService = new CrankService(solanaService);
    const apiService = new ApiService(solanaService);

    apiService.setupRoutes(app);

    const server = app.listen(config.port, () => {
        console.log(`Backend server running on port ${config.port}`);
    });

    const wss = new WebSocketServer({ server });
    apiService.setupWebSocket(wss);

    await makerService.start();
    await takerService.start();
    await crankService.start();

    console.log('All services started successfully');
}

main().catch(console.error);