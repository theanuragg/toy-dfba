use crate::state::*;
use anchor_lang::prelude::*;

pub fn execute_auction(orders: &mut Vec<Order>, auction_type: AuctionType) -> Result<(u64, u64)> {
    let mut maker_orders: Vec<&mut Order> = Vec::new();
    let mut taker_orders: Vec<&mut Order> = Vec::new();

    for order in orders.iter_mut() {
        if !order.is_active || order.filled_quantity >= order.quantity {
            continue;
        }

        match (&order.order_type, &auction_type) {
            (OrderType::Maker, _) => maker_orders.push(order),
            (OrderType::Taker, _) => taker_orders.push(order),
        };
    }

    if maker_orders.is_empty() || taker_orders.is_empty() {
        return Ok((0, 0));
    }

    match auction_type {
        AuctionType::Bid => {
            maker_orders.sort_by(|a, b| b.price.cmp(&a.price));
            taker_orders.sort_by(|a, b| a.price.cmp(&b.price))
        }
        AuctionType::Ask => {
            maker_orders.sort_by(|a, b| a.price.cmp(&b.price));
            taker_orders.sort_by(|a, b| b.price.cmp(&a.price));
        }
    }

    let mut best_price = 0;
    let mut best_volume = 0;

    let mut all_prices: Vec<u64> = maker_orders.iter().map(|o| o.price).collect();
    all_prices.extend(taker_orders.iter().map(|o| o.price));
    all_prices.sort();
    all_prices.dedup();

    for &price in all_prices.iter() {
        let volume = calculate_volume_at_price(&maker_orders, &taker_orders, price, &auction_type);
        if volume > best_volume {
            best_volume = volume;
            best_price = price;
        }
    }

    if best_volume > 0 {
        execute_trades_at_price(
            &mut maker_orders,
            &mut taker_orders,
            best_price,
            &auction_type,
        );
    }

    Ok((best_price, best_volume))
}

fn calculate_volume_at_price(
    maker_orders: &[&mut Order],
    taker_orders: &[&mut Order],
    price: u64,
    auction_type: &AuctionType,
) -> u64 {
    let mut maker_volume = 0;
    let mut taker_volume = 0;

    match auction_type {
        AuctionType::Bid => {
            for order in maker_orders {
                if order.price >= price {
                    maker_volume += order.quantity - order.filled_quantity;
                }
            }

            for order in taker_orders {
                if order.price <= price {
                    taker_volume += order.quantity - order.filled_quantity;
                }
            }
        }
        AuctionType::Ask => {
            // Ask auction: maker sells vs taker buys
            for order in maker_orders {
                if order.price <= price {
                    maker_volume += order.quantity - order.filled_quantity;
                }
            }
            for order in taker_orders {
                if order.price >= price {
                    taker_volume += order.quantity - order.filled_quantity;
                }
            }
        }
    }

    maker_volume.min(taker_volume)
}

fn execute_trades_at_price(
    maker_orders: &mut [&mut Order],
    taker_orders: &mut [&mut Order],
    price: u64,
    auction_type: &AuctionType,
) {
    let mut remaining_volume =
        calculate_volume_at_price(maker_orders, taker_orders, price, auction_type);

    for order in taker_orders.iter_mut() {
        if remaining_volume == 0 {
            break;
        }

        let can_fill = match auction_type {
            AuctionType::Bid => order.price <= price,
            AuctionType::Ask => order.price >= price,
        };

        if can_fill {
            let fill_amount = (order.quantity - order.filled_quantity).min(remaining_volume);
            order.filled_quantity += fill_amount;
            remaining_volume -= fill_amount;
        }
    }

    remaining_volume = calculate_volume_at_price(maker_orders, taker_orders, price, auction_type);

    let mut eligible_maker_volume = 0;
    for order in maker_orders.iter() {
        let can_fill = match auction_type {
            AuctionType::Bid => order.price >= price,
            AuctionType::Ask => order.price <= price,
        };

        if can_fill {
            eligible_maker_volume += order.quantity - order.filled_quantity;
        }
    }

    if eligible_maker_volume > 0 {
        for order in maker_orders.iter_mut() {
            let can_fill = match auction_type {
                AuctionType::Bid => order.price >= price,
                AuctionType::Ask => order.price <= price,
            };

            if can_fill {
                let available = order.quantity - order.filled_quantity;
                let fill_amount = (available * remaining_volume) / eligible_maker_volume;
                order.filled_quantity += fill_amount;
            }
        }
    }
}
