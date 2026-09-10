# BTCNVDA / NVDA：资产身份与固定区块取证

采集日期：2026-09-10；用途：理解项目，不是开发工具、推荐交易或安全审计。
本文件是 PM 将实际公开 HTTP 和 JSON-RPC 返回值整理的取证记录；不是项目方出具的审计报告。
原始输出保存在隔离研究工作流的日志中，未修改 main 或 R1 应用代码，未连接钱包或广播交易。

## 原始采集运行
- 官网/发行人/浏览器：https://github.com/RoeKai/Hook-HBTC-Minner/actions/runs/34469839325 ，job 102846912075。
- 共享配置/前端/合约元数据：https://github.com/RoeKai/Hook-HBTC-Minner/actions/runs/34470203161 ，job 102848072494。
- 白皮书/独立 RPC：https://github.com/RoeKai/Hook-HBTC-Minner/actions/runs/34470416805 ，job 102848755779。
- Sourcify 查询：https://github.com/RoeKai/Hook-HBTC-Minner/actions/runs/34470669903 ，job 102849571481。
日志中的 EVIDENCE_JSON 行包含来源、时间、原始结果、内容长度和文件 SHA-256。工作流成功只代表采集脚本结束，不代表项目通过安全验收。

## 第一层：项目公布的身份
2026-09-10T11:14:02Z 读取 https://btcnvda.com/assets/protocol.json ，HTTP 200，1890 bytes，SHA-256 ceaa75f324efc47d24ce9a75ce54055afe3733d05fa2b9795a85167e698c7f10。
配置 name=BTC Stock Protocol；平台网页称 BSP Treasury；BTCNVDA 是其第一独立实例，不是通用平台代币。
chain.name=Robinhood Chain；chain.id=4663；chain.gas=ETH。
reserve.symbol=NVDA；reserve.name=NVIDIA • Robinhood Token；reserve.decimals=18。
reserve.address=0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC。
deployment.token=0xdd83f3bb1539f52778314b018c401c0efe3e617f。
deployment.hook=0x541c980ed3e0b5ced0bde5352c32bdab9d26a0cc。
deployment.factory=0x3f6f537a565581b21d44ae928db438d7220e886e。
deployment.poolId=0x4cc2e5d23e1c94645466ba014ea2b0c1834d8c6f0527d0a67b3878738ac08c6d。
genesisTimestamp=1788715006。Pool ID 是32字节池标识，不是代币合约地址。

## 第二层：发行人官方资产接口
2026-09-10T11:09:56Z 附近读取 https://api.robinhood.com/rhj/assets ，HTTP 200。
返回 NVDA 条目：tokenName=NVIDIA • Robinhood Token；tokenSymbol=NVDA；tokenDecimals=18；status=ASSET_STATUS_ACTIVE；isin=US67066G1040。
deployments[0].contractAddress=0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC，chainId=4663，networkName=Robinhood Chain，与 BTCNVDA 官网 reserve 地址一致。
当次 currentMultiplier=1.000775159164630595；这是时点值，不能永久写成1:1。
发行人技术文件 https://docs.robinhood.com/chain/stock-tokens/ 说明 Stock Tokens 是 Robinhood Assets (Jersey) Limited 发行的代币化债务证券，提供底层股票/ETF的经济敞口，不赋予底层证券或其发行人的法律/受益权利；ERC20，18 decimals；公司行动通过 multiplier 调整。
因此，此处 NVDA 是现有英伟达股票敞口代币，不是 BTCNVDA 项目自己发行的币，不是稳定币，也不等于直接持有英伟达股票。
BSP 主页明确声明独立开发，不宣称与 NVIDIA 或 Robinhood 有官方合作或背书。

## 第三层：独立公共 RPC 的固定区块读取
端点：https://rpc.mainnet.chain.robinhood.com 。调用仅使用 eth_chainId、eth_getBlockByNumber、eth_getCode、eth_call 和历史 receipt 查询。
eth_chainId 返回 0x1237，即4663。
固定高度59358960（0x389bef0）。
区块哈希0x2d1ab16464317831cfb5795603e684442ae15d7f3e7ea8b611092df08d76bcd8。
区块 timestamp=1789038842，即2026-09-10 11:14:02 UTC / 19:14:02 UTC+8。
独立 RPC 返回区块哈希与官网 /api/instance 在相同高度报告的哈希一致。

