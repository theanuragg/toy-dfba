// frontend/src/components/OrderBook.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OrderBook.css';

interface Order {
    id: string;
    orderType: string;
    side: string;
    price: number;
    quantity: number;
    filledQuantity: number;
}

export const OrderBook: React.FC = () => {
    const [bidOrders, setBidOrders] = useState<Order[]>([]);
    const [askOrders, setAskOrders] = useState<Order[]>([]);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await axios.get('http://localhost:3001/api/orders');
                setBidOrders(response.data.bidOrders);
                setAskOrders(response.data.askOrders);
            } catch (error) {
                console.error('Failed to fetch orders:', error);
            }
        };

        fetchOrders();
        const interval = setInterval(fetchOrders, 1000);

        return () => clearInterval(interval);
    }, []);

    const renderOrders = (orders: Order[], side: string) => {
        const sorted = [...orders].sort((a, b) => 
            side === 'bid' ? b.price - a.price : a.price - b.price
        );

        return sorted.slice(0, 10).map((order, index) => (
            <div key={order.id} className={`order-row ${side}`}>
                <span className="price">{order.price.toFixed(2)}</span>
                <span className="quantity">{order.quantity}</span>
                <span className="type">{order.orderType}</span>
            </div>
        ));
    };

    return (
        <div className="order-book">
            <h2>Order Book</h2>
            <div className="order-book-header">
                <span>Price</span>
                <span>Quantity</span>
                <span>Type</span>
            </div>
            <div className="asks">
                <h3>Asks (Maker Sells + Taker Buys)</h3>
                {renderOrders(askOrders, 'ask')}
            </div>
            <div className="spread-divider"></div>
            <div className="bids">
                <h3>Bids (Maker Buys + Taker Sells)</h3>
                {renderOrders(bidOrders, 'bid')}
            </div>
        </div>
    );
};