use anchor_lang::prelude::*;

declare_id!("HjNP38ofCxokbhd1bEJcXtB2Z7397B5JDLNWB9UESRvz");

#[program]
pub mod toy_dfba {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
