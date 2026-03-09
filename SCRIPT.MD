
The basic workflow:
Someone with privleged information about an event on a prediction market can privately create an Auction to sell their secrets.
Bidders can bid on the privileged information.
How will bidders know if a seller is qualified?
Because we track the outcome of the event that the secret data was for after the auction concludes, and we increment or decrement the seller's reputation score depending on if they got it right or not.
The great part about this system is that an auction doesn't need to get bids for us to rate the seller based on the outcome of the external event, so a seller can build up their reputation score until they've proven themself well enough to get customers.
After a buyer wins an auction, we internally transfer the amount of the bid to the seller, and the seller can privately withdraw at their will



This sounds pretty basic right? Well, it's not. The only reason we were able to simplify the UX to this level is because the chainlink CRE is doing heavy automation on the backend to ensure all of these systems are in sync and that all information and tokens exchanged are private.

Let's walk through the full flow on the frontend:

When you create an auction, you fill out a form supplying text based information, and the event, market, and outcome that your secret information supports.

We've set up a demo prediction market that we'll cover later, but one important detail is that all events on our demo prediction market are for past events where the outcome is known for demo purposes.

Let's switch to a different account to bid


To demo the app, our event generator on our example prediction market is only generating events for past happenings where the outcome is known.

Let's talk about the privacy backend first:
- When we say "deposit" and "withdraw", we are referring using the Chainlink Private Transactions API  to "transferring in" and "transferring out" of our private backend

Once you transfer in your funds, we use our REST API to update an internal ledger of balances to note that what portion of the funds we hold belong to which user.


B
Just in case a transfer was done privately outside of our REST API, we have a CRE workflow (user-balance-recording-fallback) that periodically checks our accounts private transfers, and then updates the balances accordingly to make sure our internal balances are always in sync with a cron trigger.


Once your funds are in, you can place a bid on an Insider Stream Auction. This can only be done through our REST API. and when you do it, it locks a portion of your balance and then publishes the current AMOUNT of the bid, but not the identity of the bidder, on chain. 

We went with a standard, ebay style auction system vs commit and reveal purely to create interim activity on chain so you can see our backend private keeping in sync with our contract in real time.

When an auction

Now, this seems like this gives us a lot of control, and it does in practical terms, but our backend is emulating what a TEE setup would look like since we don't have confidential compute available yet. Once Chainlink's TEE solution is available, we'll cut over to that.



In this system, we have a trustful backend, kind of, but we've designed it in a way that it would mock an actual TEE. when Chainlink's custom compute is available, we'll probably cross over, we'd be able to cut this application over into it because
 We can't publish this information on chain because that would reveal users' identities.
