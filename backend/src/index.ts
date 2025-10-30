import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { config } from './config';

async function main() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    const server = app.listen(config.port, () => {
        console.log(`Backend server running on port ${config.port}`);
    });

    const wss = new WebSocketServer({ server });
    
    console.log('All services started successfully');
}

main().catch(console.error);