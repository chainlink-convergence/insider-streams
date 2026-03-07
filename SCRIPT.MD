
Insider Streams is a product that allows users with insider information to privately sell their information to hedge funds

Features:
- Sellers are able to privately sell their insider data without revealing their wallet activity on chain, with full confidentiality optional
- Buyers are able to privately place bids and aquire insider data confidentially with no on chain visibility
- Sellers can call out specific outcomes for an event in which their insider data predicts, and build up a reputation score to establish credibility

It's an elaborate pipeline of web2 and web3 interactions that is all coordinated by the Chainlink Runtime Environment

This is how it works:


To implement this, we're using the Chainlink Runtime Environment extensively to:
1. Maintain upkeep operations on auctions
2. Privately manage user balances as they privately transfer tokens in and out of our vault to place bids, allowing buyers to bid for secrets without ever exposing their identities on chain
3. And to update secret sellers credibility scores based on if the market in which they're providing secrets for resolved as they said it would
Secret information is being stored in a web2 database, protected by signature auth, just as the Chainlink Private Transactions REST API does. It's effectively emulating what a real TEE setup might look like, we'll cut over to Confidential Compute when that's made available.

And then we're using the private token tranfers feature of Chainlink's confidential compute to allow buyers to transfer into our private ledger to place bids and to allow sellers to transfer out of our private ledger when their auctions get bids.

