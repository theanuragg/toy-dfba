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
    let total_volume = calculate_volume_at_price(maker_orders, taker_orders, price, auction_type);
    let mut remaining_volume = total_volume;

    let mut price_groups: Vec<Vec<usize>> = Vec::new();
    let mut current_group: Vec<usize> = Vec::new();
    let mut last_price: Option<u64> = None;

    for (idx, order) in taker_orders.iter().enumerate() {
        let can_fill = match auction_type {
            AuctionType::Bid => order.price <= price,
            AuctionType::Ask => order.price >= price,
        };

        if !can_fill {
            continue;
        }

        if let Some(last_p) = last_price {
            if order.price != last_p {
                if !current_group.is_empty() {
                    price_groups.push(current_group.clone());
                    current_group.clear();
                }
            }
        }

        current_group.push(idx);
        last_price = Some(order.price);
    }

    if !current_group.is_empty() {
        price_groups.push(current_group);
    }

    for group in price_groups {
        if remaining_volume == 0 {
            break;
        }

        let mut level_volume = 0;
        for &idx in &group {
            let order = &taker_orders[idx];
            level_volume += order.quantity - order.filled_quantity;
        }

        let volume_to_fill = level_volume.min(remaining_volume);

        for &idx in &group {
            let order = &mut taker_orders[idx];
            let available = order.quantity - order.filled_quantity;
            let fill_amount = (available * volume_to_fill) / level_volume;
            order.filled_quantity += fill_amount;
        }

        remaining_volume -= volume_to_fill;
    }

    // Calculate total maker volume eligible at clearing price
    let mut maker_volume_at_clearing = 0;
    for order in maker_orders.iter() {
        let is_eligible = match auction_type {
            AuctionType::Bid => order.price >= price,
            AuctionType::Ask => order.price <= price,
        };

        if is_eligible {
            maker_volume_at_clearing += order.quantity - order.filled_quantity;
        }
    }
    if maker_volume_at_clearing > 0 {
        let maker_fill_volume = total_volume - (total_volume - remaining_volume);

        for order in maker_orders.iter_mut() {
            let is_eligible = match auction_type {
                AuctionType::Bid => order.price >= price,
                AuctionType::Ask => order.price <= price,
            };

            if is_eligible {
                let available = order.quantity - order.filled_quantity;
                let fill_amount = (available * maker_fill_volume) / maker_volume_at_clearing;
                order.filled_quantity += fill_amount;
            }
        }
    }
}