BTCNVDA 合约 name()=BTCNVDA；symbol()=BTCNVDA；decimals()=18；totalSupply()=349999999999999999999920。
NVDA 合约 name()=NVIDIA • Robinhood Token；symbol()=NVDA；decimals()=18；totalSupply()=84913704823500000000000。
下列代码长度和 SHA-256 是部署字节码的只读指纹，不是编译源码匹配证明，也不是 Ethereum keccak code hash：
- Hook：28264 bytes；5851bbeb2bd38695fc36543a1e1cc6399e1a10a00c309117e68f4066e10c7e6d。
- BTCNVDA：2009 bytes；8e9294070d327445461d6b658314540f392b392700723217c2d6c11d3fc77212。
- NVDA：283 bytes；399ec4bc5b43db03486ceae11f9a6fc5c126427f8f8e10c90fed0c773f4325c6。
- Factory：5324 bytes；ac8da4257fa04c59256bb08aa9a20cad242df1d7d6dda5766097e1f4408482ec。

Hook 只读结果（金额均为18位最小单位）：
| Getter | 返回值 |
|---|---|
| genesisTimestamp | 1788715006 |
| currentBlockIndex | 539 |
| BLOCK_DURATION | 600 |
| GENESIS_BLOCKS | 144 |
| genesisSettledCount | 144 |
| polReserve | 349999999999999999999920 |
| totalMinted | 349999999999999999999920 |
| polPendingDeposit | 24 |
| polDeposited | 349999999999999999999896 |
| totalTollCollected | 3604217176018933426 |
| platformAccrued | 1081265152805679461 |
| platformPaidOut | 0 |
| totalHbtcBurned | 0 |
| tollRateBps | 270 |
| targetWorkGenesis | 10777023386140748 |
| pendingToNet | 89122789752000036 |
| poolId | 0x4cc2e5d23e1c94645466ba014ea2b0c1834d8c6f0527d0a67b3878738ac08c6d |
| poolManager | 0x8366a39cc670b4001a1121b8f6a443a643e40951 |
这些结果与同高度官网快照的对应字段一致。token() 探测回滚，不能猜它是有效 ABI；通过部署日志和 ERC20 查询核对 Token 身份。
270 bps=2.7%，不是初始化值3%。这只是该区块的储存费率，不保证下一次交易实际执行费率。
实际供应约350000 BTCNVDA，不是已经发行2100万；尚未领取的矿奖励不必已计入 totalSupply。
创世起点换算为2026-09-06 17:16:46 UTC，144轮届满为2026-09-07 17:16:46 UTC；UTC+8分别为9月7日01:16:46和9月8日01:16:46。

## 第四层：历史部署回执与池身份
0x99fe7fa1c3d7c682a9e939578a9fda767deb356114f4ced0d79dc2e81e1144ab：status=1；block56147902；contractAddress=Factory上述地址。
0x558212306f7bbb73d2c2d5843eb274288e1fdc79a7a3e005b76c2ad3c5f6fe6d：status=1；block56149250；to=上述Factory。
第二笔回执的 PoolManager 日志中，topics明确同时包含上述poolId、NVDA、BTCNVDA，data包含fee=0、tickSpacing=60、上述Hook以及初始tick=123300。
工厂创建事件data同时包含上述BTCNVDA地址、poolId和genesisTimestamp。浏览器也记录Hook的creator为上述Factory，BTCNVDA的creator为上述Hook。
这是地址归属的交叉证据，不是只按同名搜索猜地址。

## 源码与安全证据边界
Blockscout /api/v2/addresses/ 两个地址均返回 is_contract=true、is_verified=false；/api/v2/smart-contracts/ 返回部署字节码，但 abi=null，未提供source_code。
2026-09-10T11:19:23Z，Sourcify v2 /contract/4663/<Hook或BTCNVDA>?fields=all 都返回404、match=null。
项目白皮书声明固定版本与运行码已由项目方核验，但公开站点不附合约/辅助矿工源码。不能把项目方自述或本次getter读取升级为独立源码审计。
浏览器同符号搜索还出现另一个不同地址的BTCNVDA；同名不证明同项目。本文件确认的代币仅是官网、官方储备接口、部署事件和独立RPC一致指向的地址。
