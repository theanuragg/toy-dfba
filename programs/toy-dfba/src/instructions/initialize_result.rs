use crate::state::*;
use anchor_lang::prelude::*;

pub fn initialize_result_handler(_ctx: Context<InitializeResult>, _batch_id: u64) -> Result<()> {
    // The account is initialized by Anchor, no additional logic needed
    Ok(())
}

#[derive(Accounts)]
#[instruction(batch_id: u64)]
pub struct InitializeResult<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 8 + 8 + 8 + 8 + 8 + 8,
        seeds = [b"result", batch_id.to_le_bytes().as_ref()],
        bump
    )]
    pub result: Account<'info, AuctionResult>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}
