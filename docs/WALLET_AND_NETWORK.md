# Wallet and network

TruthMarket dispatches `eip6963:requestProvider`, listens for announcements, and completes a finite discovery window before enabling Connect. If one EIP-6963 wallet was announced it is used; multiple wallets require the accessible chooser. Only when discovery completes with zero announcements is the standard `window.ethereum` fallback considered. Late announcements update choices for future sessions and never replace an active provider.

The app retains the chosen UUID and provider object only after network switching and `eth_requestAccounts` both succeed. While a selection is pending, choices remain disabled, focus stays inside the dialog, and the dialog exposes progress and normalized errors.

Session disconnect invalidates in-flight connection attempts, clears the selected provider and account, and removes account, chain, and disconnect listeners. It does not revoke extension permissions or delete Activity. Provider disappearance and rejected requests produce safe reconnect guidance. Account changes isolate the dashboard to the new wallet namespace; older wallet Activity may continue browser-local read-only polling but is not shown for the new account.

Before writes the selected provider receives `wallet_switchEthereumChain` for `0x107d`. Only error code `4902` triggers `wallet_addEthereumChain` with GenLayer Bradbury, GEN/18, the official RPC and explorer, followed by another switch. `eth_chainId` is verified. Immediately before SDK submission, TruthMarket requests `eth_chainId` and `eth_accounts` again and requires chain 4221 and the connected account. Only the standard injected EIP-1193 path is used.
