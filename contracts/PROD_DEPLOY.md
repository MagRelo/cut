(base) mattlovan@Matts-MacBook-Pro contracts % forge script script/DeployProd.s.sol:DeployProdScript --rpc-url https://mainnet.base.org --broadcast --verify
[⠊] Compiling...
No files changed, compilation skipped
Script ran successfully.

== Logs ==
=== Deploying to Base Mainnet ===
USDC Address: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
cUSDC Address: 0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf
PlatformToken deployed to: 0x1699Eb97Dcf31B0ad2A964028e00C7CEB92B453B
Treasury deployed to: 0x11fBa894D99e87cBFe7d5d710C1217eAc5f8472A
Treasury set in PlatformToken
EscrowFactory deployed to: 0xD69190dCAFc5168859738d11244e8CbF4c584240
Oracle Added: 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38

=== Deployment Summary ===
PlatformToken: 0x1699Eb97Dcf31B0ad2A964028e00C7CEB92B453B
Treasury: 0x11fBa894D99e87cBFe7d5d710C1217eAc5f8472A
EscrowFactory: 0xD69190dCAFc5168859738d11244e8CbF4c584240
USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
cUSDC: 0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf
Initial Oracle: 0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38

## Setting up 1 EVM.

==========================

Chain 8453

Estimated gas price: 0.01008626 gwei

Estimated total gas used for script: 5341088

Estimated amount required: 0.00005387160225088 ETH

==========================

##### base

✅ [Success]Hash: 0xd3739164a000b2325a15355c04babc1778a32fb77b30f1c5d920c19ca97fc8af
Block: 33765184
Paid: 0.000000244789645737 ETH (47307 gas \* 0.005174491 gwei)

##### base

✅ [Success]Hash: 0x6381774ed4b418eb55300254c0d8b93163e544bba8937ab669b876dbd86eb4e9
Contract Address: 0x11fBa894D99e87cBFe7d5d710C1217eAc5f8472A
Block: 33765184
Paid: 0.000006036074798446 ETH (1166506 gas \* 0.005174491 gwei)

##### base

✅ [Success]Hash: 0xe23f631ae74258a1aaa908138a40a3a0ef1f6e9eb90de5b22aefe49c30bfd4a1
Contract Address: 0xD69190dCAFc5168859738d11244e8CbF4c584240
Block: 33765184
Paid: 0.000010942589258538 ETH (2114718 gas \* 0.005174491 gwei)

##### base

✅ [Success]Hash: 0x0728a81cbdc417439013253e5a2486acb77fca24d3f67638ba4f3b027028f9c2
Block: 33765184
Paid: 0.000000246005651122 ETH (47542 gas \* 0.005174491 gwei)

##### base

✅ [Success]Hash: 0x1c21dff01fd81759882af0c768013374e62c6bc50e73eaa54ae8494107ff6d99
Contract Address: 0x1699Eb97Dcf31B0ad2A964028e00C7CEB92B453B
Block: 33765184
Paid: 0.00000375021235225 ETH (724750 gas \* 0.005174491 gwei)

✅ Sequence #1 on base | Total Paid: 0.000021219671706093 ETH (4100823 gas \* avg 0.005174491 gwei)

==========================

ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.

##

Start verification for (3) contracts
Start verifying contract `0x1699Eb97Dcf31B0ad2A964028e00C7CEB92B453B` deployed on base

Submitting verification for [src/PlatformToken.sol:PlatformToken] 0x1699Eb97Dcf31B0ad2A964028e00C7CEB92B453B.
Encountered an error verifying this contract:
Response: `NOTOK`
Details: `Invalid API Key (#err2)|BASE1-NEW`
